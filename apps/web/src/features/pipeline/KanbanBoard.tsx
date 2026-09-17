import {
  closestCenter,
  defaultDropAnimationSideEffects,
  DndContext,
  DragOverlay,
  getFirstCollision,
  KeyboardSensor,
  MeasuringStrategy,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  TouchSensor,
  useSensor,
  useSensors,
  type Announcements,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type DropAnimation,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { sumMoney } from "@hco/core";
import type { BoardColumn as BoardColumnData, DealCard } from "@hco/shared/api/pipeline";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useSession } from "@/lib/session";
import { BoardColumn } from "./BoardColumn";
import { cardsByStage, placementIn, stageOfCard, type BoardInput, type CardsByStage } from "./board-state";
import { DealCardView } from "./DealCardView";
import { useCollapsedStages } from "./useCollapsedStages";
import { useStageMove } from "./useStageMove";

const dropAnimation: DropAnimation = {
  duration: 180,
  easing: "cubic-bezier(0.2, 0, 0, 1)",
  sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: "0.4" } } }),
};

/**
 * The kanban. While a card is in the air the board renders a local copy of the columns, so live
 * refetches can't yank cards around mid-drag; on drop the move is applied optimistically to the
 * query cache and the local copy is dropped.
 */
export function KanbanBoard({ columns, boardInput }: { columns: BoardColumnData[]; boardInput: BoardInput }) {
  const { t } = useTranslation("pipeline");
  const { user } = useSession();
  const canReopen = user.role !== "rep";
  const serverCards = useMemo(() => cardsByStage(columns), [columns]);
  const stages = useMemo(() => columns.map((c) => c.stage), [columns]);
  const [working, setWorking] = useState<CardsByStage | null>(null);
  const [activeCard, setActiveCard] = useState<DealCard | null>(null);
  const [overStageId, setOverStageId] = useState<string | null>(null);
  const cards = working ?? serverCards;
  const { collapsed, toggle } = useCollapsedStages(stages);
  const { request, dialogs } = useStageMove({ boardInput });

  const lastOverId = useRef<UniqueIdentifier | null>(null);
  const movedToNewColumn = useRef(false);
  useEffect(() => {
    requestAnimationFrame(() => {
      movedToNewColumn.current = false;
    });
  }, [working]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      keyboardCodes: { start: ["Space"], cancel: ["Escape"], end: ["Space", "Enter"] },
    }),
  );

  // Prefer what's under the pointer; inside a column, snap to the nearest card.
  const collisionDetection: CollisionDetection = useCallback(
    (args) => {
      const pointer = pointerWithin(args);
      const hits = pointer.length > 0 ? pointer : rectIntersection(args);
      let overId = getFirstCollision(hits, "id");
      if (overId !== null) {
        const columnCards = cards[String(overId)];
        if (columnCards && columnCards.length > 0) {
          const ids = new Set(columnCards.map((c) => c.id));
          overId =
            closestCenter({
              ...args,
              droppableContainers: args.droppableContainers.filter((c) => ids.has(String(c.id))),
            })[0]?.id ?? overId;
        }
        lastOverId.current = overId;
        return [{ id: overId }];
      }
      if (movedToNewColumn.current && activeCard) lastOverId.current = activeCard.id;
      return lastOverId.current ? [{ id: lastOverId.current }] : [];
    },
    [cards, activeCard],
  );

  const canDrag = useCallback((card: DealCard) => card.stageType === "open" || canReopen, [canReopen]);

  const reset = () => {
    setWorking(null);
    setActiveCard(null);
    setOverStageId(null);
  };

  const onDragStart = ({ active }: DragStartEvent) => {
    const card = Object.values(serverCards)
      .flat()
      .find((c) => c.id === active.id);
    setActiveCard(card ?? null);
    setWorking(serverCards);
    setOverStageId(card?.stageId ?? null);
  };

  const onDragOver = ({ active, over }: DragOverEvent) => {
    if (!over) return;
    const current = working ?? serverCards;
    const from = stageOfCard(current, String(active.id));
    const to = stageOfCard(current, String(over.id));
    if (!from || !to) return;
    setOverStageId(to);
    if (from === to) return;
    setWorking((prev) => {
      const state = prev ?? serverCards;
      const source = state[from] ?? [];
      const target = state[to] ?? [];
      const moving = source.find((c) => c.id === active.id);
      if (!moving) return state;
      const overIndex = target.findIndex((c) => c.id === over.id);
      let index = target.length;
      if (overIndex >= 0) {
        const translated = active.rect.current.translated;
        const below = translated ? translated.top > over.rect.top + over.rect.height / 2 : false;
        index = overIndex + (below ? 1 : 0);
      }
      movedToNewColumn.current = true;
      return {
        ...state,
        [from]: source.filter((c) => c.id !== active.id),
        [to]: [...target.slice(0, index), moving, ...target.slice(index)],
      };
    });
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    const card = activeCard;
    const state = working ?? serverCards;
    if (!card || !over) return reset();
    const toStageId = stageOfCard(state, String(active.id));
    const overStage = stageOfCard(state, String(over.id));
    if (!toStageId || !overStage) return reset();

    let list = state[toStageId] ?? [];
    if (toStageId === overStage) {
      const from = list.findIndex((c) => c.id === active.id);
      const to = list.findIndex((c) => c.id === over.id);
      if (from >= 0 && to >= 0 && from !== to) list = arrayMove(list, from, to);
    }
    const finalState = { ...state, [toStageId]: list };
    const target = stages.find((s) => s.id === toStageId);
    if (!target) return reset();

    const unchanged =
      toStageId === card.stageId &&
      (serverCards[toStageId] ?? []).map((c) => c.id).join() === list.map((c) => c.id).join();
    if (unchanged) return reset();

    if (card.stageType !== "open" && target.type !== "open" && target.id !== card.stageId) {
      toast.error(t("board.reopenFirst"));
      return reset();
    }

    setWorking(finalState);
    setActiveCard(null);
    setOverStageId(null);
    request({
      deal: card,
      to: target,
      placement: placementIn(list, card.id),
      onCommit: () => setWorking(null),
      onCancel: () => setWorking(null),
    });
  };

  const announcements: Announcements = {
    onDragStart: ({ active }) => t("board.announce.start", { title: titleOf(serverCards, active.id) }),
    onDragOver: ({ active, over }) =>
      over
        ? t("board.announce.over", {
            title: titleOf(serverCards, active.id),
            stage: stageName(stages, stageOfCard(cards, String(over.id))),
          })
        : t("board.announce.outside", { title: titleOf(serverCards, active.id) }),
    onDragEnd: ({ active, over }) =>
      over
        ? t("board.announce.end", {
            title: titleOf(serverCards, active.id),
            stage: stageName(stages, stageOfCard(cards, String(over.id))),
          })
        : t("board.announce.cancel", { title: titleOf(serverCards, active.id) }),
    onDragCancel: ({ active }) => t("board.announce.cancel", { title: titleOf(serverCards, active.id) }),
  };

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onDragCancel={reset}
        accessibility={{
          announcements,
          screenReaderInstructions: { draggable: t("board.instructions") },
        }}
      >
        <div className="flex h-full gap-3">
          {columns.map((column) => (
            <BoardColumn
              key={column.stage.id}
              stage={column.stage}
              cards={cards[column.stage.id] ?? []}
              totalValueAed={working ? totalOf(cards[column.stage.id] ?? []) : column.totalValueAed}
              collapsed={column.stage.type !== "open" && collapsed.has(column.stage.id)}
              onToggleCollapsed={() => toggle(column.stage.id)}
              isOver={activeCard !== null && overStageId === column.stage.id}
              isDragging={activeCard !== null}
              canDrag={canDrag}
            />
          ))}
        </div>
        <DragOverlay dropAnimation={dropAnimation}>
          {activeCard ? <DealCardView card={activeCard} lifted className="cursor-grabbing" /> : null}
        </DragOverlay>
      </DndContext>
      {dialogs}
    </>
  );
}

function titleOf(cards: CardsByStage, id: UniqueIdentifier): string {
  return (
    Object.values(cards)
      .flat()
      .find((c) => c.id === id)?.title ?? ""
  );
}

function stageName(stages: Array<{ id: string; name: string }>, id: string | null): string {
  return stages.find((s) => s.id === id)?.name ?? "";
}

function totalOf(cards: DealCard[]): string {
  return sumMoney(cards.map((c) => c.valueAed));
}
