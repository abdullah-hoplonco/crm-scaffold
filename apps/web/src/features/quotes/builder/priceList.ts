import { computeQuoteTotals } from "@hco/core";
import { TREATMENTS } from "@hco/demo-data/catalog";

/**
 * The showcase workspace's price list. Phase A reads the demo consultancy's service fees; a real
 * workspace would load its own products and services here.
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

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * The price list group a deal is about, judged by its title: the full service name first
 * ("UK study visa — Ali Raza"), then the group key as a whole word ("Masters in UK — Ali Raza",
 * "IELTS — Hina Tariq").
 */
export function suggestedGroup(dealTitle: string): PriceListGroup | null {
  const title = dealTitle.toLowerCase();
  return (
    PRICE_LIST.find((group) => title.includes(group.name.toLowerCase())) ??
    PRICE_LIST.find((group) => new RegExp(`\\b${escapeRegExp(group.key.toLowerCase())}\\b`).test(title)) ??
    null
  );
}
