import type { QuoteStatus } from "@hco/shared";
import Big from "big.js";
import { computeQuoteTotals } from "../quote";
import { fail, ok, type Result } from "../result";

export const DEFAULT_QUOTE_VALIDITY_DAYS = 14;

export interface LineItemDraft {
  description: string;
  qty: string;
  unitPriceAed: string;
}

/**
 * Every line needs a description and a quantity above zero. Unit prices may be negative (a discount
 * line), but the quote as a whole can't be.
 */
export function validateLineItems(items: LineItemDraft[]): Result<true> {
  if (items.length === 0) return fail("VALIDATION", "Add at least one item.");
  for (const [index, item] of items.entries()) {
    if (!item.description.trim()) return fail("VALIDATION", `Describe item ${index + 1}.`);
    if (!new Big(item.qty).gt(0)) {
      return fail("VALIDATION", `Item ${index + 1} needs a quantity above zero.`);
    }
  }
  if (new Big(computeQuoteTotals(items, "0").subtotalAed).lt(0)) {
    return fail("VALIDATION", "The quote total can't be below zero.");
  }
  return ok(true);
}

/**
 * Quote lifecycle: draft (editable) → sent → accepted or rejected. Only drafts can be edited; only a
 * sent quote gets an outcome. Marking the same outcome twice is a no-op.
 */
export function planQuoteUpdate(
  current: QuoteStatus,
  change: { edits: boolean; status?: "accepted" | "rejected" },
): Result<QuoteStatus> {
  if (change.edits && current !== "draft") {
    return fail(
      "QUOTE_NOT_EDITABLE",
      "This quote was already sent, so it can't be changed. Create a new quote instead.",
    );
  }
  if (!change.status) return ok(current);
  if (current === change.status) return ok(current);
  if (current === "draft") {
    return fail("INVALID_TRANSITION", "Send the quote before marking it accepted or rejected.");
  }
  if (current !== "sent") return fail("INVALID_TRANSITION", `This quote was already ${current}.`);
  return ok(change.status);
}

/** Sending a draft marks it sent; sending a copy later keeps the outcome. */
export function statusAfterSend(current: QuoteStatus): QuoteStatus {
  return current === "draft" ? "sent" : current;
}
