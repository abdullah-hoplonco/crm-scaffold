import { sumMoney } from "@hco/core";
import { placeInOrder } from "@hco/core/pipeline/board";
import type { api } from "@hco/shared";
import type { RouteInput, RouteResponse } from "@hco/shared/api/define";
import type { DealCard } from "@hco/shared/api/pipeline";

export type BoardInput = RouteInput<typeof api.pipeline.board>;
export type BoardData = RouteResponse<typeof api.pipeline.board>;

/** Cards per stage id, in display order. The drag layer works on this shape. */
export type CardsByStage = Record<string, DealCard[]>;

export interface MovePlacement {
  index?: number;
  beforeDealId?: string | null;
  afterDealId?: string | null;
}

export function cardsByStage(columns: BoardData["columns"]): CardsByStage {
  return Object.fromEntries(columns.map((c) => [c.stage.id, c.deals]));
}

export function stageOfCard(cards: CardsByStage, id: string): string | null {
  if (id in cards) return id;
  for (const [stageId, list] of Object.entries(cards)) {
    if (list.some((c) => c.id === id)) return stageId;
  }
  return null;
}

/** Neighbours of a card in a column, which the API uses to place it even on a filtered board. */
export function placementIn(list: DealCard[], dealId: string): MovePlacement {
  const index = list.findIndex((c) => c.id === dealId);
  if (index < 0) return {};
  return {
    index,
    beforeDealId: list[index + 1]?.id ?? null,
    afterDealId: list[index - 1]?.id ?? null,
  };
}

/** The board as it will look after a move, for optimistic updates. */
export function applyMoveToBoard(
  board: BoardData,
  dealId: string,
  toStageId: string,
  placement: MovePlacement,
  now = new Date(),
): BoardData {
  const card = board.columns.flatMap((c) => c.deals).find((d) => d.id === dealId);
  const target = board.columns.find((c) => c.stage.id === toStageId);
  if (!card || !target) return board;
  const changedStage = card.stageId !== toStageId;
  const moved: DealCard = changedStage
    ? {
        ...card,
        stageId: target.stage.id,
        stageName: target.stage.name,
        stageType: target.stage.type,
        isStale: target.stage.type === "open" ? card.isStale : false,
        closedAt: target.stage.type === "open" ? null : now.toISOString(),
      }
    : card;
  const columns = board.columns.map((column) => {
    const without = column.deals.filter((d) => d.id !== dealId);
    if (column.stage.id !== toStageId) {
      return without.length === column.deals.length ? column : withTotals({ ...column, deals: without });
    }
    const order = placeInOrder(
      column.deals.map((d) => d.id),
      dealId,
      { beforeId: placement.beforeDealId, afterId: placement.afterDealId, index: placement.index },
    );
    const byId = new Map([...without, moved].map((d) => [d.id, d]));
    return withTotals({ ...column, deals: order.flatMap((id) => byId.get(id) ?? []) });
  });
  return { ...board, columns };
}

function withTotals(column: BoardData["columns"][number]): BoardData["columns"][number] {
  return {
    ...column,
    count: column.deals.length,
    totalValueAed: sumMoney(column.deals.map((d) => d.valueAed)),
  };
}
