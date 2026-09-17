import { computeQuoteTotals } from "@hco/core";
import { TREATMENTS } from "@hco/demo-data/catalog";

/**
 * The showcase workspace's price list. Phase A reads the demo clinic's catalogue; a real workspace
 * would load its own products and services here.
 */
export interface PriceListGroup {
  key: string;
  name: string;
  items: Array<{ description: string; qty: string; unitPriceAed: string }>;
  subtotalAed: string;
}

function capitalise(value: string) {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

export const PRICE_LIST: PriceListGroup[] = TREATMENTS.map((treatment) => ({
  key: treatment.key,
  name: capitalise(treatment.short),
  items: treatment.lineItems,
  subtotalAed: computeQuoteTotals(treatment.lineItems, "0").subtotalAed,
}));

/** The price list group a deal is about, judged by its title ("Invisalign — Rania Khoury"). */
export function suggestedGroup(dealTitle: string): PriceListGroup | null {
  const title = dealTitle.toLowerCase();
  return PRICE_LIST.find((group) => title.includes(group.name.toLowerCase())) ?? null;
}
