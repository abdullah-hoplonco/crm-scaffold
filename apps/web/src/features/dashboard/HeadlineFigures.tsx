import { money } from "@hco/core";
import type { DashboardSummary } from "@hco/shared/api/dashboard";
import { Snowflake } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatAed } from "@/lib/format";
import { cn } from "@/lib/utils";
import { primaryFill } from "./chart-colors";

function share(part: string, whole: string): number {
  const total = money(whole);
  if (total.lte(0)) return 0;
  return Math.min(100, Number(money(part).div(total).times(100).toFixed(1)));
}

/** Open pipeline as the one hero figure, with won this month and open deals beside it. */
export function HeadlineFigures({ summary, className }: { summary: DashboardSummary; className?: string }) {
  const { t } = useTranslation("dashboard");
  const weightedShare = share(summary.weightedPipelineAed, summary.openPipelineAed);
  const stale = summary.staleDeals?.count ?? 0;

  return (
    <section
      aria-label={t("figures.label")}
      data-tour="dashboard-headline"
      className={cn(
        "grid grid-cols-2 overflow-hidden rounded-xl border bg-card md:grid-cols-[2fr_1fr_1fr] xl:grid-cols-2",
        className,
      )}
    >
      <div className="col-span-2 flex flex-col p-4 sm:p-6 md:col-span-1 xl:col-span-2">
        <p className="text-sm text-muted-foreground">{t("figures.openPipeline")}</p>
        <p className="mt-1 text-4xl font-semibold tracking-tight sm:text-5xl">
          {formatAed(summary.openPipelineAed, { compact: true })}
        </p>
        <div
          className="mt-4 h-2 overflow-hidden rounded-full"
          style={{ backgroundColor: primaryFill(18) }}
          role="meter"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={weightedShare}
          aria-label={t("figures.weightedMeter", { pct: Math.round(weightedShare) })}
        >
          <div
            className="h-full rounded-full"
            style={{ width: `${weightedShare}%`, backgroundColor: primaryFill() }}
          />
        </div>
        <p className="mt-2 text-sm">
          <span className="font-semibold">{formatAed(summary.weightedPipelineAed, { compact: true })}</span>{" "}
          <span className="text-muted-foreground">{t("figures.weightedHint")}</span>
        </p>
      </div>

      <div className="flex flex-col border-t p-4 sm:px-6 sm:py-5 md:py-6 xl:py-5 md:border-t-0 md:border-s xl:border-t xl:border-s-0">
        <p className="text-sm text-muted-foreground">{t("figures.wonThisMonth")}</p>
        <p className="mt-1 text-2xl font-semibold tracking-tight">
          {formatAed(summary.wonThisMonth.valueAed, { compact: true })}
        </p>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {t("figures.wonDeals", { count: summary.wonThisMonth.count })}
        </p>
      </div>

      <div className="flex flex-col border-t border-s p-4 sm:px-6 sm:py-5 md:py-6 xl:py-5 md:border-t-0 xl:border-t">
        <p className="text-sm text-muted-foreground">{t("figures.openDeals")}</p>
        <p className="mt-1 text-2xl font-semibold tracking-tight">{summary.openDealsCount}</p>
        {stale > 0 ? (
          <p className="mt-0.5 flex items-center gap-1.5 text-sm font-medium text-warning">
            <Snowflake className="size-3.5" aria-hidden="true" />
            {t("figures.goingCold", { count: stale })}
          </p>
        ) : (
          <p className="mt-0.5 text-sm text-muted-foreground">
            {summary.openDealsCount > 0 ? t("figures.allMoving") : t("figures.noOpenDeals")}
          </p>
        )}
      </div>
    </section>
  );
}
