import type { BoardColumn } from "@hco/shared/api/pipeline";
import { Link } from "@tanstack/react-router";
import { CircleX, Trophy } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Money } from "@/components/app/Money";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import type { BoardInput } from "./board-state";
import { DealCardView } from "./DealCardView";
import { MoveToMenu } from "./MoveToMenu";
import { useStageMove } from "./useStageMove";

/** Phones get no drag: a stage switcher, one column as a list, and "Move to…" on every card. */
export function MobilePipeline({ columns, boardInput }: { columns: BoardColumn[]; boardInput: BoardInput }) {
  const { t } = useTranslation("pipeline");
  const { user } = useSession();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { request, dialogs } = useStageMove({ boardInput });
  const stages = columns.map((c) => c.stage);
  const selected = columns.find((c) => c.stage.id === selectedId) ?? columns[0];
  if (!selected) return null;

  return (
    <div className="flex flex-col gap-3">
      <div
        role="tablist"
        aria-label={t("mobile.stagesLabel")}
        data-tour="stage-tabs"
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:-mx-6 sm:px-6"
      >
        {columns.map((column) => {
          const active = column.stage.id === selected.stage.id;
          return (
            <button
              key={column.stage.id}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls="pipeline-stage-list"
              onClick={() => setSelectedId(column.stage.id)}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-sm whitespace-nowrap transition-colors outline-none",
                "focus-visible:ring-[3px] focus-visible:ring-ring/50",
                active && "border-primary bg-primary text-primary-foreground",
                !active && column.stage.type === "won" && "border-success/30 text-success",
                !active && column.stage.type === "lost" && "text-muted-foreground",
              )}
            >
              {column.stage.type === "won" ? <Trophy className="size-3.5" aria-hidden="true" /> : null}
              {column.stage.type === "lost" ? <CircleX className="size-3.5" aria-hidden="true" /> : null}
              {column.stage.name}
              <span
                className={cn(
                  "rounded-full px-1.5 text-xs tabular-nums",
                  active ? "bg-primary-foreground/20" : "bg-muted text-muted-foreground",
                )}
              >
                {column.count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex items-baseline justify-between gap-2 px-0.5 text-sm">
        <Money value={selected.totalValueAed} className="font-semibold" />
        {selected.stage.type === "open" ? (
          <span className="text-xs text-muted-foreground">
            {t("board.probabilityHint", { value: selected.stage.probability })}
          </span>
        ) : null}
      </div>

      <ul id="pipeline-stage-list" role="tabpanel" className="flex flex-col gap-2">
        {selected.deals.map((card) => (
          <li key={card.id} className="relative" data-tour="deal-card">
            <DealCardView
              card={card}
              actions={
                <MoveToMenu
                  compact
                  deal={card}
                  stages={stages}
                  canReopen={user.role !== "rep"}
                  onMove={(stage) =>
                    request({ deal: card, to: stage, placement: { index: 0 }, announce: true })
                  }
                />
              }
            />
            <Link
              to="/deals/$dealId"
              params={{ dealId: card.id }}
              aria-label={card.title}
              className="absolute inset-0 rounded-lg outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            />
          </li>
        ))}
        {selected.deals.length === 0 ? (
          <li className="rounded-lg border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
            {t("mobile.emptyStage", { stage: selected.stage.name })}
          </li>
        ) : null}
      </ul>
      {dialogs}
    </div>
  );
}
