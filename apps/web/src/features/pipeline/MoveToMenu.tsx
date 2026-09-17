import type { Stage } from "@hco/shared";
import { ArrowRightLeft, Check, CircleX, Trophy } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { MoveDeal } from "./useStageMove";

/** "Move to…" menu: every stage, with won and lost set apart. Closed deals can only be reopened. */
export function MoveToMenu({
  deal,
  stages,
  canReopen,
  onMove,
  compact = false,
  className,
}: {
  deal: MoveDeal;
  stages: Stage[];
  canReopen: boolean;
  onMove: (stage: Stage) => void;
  /** Icon-only trigger for tight spaces. */
  compact?: boolean;
  className?: string;
}) {
  const { t } = useTranslation("pipeline");
  const isClosed = deal.stageType !== "open";
  const open = stages.filter((s) => s.type === "open");
  const closed = stages.filter((s) => s.type !== "open");
  const label = t("moveTo.trigger");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {compact ? (
          <Button
            variant="ghost"
            size="icon-sm"
            data-tour="move-to"
            aria-label={t("moveTo.triggerFor", { title: deal.title })}
            className={cn("relative z-10 size-7 text-muted-foreground", className)}
          >
            <ArrowRightLeft className="size-3.5" />
          </Button>
        ) : (
          <Button variant="outline" size="sm" data-tour="move-to" className={cn("relative z-10", className)}>
            <ArrowRightLeft />
            {label}
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          {isClosed && !canReopen ? t("moveTo.reopenNotAllowed") : isClosed ? t("moveTo.reopenTo") : label}
        </DropdownMenuLabel>
        {open.map((stage) => (
          <DropdownMenuItem
            key={stage.id}
            disabled={stage.id === deal.stageId || (isClosed && !canReopen)}
            onSelect={() => onMove(stage)}
          >
            <span className="min-w-0 flex-1 truncate">{stage.name}</span>
            {stage.id === deal.stageId ? <Check className="size-4" aria-label={t("moveTo.current")} /> : null}
            <span className="text-xs text-muted-foreground tabular-nums">{stage.probability}%</span>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        {closed.map((stage) => (
          <DropdownMenuItem
            key={stage.id}
            disabled={isClosed}
            onSelect={() => onMove(stage)}
            className={cn(
              stage.type === "won" && "text-success focus:bg-success-soft focus:text-success",
              stage.type === "lost" && "text-destructive focus:bg-danger-soft focus:text-destructive",
            )}
          >
            {stage.type === "won" ? (
              <Trophy className="size-4 text-success" />
            ) : (
              <CircleX className="size-4 text-destructive" />
            )}
            <span className="min-w-0 flex-1 truncate">
              {stage.type === "won" ? t("moveTo.markWon", { stage: stage.name }) : t("moveTo.markLost")}
            </span>
            {stage.id === deal.stageId ? <Check className="size-4" aria-label={t("moveTo.current")} /> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
