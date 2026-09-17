import {
  computeQuoteTotals,
  formatAed,
  formatQuoteNumber,
  serviceWindowState,
  toMoneyString,
} from "@hco/core";
import {
  dateInTimezone,
  formatDecimal,
  planQuoteUpdate,
  statusAfterSend,
  validateLineItems,
} from "@hco/core/quotes/index";
import {
  api,
  newId,
  type ChannelConnection,
  type Contact,
  type Conversation,
  type Deal,
  type Media,
  type Message,
  type Quote,
} from "@hco/shared";
import type { LineItemInput, QuoteDetail } from "@hco/shared/api/quotes";
import { formatDate } from "@/lib/format";
import { handle, type MockContext, type MockHandler } from "../define";
import { assertVisible, findOr404, rows } from "../scope";
import { addActivity, appendMessage, notify } from "../services";
import { contactName, userName } from "../views";

/** Quotes: drafts with 5% VAT, sending the PDF on WhatsApp or by email, and the customer's decision. */

function visibleDeal(ctx: MockContext, dealId: string): Deal {
  const deal = findOr404(ctx, "deals", dealId, "deal");
  assertVisible(ctx, deal, "deal");
  return deal;
}

/** The deal's contact, even if the contact was deleted later: a quote must still render. */
function dealContact(ctx: MockContext, deal: Deal): Contact {
  const contact = ctx.db.contacts.find((c) => c.id === deal.contactId && c.workspaceId === ctx.workspace.id);
  if (!contact) throw ctx.error("NOT_FOUND", "The contact on this deal no longer exists.");
  return contact;
}

function dealCompany(ctx: MockContext, deal: Deal) {
  if (!deal.companyId) return null;
  return ctx.db.companies.find((c) => c.id === deal.companyId && c.workspaceId === ctx.workspace.id) ?? null;
}

/** The contact's WhatsApp conversation, most recently active first. */
function whatsappConversation(ctx: MockContext, contact: Contact): Conversation | null {
  return (
    rows(ctx, "conversations")
      .filter(
        (c) =>
          c.channel === "whatsapp" &&
          (c.contactId === contact.id ||
            (contact.primaryPhoneE164 !== null && c.participantPhoneE164 === contact.primaryPhoneE164)),
      )
      .sort((a, b) => (b.lastInboundAt ?? "").localeCompare(a.lastInboundAt ?? ""))[0] ?? null
  );
}

/** The signed-in user's Gmail, or else the workspace's first connected Gmail. */
function gmailConnection(ctx: MockContext): ChannelConnection | null {
  const connected = rows(ctx, "channelConnections").filter(
    (c) => c.type === "gmail" && c.status === "connected",
  );
  return connected.find((c) => c.userId === ctx.user.id) ?? connected[0] ?? null;
}

function toDetail(ctx: MockContext, quote: Quote): QuoteDetail {
  const deal = visibleDeal(ctx, quote.dealId);
  const contact = dealContact(ctx, deal);
  const conversation = whatsappConversation(ctx, contact);
  const hasEmailConnection = gmailConnection(ctx) !== null;
  return {
    quote,
    deal,
    contact,
    company: dealCompany(ctx, deal),
    workspace: ctx.workspace,
    canSendWhatsapp: conversation ? serviceWindowState(conversation, ctx.now).open : false,
    canSendEmail: contact.emails.length > 0 && hasEmailConnection,
    preparedByName: userName(ctx, quote.createdByUserId),
    whatsappConversationId: conversation?.id ?? null,
    serviceWindowExpiresAt: conversation?.serviceWindowExpiresAt ?? null,
    hasEmailConnection,
  };
}

function todayInWorkspace(ctx: MockContext) {
  return dateInTimezone(ctx.now, ctx.workspace.timezone);
}

function assertValidUntil(ctx: MockContext, validUntil: string) {
  if (validUntil < todayInWorkspace(ctx)) {
    throw ctx.error("VALIDATION", "Choose a validity date from today onwards.");
  }
}

/** Store line items and recompute totals with the quote's own VAT rate. */
function applyLineItems(ctx: MockContext, quote: Quote, items: LineItemInput[]) {
  ctx.unwrap(validateLineItems(items));
  const totals = computeQuoteTotals(items, quote.vatRate);
  quote.lineItems = items.map((item) => ({
    id: item.id ?? newId(),
    description: item.description.trim(),
    qty: formatDecimal(item.qty),
    unitPriceAed: toMoneyString(item.unitPriceAed),
  }));
  quote.subtotalAed = totals.subtotalAed;
  quote.vatAmountAed = totals.vatAmountAed;
  quote.totalAed = totals.totalAed;
}

/** Next number in the workspace's yearly sequence (year in the workspace timezone), skipping any already used. */
function nextQuoteNumber(ctx: MockContext, commit: boolean): string {
  const year = Number(todayInWorkspace(ctx).slice(0, 4));
  let counter = ctx.db.quoteCounters.find((c) => c.workspaceId === ctx.workspace.id && c.year === year);
  const used = new Set(rows(ctx, "quotes").map((q) => q.number));
  let sequence = (counter?.lastNumber ?? 0) + 1;
  while (used.has(formatQuoteNumber(year, sequence))) sequence += 1;
  if (commit) {
    if (!counter) {
      counter = { workspaceId: ctx.workspace.id, year, lastNumber: 0 };
      ctx.db.quoteCounters.push(counter);
    }
    counter.lastNumber = sequence;
  }
  return formatQuoteNumber(year, sequence);
}

function findOrCreateEmailConversation(
  ctx: MockContext,
  contact: Contact,
  email: string,
  connection: ChannelConnection,
  deal: Deal,
): Conversation {
  const address = email.toLowerCase();
  const existing = rows(ctx, "conversations").find(
    (c) =>
      c.channel === "email" &&
      c.channelConnectionId === connection.id &&
      (c.contactId === contact.id || c.participantEmail?.toLowerCase() === address),
  );
  if (existing) return existing;
  const conversation: Conversation = {
    id: newId(),
    workspaceId: ctx.workspace.id,
    createdAt: ctx.nowIso,
    updatedAt: ctx.nowIso,
    channel: "email",
    channelConnectionId: connection.id,
    participantPhoneE164: null,
    participantEmail: email,
    participantWhatsappUserId: null,
    participantName: contactName(contact),
    contactId: contact.id,
    leadId: null,
    assigneeId: contact.assigneeId ?? deal.assigneeId,
    lastInboundAt: null,
    lastOutboundAt: null,
    lastMessageAt: null,
    lastMessagePreview: null,
    unreadCount: 0,
    serviceWindowExpiresAt: null,
    isSimulated: true,
  };
  ctx.db.conversations.push(conversation);
  ctx.emit({ type: "conversation.updated", id: conversation.id });
  return conversation;
}

function quotePdfMedia(quote: Quote, caption: string | null): Media {
  return {
    kind: "document",
    url: `demo://quotes/${quote.id}.pdf`,
    mimeType: "application/pdf",
    fileName: `${quote.number}.pdf`,
    sizeBytes: 68_000 + quote.lineItems.length * 4_200,
    caption,
  };
}

const SENT_VIA_LABEL = { whatsapp: "on WhatsApp", email: "by email" } as const;

export const quoteHandlers: MockHandler[] = [
  handle(api.quotes.listForDeal, (ctx, { params }) => {
    const deal = visibleDeal(ctx, params.dealId);
    const items = rows(ctx, "quotes")
      .filter((q) => q.dealId === deal.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return { items };
  }),

  handle(api.quotes.draftContext, (ctx, { params }) => {
    const deal = visibleDeal(ctx, params.dealId);
    return {
      deal,
      contact: dealContact(ctx, deal),
      company: dealCompany(ctx, deal),
      workspace: ctx.workspace,
      nextNumber: nextQuoteNumber(ctx, false),
      preparedByName: ctx.user.name,
    };
  }),

  handle(api.quotes.get, (ctx, { params }) => {
    return toDetail(ctx, findOr404(ctx, "quotes", params.quoteId, "quote"));
  }),

  handle(api.quotes.create, (ctx, { params, body }) => {
    const deal = visibleDeal(ctx, params.dealId);
    assertValidUntil(ctx, body.validUntil);
    const quote: Quote = {
      id: newId(),
      workspaceId: ctx.workspace.id,
      createdAt: ctx.nowIso,
      updatedAt: ctx.nowIso,
      dealId: deal.id,
      number: "",
      lineItems: [],
      subtotalAed: "0.00",
      vatRate: ctx.workspace.vatRate,
      vatAmountAed: "0.00",
      totalAed: "0.00",
      validUntil: body.validUntil,
      notes: body.notes || null,
      status: "draft",
      sentAt: null,
      sentVia: null,
      pdfUrl: null,
      createdByUserId: ctx.user.id,
    };
    applyLineItems(ctx, quote, body.lineItems);
    quote.number = nextQuoteNumber(ctx, true);
    ctx.db.quotes.push(quote);
    addActivity(ctx, {
      type: "system",
      dealId: deal.id,
      contactId: deal.contactId,
      body: `Drafted quote ${quote.number} for ${formatAed(quote.totalAed)} incl. VAT`,
      metadata: { kind: "quote_created", quoteId: quote.id, number: quote.number },
    });
    ctx.emit({ type: "quote.updated", id: quote.id });
    return toDetail(ctx, quote);
  }),

  handle(api.quotes.update, (ctx, { params, body }) => {
    const quote = findOr404(ctx, "quotes", params.quoteId, "quote");
    const deal = visibleDeal(ctx, quote.dealId);
    const edits = body.lineItems !== undefined || body.validUntil !== undefined || body.notes !== undefined;
    const nextStatus = ctx.unwrap(planQuoteUpdate(quote.status, { edits, status: body.status }));

    if (body.lineItems) applyLineItems(ctx, quote, body.lineItems);
    if (body.validUntil !== undefined) {
      assertValidUntil(ctx, body.validUntil);
      quote.validUntil = body.validUntil;
    }
    if (body.notes !== undefined) quote.notes = body.notes || null;

    if (nextStatus !== quote.status) {
      quote.status = nextStatus;
      const contact = dealContact(ctx, deal);
      addActivity(ctx, {
        type: "system",
        dealId: deal.id,
        contactId: deal.contactId,
        body: `Quote ${quote.number} marked as ${nextStatus}`,
        metadata: { kind: `quote_${nextStatus}`, quoteId: quote.id, number: quote.number },
      });
      // The assignee hears about an acceptance from someone else; their own click needs no alert.
      if (nextStatus === "accepted" && deal.assigneeId && deal.assigneeId !== ctx.user.id) {
        notify(ctx, {
          userId: deal.assigneeId,
          type: "quote_accepted",
          title: `${contactName(contact)} accepted quote ${quote.number}`,
          body: `${formatAed(quote.totalAed)} incl. VAT · ${deal.title}`,
          href: `/quotes/${quote.id}`,
        });
      }
    }
    quote.updatedAt = ctx.nowIso;
    ctx.emit({ type: "quote.updated", id: quote.id });
    return toDetail(ctx, quote);
  }),

  handle(api.quotes.send, (ctx, { params, body }) => {
    const quote = findOr404(ctx, "quotes", params.quoteId, "quote");
    const deal = visibleDeal(ctx, quote.dealId);
    const contact = dealContact(ctx, deal);
    const name = contactName(contact);
    let message: Message;

    if (body.via === "whatsapp") {
      const conversation = whatsappConversation(ctx, contact);
      if (!conversation || !serviceWindowState(conversation, ctx.now).open) {
        throw ctx.error(
          "SERVICE_WINDOW_CLOSED",
          `${contact.firstName} hasn't messaged on WhatsApp in the last 24 hours. Ask them to reply first, or send the quote by email.`,
        );
      }
      message = appendMessage(ctx, conversation, {
        direction: "out",
        kind: "document",
        body: quote.number,
        media: [quotePdfMedia(quote, "Your treatment plan and quotation")],
        quoteId: quote.id,
      });
    } else {
      const email = contact.emails[0];
      if (!email)
        throw ctx.error("VALIDATION", `Add an email address for ${name} to send the quote by email.`);
      const connection = gmailConnection(ctx);
      if (!connection) {
        throw ctx.error("VALIDATION", "Connect a Gmail mailbox in Settings to send quotes by email.");
      }
      const conversation = findOrCreateEmailConversation(ctx, contact, email, connection, deal);
      message = appendMessage(ctx, conversation, {
        direction: "out",
        kind: "document",
        subject: `Quotation ${quote.number} from ${ctx.workspace.name}`,
        body: [
          `Dear ${contact.firstName},`,
          `Please find attached quotation ${quote.number} for ${deal.title}.`,
          `Total: ${formatAed(quote.totalAed)} including ${formatDecimal(quote.vatRate)}% VAT\nValid until: ${formatDate(quote.validUntil)}`,
          "Reply to this email with any questions, or to confirm and book your dates.",
          `Kind regards,\n${ctx.user.name}\n${ctx.workspace.name}`,
        ].join("\n\n"),
        media: [quotePdfMedia(quote, null)],
        quoteId: quote.id,
      });
    }

    quote.status = statusAfterSend(quote.status);
    quote.sentAt = ctx.nowIso;
    quote.sentVia = body.via;
    quote.pdfUrl = `demo://quotes/${quote.id}.pdf`;
    quote.updatedAt = ctx.nowIso;
    addActivity(ctx, {
      type: "quote_sent",
      dealId: deal.id,
      contactId: deal.contactId,
      body: `Quote ${quote.number} sent ${SENT_VIA_LABEL[body.via]} — ${formatAed(quote.totalAed)} incl. VAT`,
      metadata: { quoteId: quote.id, number: quote.number, via: body.via, totalAed: quote.totalAed },
    });
    ctx.emit({ type: "quote.updated", id: quote.id });
    return { quote: toDetail(ctx, quote), message };
  }),
];
