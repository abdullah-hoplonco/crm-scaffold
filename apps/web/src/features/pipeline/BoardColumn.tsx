import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { Stage } from "@hco/shared";
import type { DealCard } from "@hco/shared/api/pipeline";
import { ChevronsLeftRight, ChevronsRightLeft, CircleX, Trophy } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Money } from "@/components/app/Money";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { SortableDealCard } from "./SortableDealCard";

export interface ColumnProps {
  stage: Stage;
  cards: DealCard[];
  totalValueAed: string;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  /** A card is being dragged over this column. */
  isOver: boolean;
  isDragging: boolean;
  canDrag: (card: DealCard) => boolean;
}

const LANE: Record<Stage["type"], { body: string; over: string; track: string }> = {
  open: { body: "bg-muted/70", over: "bg-accent ring-primary/35", track: "bg-primary" },
  won: { body: "bg-success-soft/70", over: "bg-success-soft ring-success/45", track: "bg-success" },
  lost: { body: "bg-danger-soft/45", over: "bg-danger-soft ring-destructive/40", track: "bg-destructive/60" },
};

export function BoardColumn(props: ColumnProps) {
  return props.collapsed ? <CollapsedColumn {...props} /> : <ExpandedColumn {...props} />;
}

function StageIcon({ type }: { type: Stage["type"] }) {
  if (type === "won") return <Trophy className="size-3.5 shrink-0 text-success" aria-hidden="true" />;
  if (type === "lost") return <CircleX className="size-3.5 shrink-0 text-destructive" aria-hidden="true" />;
  return null;
}

function ExpandedColumn({
  stage,
  cards,
  totalValueAed,
  onToggleCollapsed,
  isOver,
  isDragging,
  canDrag,
}: ColumnProps) {
  const { t } = useTranslation("pipeline");
  const { setNodeRef } = useDroppable({ id: stage.id, data: { type: "column" } });
  const ids = useMemo(() => cards.map((c) => c.id), [cards]);
  const lane = LANE[stage.type];
  const headingId = `stage-${stage.id}`;

  return (
    <section
      aria-labelledby={headingId}
      data-tour={stage.type === "open" ? "stage-open" : `stage-${stage.type}`}
      className={cn(
        "flex h-full min-w-[232px] flex-1 flex-col",
        stage.type === "open" ? "max-w-[360px]" : "max-w-[300px]",
      )}
    >
      <header className="px-1.5 pb-2.5">
        <div className="flex items-center gap-2">
          <StageIcon type={stage.type} />
          <h2 id={headingId} className="min-w-0 truncate text-sm font-semibold">
            {stage.name}
          </h2>
          <span className="rounded-full bg-card px-1.5 text-xs font-medium text-muted-foreground tabular-nums shadow-[inset_0_0_0_1px_var(--border)]">
            {cards.length}
          </span>
          {stage.type !== "open" ? (
            <Button
              variant="ghost"
              size="icon-xs"
              className="ms-auto text-muted-foreground"
              onClick={onToggleCollapsed}
              aria-label={t("board.collapse", { stage: stage.name })}
            >
              <ChevronsRightLeft />
            </Button>
          ) : null}
        </div>
        <div className="mt-1 flex items-baseline justify-between gap-2">
          <Money value={totalValueAed} className="text-sm font-medium text-foreground/80" />
          {stage.type === "open" ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {t("board.probability", { value: stage.probability })}
                </span>
              </TooltipTrigger>
              <TooltipContent>{t("board.probabilityHint", { value: stage.probability })}</TooltipContent>
            </Tooltip>
          ) : null}
        </div>
        {/* How likely deals here are to close, as a thin fill: the board reads as a rising tide. */}
        <div className="mt-2 h-[3px] overflow-hidden rounded-full bg-border/70" aria-hidden="true">
          <div
            className={cn("h-full rounded-full", lane.track)}
            style={{ width: `${stage.type === "lost" ? 100 : stage.probability}%` }}
          />
        </div>
      </header>

      <div
        ref={setNodeRef}
        className={cn(
          "min-h-0 flex-1 overflow-y-auto rounded-xl p-1.5 ring-0 transition-[background-color,box-shadow] duration-150 ring-inset",
          lane.body,
          isOver && ["ring-2", lane.over],
        )}
      >
        <SortableContext id={stage.id} items={ids} strategy={verticalListSortingStrategy}>
          <ul className="flex min-h-full flex-col gap-2 pb-6">
            {cards.map((card) => (
              <SortableDealCard key={card.id} card={card} disabled={!canDrag(card)} />
            ))}
            {cards.length === 0 ? (
              <li
                className={cn(
                  "flex h-24 items-center justify-center rounded-lg border border-dashed border-foreground/15 px-4 text-center text-xs text-muted-foreground",
                  isDragging && "border-primary/40 text-foreground/70",
                )}
              >
                {isDragging ? t("board.dropHere") : t("board.emptyStage")}
              </li>
            ) : null}
          </ul>
        </SortableContext>
      </div>
    </section>
  );
}

function CollapsedColumn({ stage, cards, totalValueAed, onToggleCollapsed, isOver }: ColumnProps) {
  const { t } = useTranslation("pipeline");
  const { setNodeRef } = useDroppable({ id: stage.id, data: { type: "column" } });
  const lane = LANE[stage.type];

  return (
    <section
      aria-label={stage.name}
      data-tour={`stage-${stage.type}`}
      className="flex h-full w-16 shrink-0 flex-col"
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            ref={setNodeRef}
            type="button"
            onClick={onToggleCollapsed}
            aria-label={t("board.expand", { stage: stage.name, count: cards.length })}
            className={cn(
              "flex h-full flex-col items-center gap-2.5 rounded-xl border border-border/70 px-1 pt-3 pb-4 ring-0 transition-[background-color,border-color,box-shadow] duration-150 ring-inset outline-none",
              "hover:border-primary/40 focus-visible:ring-[3px] focus-visible:ring-ring/50",
              lane.body,
              isOver && ["ring-2", lane.over],
            )}
          >
            <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-card text-muted-foreground shadow-[inset_0_0_0_1px_var(--border)]">
              <ChevronsLeftRight className="size-3.5" aria-hidden="true" />
            </span>
            <StageIcon type={stage.type} />
            <span className="rounded-full bg-card px-1.5 text-xs font-medium text-muted-foreground tabular-nums shadow-[inset_0_0_0_1px_var(--border)]">
              {cards.length}
            </span>
            <span className="my-auto flex items-center gap-3 text-sm font-semibold whitespace-nowrap [writing-mode:vertical-rl]">
              {stage.name}
              <Money value={totalValueAed} compact className="text-xs font-medium text-muted-foreground" />
            </span>
            {isOver ? (
              <span className="mt-auto text-xs font-medium [writing-mode:vertical-rl]">
                {stage.type === "won" ? t("board.dropToWin") : t("board.dropToLose")}
              </span>
            ) : null}
          </button>
        </TooltipTrigger>
        <TooltipContent>{t("board.expand", { stage: stage.name, count: cards.length })}</TooltipContent>
      </Tooltip>
    </section>
  );
}
