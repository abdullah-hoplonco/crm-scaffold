import { formatPhone, serviceWindowState } from "@hco/core";
import { renderTemplate, templateVariableCount } from "@hco/core/inbox/templates";
import { interestFromFormFields } from "@hco/core/leads/views";
import { api, type Contact, type Conversation, type Lead } from "@hco/shared";
import { handle, type MockContext, type MockHandler } from "../define";
import { assertVisible, findOr404, matchesQuery, rows, visibleToActor } from "../scope";
import { appendMessage, findOrCreateWhatsappConversation } from "../services";
import { conversationDisplayName, toConversationListItem, toDealCard, openDealsOfContact } from "../views";

function byRecency(a: Conversation, b: Conversation) {
  return (b.lastMessageAt ?? b.updatedAt).localeCompare(a.lastMessageAt ?? a.updatedAt);
}

/** What the person asked about most recently, from the form answers of their lead(s). */
function interestOf(ctx: MockContext, contact: Contact | null, lead: Lead | null): string | null {
  const leads = rows(ctx, "leads")
    .filter(
      (l) =>
        (lead && l.id === lead.id) ||
        (contact && (l.convertedContactId === contact.id || l.matchedContactId === contact.id)),
    )
    .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));
  for (const l of leads) {
    const interest = interestFromFormFields(l.formFields);
    if (interest) return interest;
  }
  return null;
}

function visibleConversation(ctx: MockContext, id: string) {
  const conv = findOr404(ctx, "conversations", id, "conversation");
  assertVisible(ctx, conv, "conversation");
  return conv;
}

function lastSubject(ctx: MockContext, conv: Conversation): string | null {
  const withSubject = rows(ctx, "messages")
    .filter((m) => m.conversationId === conv.id && m.subject)
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))[0];
  if (!withSubject?.subject) return null;
  return /^re:/i.test(withSubject.subject) ? withSubject.subject : `Re: ${withSubject.subject}`;
}

export const inboxHandlers: MockHandler[] = [
  handle(api.inbox.list, (ctx, { query }) => {
    const visible = visibleToActor(ctx, rows(ctx, "conversations"));
    const searched = visible
      .filter((c) => !query.channel || c.channel === query.channel)
      .filter((c) =>
        matchesQuery(
          query.q,
          conversationDisplayName(ctx, c),
          c.participantName,
          c.participantEmail,
          c.participantPhoneE164 ? `${c.participantPhoneE164} ${formatPhone(c.participantPhoneE164)}` : null,
          c.lastMessagePreview,
        ),
      );
    const me = ctx.user.id;
    const inFilter = (c: Conversation, filter: typeof query.filter) =>
      filter === "all" ||
      (filter === "mine" && c.assigneeId === me) ||
      (filter === "unassigned" && c.assigneeId === null) ||
      (filter === "unread" && c.unreadCount > 0);
    return {
      items: searched
        .filter((c) => inFilter(c, query.filter))
        .sort(byRecency)
        .map((c) => toConversationListItem(ctx, c)),
      unreadTotal: visible.filter((c) => c.unreadCount > 0).length,
      counts: {
        all: searched.length,
        mine: searched.filter((c) => inFilter(c, "mine")).length,
        unassigned: searched.filter((c) => inFilter(c, "unassigned")).length,
        unread: searched.filter((c) => inFilter(c, "unread")).length,
      },
    };
  }),

  handle(api.inbox.get, (ctx, { params }) => {
    const conv = visibleConversation(ctx, params.conversationId);
    const contact = conv.contactId
      ? (rows(ctx, "contacts").find((c) => c.id === conv.contactId) ?? null)
      : null;
    const lead = conv.leadId ? (rows(ctx, "leads").find((l) => l.id === conv.leadId) ?? null) : null;
    return {
      conversation: toConversationListItem(ctx, conv),
      messages: rows(ctx, "messages")
        .filter((m) => m.conversationId === conv.id)
        .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt)),
      contact,
      lead,
      openDeals: contact ? openDealsOfContact(ctx, contact.id).map((d) => toDealCard(ctx, d)) : [],
      interest: interestOf(ctx, contact, lead),
    };
  }),

  handle(api.inbox.start, (ctx, { body }) => {
    if (!body.leadId && !body.contactId) {
      throw ctx.error("VALIDATION", "Choose a lead or a contact to message.");
    }
    let lead = body.leadId ? findOr404(ctx, "leads", body.leadId, "lead") : null;
    if (lead) assertVisible(ctx, lead, "lead");
    let contact = body.contactId ? findOr404(ctx, "contacts", body.contactId, "contact") : null;
    // A converted lead's chat now belongs to its contact.
    if (!contact && lead?.convertedContactId) {
      contact = rows(ctx, "contacts").find((c) => c.id === lead?.convertedContactId) ?? null;
      if (contact) lead = null;
    }
    const whatsappPhone = contact
      ? (contact.phones.find((p) => p.isWhatsapp)?.e164 ?? contact.primaryPhoneE164)
      : (lead?.phoneE164 ?? null);
    const whatsappUserId = contact?.whatsappUserId ?? lead?.whatsappUserId ?? null;
    if (!whatsappPhone && !whatsappUserId) {
      const name = contact ? [contact.firstName, contact.lastName].filter(Boolean).join(" ") : lead?.name;
      throw ctx.error(
        "VALIDATION",
        `${name ?? "This person"} has no WhatsApp number yet. Add a mobile number first.`,
      );
    }
    const conv = findOrCreateWhatsappConversation(ctx, { contact, lead: contact ? null : lead });
    assertVisible(ctx, conv, "conversation");
    return toConversationListItem(ctx, conv);
  }),

  handle(api.inbox.send, (ctx, { params, body }) => {
    const conv = visibleConversation(ctx, params.conversationId);
    if (body.kind === "text") {
      if (!serviceWindowState(conv, ctx.now).open) {
        throw ctx.error(
          "SERVICE_WINDOW_CLOSED",
          "The 24-hour reply window is closed. Send an approved template instead.",
        );
      }
      return appendMessage(ctx, conv, {
        direction: "out",
        kind: "text",
        body: body.body,
        subject: conv.channel === "email" ? lastSubject(ctx, conv) : null,
      });
    }

    if (conv.channel !== "whatsapp") {
      throw ctx.error("VALIDATION", "Templates are for WhatsApp. Write a normal reply to this email.");
    }
    const template = rows(ctx, "whatsappTemplates").find(
      (t) => t.id === body.templateId && t.status === "approved",
    );
    if (!template) throw ctx.error("NOT_FOUND", "That template isn't approved any more. Pick another one.");
    const needed = templateVariableCount(template.body);
    const variables = body.variables.slice(0, needed);
    if (variables.length < needed) throw ctx.error("VALIDATION", "Fill in every field of the template.");
    return appendMessage(ctx, conv, {
      direction: "out",
      kind: "template",
      body: renderTemplate(template.body, variables),
      template: {
        templateId: template.id,
        name: template.name,
        language: template.language,
        variables,
      },
    });
  }),

  handle(api.inbox.markRead, (ctx, { params }) => {
    const conv = visibleConversation(ctx, params.conversationId);
    if (conv.unreadCount === 0) return toConversationListItem(ctx, conv);
    conv.unreadCount = 0;
    // Reading the chat also settles its "new message" notifications for this user.
    for (const n of rows(ctx, "notifications")) {
      if (
        n.userId === ctx.user.id &&
        !n.readAt &&
        n.type === "message_received" &&
        n.href === `/inbox/${conv.id}`
      ) {
        n.readAt = ctx.nowIso;
        n.updatedAt = ctx.nowIso;
      }
    }
    ctx.emit({ type: "conversation.updated", id: conv.id });
    return toConversationListItem(ctx, conv);
  }),

  handle(api.inbox.assign, (ctx, { params, body }) => {
    const conv = visibleConversation(ctx, params.conversationId);
    if (conv.assigneeId === body.assigneeId) return toConversationListItem(ctx, conv);
    const assignee = body.assigneeId ? rows(ctx, "users").find((u) => u.id === body.assigneeId) : null;
    if (body.assigneeId && (!assignee || !assignee.isActive)) {
      throw ctx.error("VALIDATION", "That teammate isn't active in this workspace. Pick someone else.");
    }
    conv.assigneeId = body.assigneeId;
    conv.updatedAt = ctx.nowIso;
    const notifyOther = assignee && assignee.id !== ctx.user.id;
    ctx.emit({
      type: "conversation.updated",
      id: conv.id,
      notifyUserIds: notifyOther ? [assignee.id] : [],
      toast: notifyOther
        ? {
            title: `${ctx.user.name} assigned you a conversation`,
            body: conversationDisplayName(ctx, conv),
            href: `/inbox/${conv.id}`,
          }
        : null,
    });
    return toConversationListItem(ctx, conv);
  }),

  handle(api.inbox.templates, (ctx) => ({
    items: rows(ctx, "whatsappTemplates").filter((t) => t.status === "approved"),
  })),
];
