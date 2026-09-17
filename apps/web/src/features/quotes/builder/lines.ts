import { computeQuoteTotals, toMoneyString } from "@hco/core";
import { formatDecimal } from "@hco/core/quotes/index";
import { Decimal, MoneyAed, newId, type QuoteLineItem } from "@hco/shared";
import type { LineItemInput } from "@hco/shared/api/quotes";

/** A line item as typed in the builder: raw strings, validated on the fly. */
export interface EditableLine {
  key: string;
  /** Id of a saved line item, kept when editing a draft. */
  id?: string;
  description: string;
  qty: string;
  unitPrice: string;
}

export interface LineErrors {
  description?: true;
  qty?: true;
  unitPrice?: true;
}

export function blankLine(): EditableLine {
  return { key: newId(), description: "", qty: "1", unitPrice: "" };
}

export function lineFromItem(item: { description: string; qty: string; unitPriceAed: string }): EditableLine {
  return {
    key: newId(),
    description: item.description,
    qty: formatDecimal(item.qty),
    // "4800" stays short; "285.5" reads as money only with both fils digits.
    unitPrice: toMoneyString(item.unitPriceAed).replace(/\.00$/, ""),
  };
}

export function linesFromQuote(items: QuoteLineItem[]): EditableLine[] {
  return items.map((item) => ({ ...lineFromItem(item), id: item.id }));
}

/** Accept what people type: "4,800", "AED 4800", " 4800.5 ". */
function cleanNumber(value: string): string {
  return value.replace(/aed/gi, "").replace(/[,\s]/g, "");
}

export function isBlank(line: EditableLine): boolean {
  return !line.description.trim() && !cleanNumber(line.unitPrice);
}

function parseLine(line: EditableLine): { item: LineItemInput | null; errors: LineErrors } {
  const errors: LineErrors = {};
  const description = line.description.trim();
  const qty = Decimal.safeParse(cleanNumber(line.qty));
  const price = MoneyAed.safeParse(cleanNumber(line.unitPrice));
  if (!description) errors.description = true;
  if (!qty.success || Number(qty.data) <= 0) errors.qty = true;
  if (!price.success) errors.unitPrice = true;
  if (Object.keys(errors).length || !qty.success || !price.success) return { item: null, errors };
  return { item: { id: line.id, description, qty: qty.data, unitPriceAed: price.data }, errors };
}

/**
 * Validate the builder's lines and price them with the core VAT rules. Invalid lines are left out of
 * the totals (and shown with errors once the user tries to save).
 */
export function evaluateLines(lines: EditableLine[], vatRate: string) {
  const errors: Record<string, LineErrors> = {};
  const priced: Array<{ key: string; item: LineItemInput }> = [];
  for (const line of lines) {
    const parsed = parseLine(line);
    if (parsed.item) priced.push({ key: line.key, item: parsed.item });
    else errors[line.key] = parsed.errors;
  }
  const totals = computeQuoteTotals(
    priced.map((p) => p.item),
    vatRate,
  );
  const lineTotals = new Map(priced.map((p, index) => [p.key, totals.lineTotals[index] ?? "0.00"]));
  return {
    items: priced.map((p) => p.item),
    priced: priced.map((p) => ({ ...p, totalAed: lineTotals.get(p.key) ?? "0.00" })),
    lineTotals,
    errors,
    isValid: lines.length > 0 && Object.keys(errors).length === 0,
    subtotalAed: totals.subtotalAed,
    vatAmountAed: totals.vatAmountAed,
    totalAed: totals.totalAed,
  };
}
