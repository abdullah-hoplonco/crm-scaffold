import type { Stage } from "@hco/shared";
import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

/**
 * Open stages as a progress track. Clicking a stage moves the deal there; a closed deal shows the
 * whole track filled in its outcome colour and can't be moved from here.
 */
export function StageStepper({
  stages,
  current,
  onSelect,
  disabled,
}: {
  stages: Stage[];
  current: Stage;
  onSelect: (stage: Stage) => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation("pipeline");
  const open = stages.filter((s) => s.type === "open");
  const currentIndex = open.findIndex((s) => s.id === current.id);
  const closed = current.type !== "open";

  return (
    <ol aria-label={t("deal.stagesLabel")} className="grid auto-cols-fr grid-flow-col gap-1.5">
      {open.map((stage, index) => {
        const reached = closed ? current.type === "won" : index <= currentIndex;
        const isCurrent = stage.id === current.id;
        return (
          <li key={stage.id} className="min-w-0">
            <button
              type="button"
              disabled={disabled || isCurrent || closed}
              onClick={() => onSelect(stage)}
              aria-current={isCurrent ? "step" : undefined}
              title={isCurrent ? undefined : t("deal.moveToStage", { stage: stage.name })}
              className={cn(
                "group/step flex w-full flex-col gap-1.5 rounded-md pt-1 pb-1.5 text-start outline-none",
                "focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-default",
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "h-1.5 w-full rounded-full transition-colors",
                  closed
                    ? current.type === "won"
                      ? "bg-success"
                      : "bg-destructive/25"
                    : reached
                      ? "bg-primary"
                      : "bg-border group-enabled/step:group-hover/step:bg-primary/35",
                )}
              />
              <span
                className={cn(
                  "flex items-center gap-1 truncate text-xs",
                  isCurrent ? "font-semibold text-foreground" : "text-muted-foreground",
                  !closed && !isCurrent && "group-enabled/step:group-hover/step:text-foreground",
                )}
              >
                {!closed && index < currentIndex ? (
                  <Check className="size-3 shrink-0 text-primary" aria-hidden="true" />
                ) : null}
                <span className="truncate">{stage.name}</span>
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
