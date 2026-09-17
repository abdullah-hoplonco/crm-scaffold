import { z } from "zod";
import {
  Company,
  Contact,
  DateOnly,
  Decimal,
  Deal,
  Message,
  MoneyAed,
  Quote,
  Timestamp,
  Workspace,
} from "../entities";
import { QuoteSendVia } from "../enums";
import { defineRoute } from "./define";

export const LineItemInput = z.object({
  id: z.string().optional(),
  description: z.string().trim().min(1, "Describe the item"),
  qty: Decimal,
  unitPriceAed: MoneyAed,
});
export type LineItemInput = z.infer<typeof LineItemInput>;

export const QuoteDetail = z.object({
  quote: Quote,
  deal: Deal,
  contact: Contact,
  company: Company.nullable(),
  workspace: Workspace,
  /** Whether a WhatsApp send is allowed right now (service window open). */
  canSendWhatsapp: z.boolean(),
  canSendEmail: z.boolean(),
  /** Name of the user who created the quote, printed as "Prepared by". */
  preparedByName: z.string().nullable().optional(),
  /** The contact's WhatsApp conversation, if there is one (for "Open chat"). */
  whatsappConversationId: z.string().nullable().optional(),
  /** When that conversation's service window closes or closed; null when the contact never messaged. */
  serviceWindowExpiresAt: Timestamp.nullable().optional(),
  /** Whether the workspace has a connected Gmail mailbox to send from. */
  hasEmailConnection: z.boolean().optional(),
});
export type QuoteDetail = z.infer<typeof QuoteDetail>;

/** What the quote builder needs before a quote exists. */
export const QuoteDraftContext = z.object({
  deal: Deal,
  contact: Contact,
  company: Company.nullable(),
  workspace: Workspace,
  /** The number the next saved quote will most likely get; the final number is assigned on save. */
  nextNumber: z.string(),
  preparedByName: z.string(),
});
export type QuoteDraftContext = z.infer<typeof QuoteDraftContext>;

export const quoteRoutes = {
  listForDeal: defineRoute({
    method: "GET",
    path: "/deals/:dealId/quotes",
    summary: "Quotes on a deal, newest first",
    params: z.object({ dealId: z.string() }),
    response: z.object({ items: z.array(Quote) }),
  }),
  draftContext: defineRoute({
    method: "GET",
    path: "/deals/:dealId/quotes/draft-context",
    summary: "Deal, contact, company, workspace and the next quote number, for building a new quote",
    params: z.object({ dealId: z.string() }),
    response: QuoteDraftContext,
  }),
  get: defineRoute({
    method: "GET",
    path: "/quotes/:quoteId",
    summary: "Quote with everything needed to render the PDF",
    params: z.object({ quoteId: z.string() }),
    response: QuoteDetail,
  }),
  create: defineRoute({
    method: "POST",
    path: "/deals/:dealId/quotes",
    summary: "Create a draft quote; totals, 5% VAT and number are computed server-side",
    params: z.object({ dealId: z.string() }),
    body: z.object({
      lineItems: z.array(LineItemInput).min(1, "Add at least one item"),
      validUntil: DateOnly,
      notes: z.string().trim().nullable().optional(),
    }),
    response: QuoteDetail,
  }),
  update: defineRoute({
    method: "PATCH",
    path: "/quotes/:quoteId",
    summary: "Edit a draft, or mark a sent quote accepted or rejected",
    params: z.object({ quoteId: z.string() }),
    body: z.object({
      lineItems: z.array(LineItemInput).min(1).optional(),
      validUntil: DateOnly.optional(),
      notes: z.string().trim().nullable().optional(),
      status: z.enum(["accepted", "rejected"]).optional(),
    }),
    response: QuoteDetail,
  }),
  send: defineRoute({
    method: "POST",
    path: "/quotes/:quoteId/send",
    summary:
      "Send the quote PDF on WhatsApp (needs an open service window, else 422 SERVICE_WINDOW_CLOSED) or by email",
    params: z.object({ quoteId: z.string() }),
    body: z.object({ via: QuoteSendVia }),
    response: z.object({ quote: QuoteDetail, message: Message.nullable() }),
  }),
};
