import type { StageType } from "@hco/shared";
import Big from "big.js";
import { sumMoney, toMoneyString } from "../money";

export interface Placement {
  /** Put the item just above this one. Wins over the other options. */
  beforeId?: string | null;
  /** Put the item just below this one. */
  afterId?: string | null;
  /** Position in the list without the item. Appends when omitted or out of range. */
  index?: number;
}

/**
 * Order of a kanban column after a card lands in it. Neighbour ids come from what the user saw, so
 * they stay correct when the board is filtered; unknown neighbours fall back to the index.
 */
export function placeInOrder(orderedIds: readonly string[], id: string, placement: Placement): string[] {
  const rest = orderedIds.filter((x) => x !== id);
  let at = rest.length;
  if (placement.beforeId && rest.includes(placement.beforeId)) {
    at = rest.indexOf(placement.beforeId);
  } else if (placement.afterId && rest.includes(placement.afterId)) {
    at = rest.indexOf(placement.afterId) + 1;
  } else if (placement.index !== undefined) {
    at = Math.max(0, Math.min(placement.index, rest.length));
  }
  return [...rest.slice(0, at), id, ...rest.slice(at)];
}

export interface ColumnLike {
  stage: { type: StageType; probability: number };
  deals: Array<{ valueAed: string }>;
}

export interface PipelineTotals {
  openCount: number;
  openValueAed: string;
  /** Open value weighted by each stage's probability. */
  weightedValueAed: string;
}

export function pipelineTotals(columns: readonly ColumnLike[]): PipelineTotals {
  const open = columns.filter((c) => c.stage.type === "open");
  const openDeals = open.flatMap((c) => c.deals);
  const weighted = open.reduce<Big>(
    (acc, c) =>
      acc.plus(new Big(sumMoney(c.deals.map((d) => d.valueAed))).times(c.stage.probability).div(100)),
    new Big(0),
  );
  return {
    openCount: openDeals.length,
    openValueAed: sumMoney(openDeals.map((d) => d.valueAed)),
    weightedValueAed: toMoneyString(weighted),
  };
}
