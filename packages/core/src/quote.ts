import Big from "big.js";
import { toMoneyString } from "./money";

export interface LineItemLike {
  qty: string;
  unitPriceAed: string;
}

export interface QuoteTotals {
  lineTotals: string[];
  subtotalAed: string;
  vatAmountAed: string;
  totalAed: string;
}

/** Line totals and VAT computed on the subtotal, rounded half-up to fils (2 decimals). */
export function computeQuoteTotals(items: LineItemLike[], vatRatePercent: string): QuoteTotals {
  const lineTotals = items.map((item) =>
    new Big(item.qty).times(item.unitPriceAed).round(2, Big.roundHalfUp),
  );
  const subtotal = lineTotals.reduce<Big>((acc, v) => acc.plus(v), new Big(0));
  const vat = subtotal.times(vatRatePercent).div(100).round(2, Big.roundHalfUp);
  return {
    lineTotals: lineTotals.map((v) => toMoneyString(v)),
    subtotalAed: toMoneyString(subtotal),
    vatAmountAed: toMoneyString(vat),
    totalAed: toMoneyString(subtotal.plus(vat)),
  };
}

/** Q-2026-0007 */
export function formatQuoteNumber(year: number, sequence: number): string {
  return `Q-${year}-${String(sequence).padStart(4, "0")}`;
}
