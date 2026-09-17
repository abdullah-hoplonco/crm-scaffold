import { api } from "@hco/shared";
import { callApi } from "@/lib/api/client";
import { PRICE_LIST, suggestedGroup } from "@/features/quotes/builder/priceList";
import type { TourAction, TourSubject } from "./types";

/**
 * The things the tour does to the workspace on the client's behalf. All of them go through the same
 * API the screens use, so what the client sees is what the product really does.
 */
export interface TourActionResult {
  /** Facts the later chapters need. */
  subject: Partial<TourSubject>;
  /** Chapter 1's toast: who enquired and what they asked. */
  toast?: { name: string; text: string | null };
}

function inDays(days: number): string {
  const date = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Chapter 1: a real Instagram enquiry, through the same ingestion path an ad uses. */
async function instagramLead(): Promise<TourActionResult> {
  const simulated = await callApi(api.demo.simulateLead, { body: { source: "instagram", count: 1 } });
  const leadId = simulated.leadIds[0] ?? null;
  if (!leadId) return { subject: {} };
  const detail = await callApi(api.leads.get, { params: { leadId } });
  return {
    subject: { leadId, leadName: detail.lead.name, leadPhone: detail.lead.phoneE164 },
    toast: { name: detail.lead.name, text: simulated.results?.[0]?.text ?? detail.lead.message },
  };
}

/**
 * Chapter 3: the patient messages the clinic on WhatsApp. Sending it from the lead's own number
 * means it lands on the lead that is already on screen, and opens the 24-hour reply window.
 */
async function leadWhatsapp(subject: TourSubject): Promise<TourActionResult> {
  let phone = subject.leadPhone;
  if (!phone && subject.leadId) {
    const detail = await callApi(api.leads.get, { params: { leadId: subject.leadId } });
    phone = detail.lead.phoneE164;
  }
  if (!phone) return { subject: {} };
  const message = await callApi(api.demo.simulateMessage, {
    body: { from: "unknown_number", phone },
  });
  return { subject: { conversationId: message.conversationId, leadId: message.leadId ?? subject.leadId } };
}

/**
 * The deal the quotation chapter is about. Normally the one the client just converted; if they came
 * to the chapter another way, the lead still knows its deal, and failing that the newest card on the
 * board will do — the chapter must never end up with nothing to point at.
 */
async function resolveDealId(subject: TourSubject): Promise<string | null> {
  if (subject.dealId) return subject.dealId;
  if (subject.leadId) {
    const detail = await callApi(api.leads.get, { params: { leadId: subject.leadId } });
    const converted = detail.convertedDeal?.id;
    if (converted) return converted;
  }
  const board = await callApi(api.pipeline.board, { query: {} });
  const column = board.columns.find((entry) => entry.stage.type === "open" && entry.deals.length > 0);
  return column?.deals[0]?.id ?? null;
}

/** Chapter 6, first step: make sure the chapter has a deal to quote against before it navigates. */
async function ensureDeal(subject: TourSubject): Promise<TourActionResult> {
  const dealId = await resolveDealId(subject);
  return dealId ? { subject: { dealId } } : { subject: {} };
}

/**
 * Chapter 6: if the client skipped building the quote, build one from the clinic's price list so
 * the rest of the chapter still has something real to show.
 */
async function ensureQuote(subject: TourSubject): Promise<TourActionResult> {
  if (subject.quoteId) return { subject: {} };
  const dealId = await resolveDealId(subject);
  if (!dealId) return { subject: {} };
  const existing = await callApi(api.quotes.listForDeal, { params: { dealId } });
  const already = existing.items.find((quote) => quote.status === "draft") ?? existing.items[0];
  if (already) return { subject: { dealId, quoteId: already.id } };

  const context = await callApi(api.quotes.draftContext, { params: { dealId } });
  const group = suggestedGroup(context.deal.title) ?? PRICE_LIST[0];
  if (!group) return { subject: { dealId } };
  const created = await callApi(api.quotes.create, {
    params: { dealId },
    body: { lineItems: group.items, validUntil: inDays(14) },
  });
  return { subject: { dealId, quoteId: created.quote.id } };
}

export async function runTourAction(action: TourAction, subject: TourSubject): Promise<TourActionResult> {
  switch (action) {
    case "instagramLead":
      return instagramLead();
    case "leadWhatsapp":
      return leadWhatsapp(subject);
    case "ensureDeal":
      return ensureDeal(subject);
    case "ensureQuote":
      return ensureQuote(subject);
  }
}
