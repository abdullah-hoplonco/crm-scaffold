import type { DashboardSummary } from "@hco/shared/api/dashboard";
import { ArrowDown, KanbanSquare, Trophy, XCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { EmptyState } from "@/components/app/States";
import { formatAed } from "@/lib/format";
import { barWidth, stageFill } from "./chart-colors";
import { Panel } from "./Panel";

/**
 * How far the deals created in the period got. Bars show deals that reached each stage (or went
 * further); between stages, the share that moved on. Lost deals sit underneath, apart from progress.
 */
export function StageFunnel({ summary, className }: { summary: DashboardSummary; className?: string }) {
  const { t } = useTranslation("dashboard");
  const progress = summary.funnel.filter((s) => s.type !== "lost");
  const lost = summary.funnel.find((s) => s.type === "lost");
  const started = progress[0]?.reachedCount ?? 0;
  const max = Math.max(0, ...progress.map((s) => s.reachedCount));

  return (
    <Panel
      id="stage-funnel"
      title={t("funnel.title")}
      scope={t("scope.createdInPeriod", { count: summary.periodDays })}
      className={className}
    >
      {started === 0 && max === 0 ? (
        <EmptyState
          icon={KanbanSquare}
          title={t("funnel.emptyTitle", { count: summary.periodDays })}
          description={t("funnel.emptyDescription")}
          className="flex-1 py-8"
        />
      ) : (
        <>
          <ol className="flex flex-col gap-3">
            {progress.map((stage, index) => {
              const next = progress[index + 1];
              return (
                <li key={stage.stageId}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="flex min-w-0 items-center gap-1.5 text-sm font-medium">
                      {stage.type === "won" ? (
                        <Trophy className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
                      ) : null}
                      <span className="truncate">{stage.name}</span>
                    </span>
                    <span className="text-sm font-semibold tabular-nums">
                      {t("funnel.reached", { count: stage.reachedCount })}
                    </span>
                  </div>
                  <div className="mt-1.5 h-3">
                    <div
                      className="h-full rounded-e-[4px]"
                      style={{
                        width: barWidth(stage.reachedCount, max),
                        backgroundColor: stageFill(index, progress.length),
                      }}
                    />
                  </div>
                  <div className="mt-1 flex flex-wrap items-baseline justify-between gap-x-3 text-xs text-muted-foreground tabular-nums">
                    <span>
                      {t(stage.type === "won" ? "funnel.wonNow" : "funnel.inStageNow", {
                        count: stage.count,
                        value: formatAed(stage.valueAed, { compact: true }),
                      })}
                    </span>
                    {next && next.conversionPct !== null ? (
                      <span className="inline-flex items-center gap-1 font-medium text-foreground/80">
                        <ArrowDown className="size-3" aria-hidden="true" />
                        {t("funnel.movedOn", { pct: next.conversionPct, stage: next.name })}
                      </span>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ol>
          {lost ? (
            <p className="mt-4 flex items-center gap-2 border-t pt-3 text-sm text-muted-foreground">
              <XCircle className="size-4 shrink-0" aria-hidden="true" />
              <span>{t("funnel.lost", { count: lost.reachedCount, started, name: lost.name })}</span>
            </p>
          ) : null}
        </>
      )}
    </Panel>
  );
}
