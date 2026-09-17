import { dashboardInsights, type Insight } from "@hco/core/reports/index";
import type { DashboardSummary } from "@hco/shared/api/dashboard";
import { Link } from "@tanstack/react-router";
import { Inbox, Snowflake, TrendingDown, Trophy, type LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { sourceColorClass } from "@/components/app/SourceBadge";
import { Button } from "@/components/ui/button";
import { formatAed } from "@/lib/format";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";

function useInsightText() {
  const { t } = useTranslation("dashboard");
  const { t: tc } = useTranslation();
  const { workspace } = useSession();
  return (insight: Insight): string => {
    switch (insight.kind) {
      case "source_without_deals":
        return t("insights.sourceWithoutDeals", {
          source: tc(`sources.${insight.source}`),
          count: insight.leads,
        });
      case "best_source":
        return t(insight.won > 0 ? "insights.bestSourceWon" : "insights.bestSource", {
          source: tc(`sources.${insight.source}`),
          count: insight.deals,
          leads: insight.leads,
          won: insight.won,
        });
      case "stale_deals":
        return t("insights.staleDeals", {
          count: insight.count,
          value: formatAed(insight.valueAed, { compact: true }),
          days: workspace.staleAfterDays,
        });
      case "funnel_drop":
        return t("insights.funnelDrop", {
          pct: insight.conversionPct,
          from: insight.fromStage,
          to: insight.toStage,
        });
      case "won_this_month":
        return t("insights.wonThisMonth", {
          count: insight.count,
          value: formatAed(insight.valueAed, { compact: true }),
        });
      case "no_leads":
        return t("insights.noLeads");
    }
  };
}

function Marker({ insight }: { insight: Insight }) {
  if (insight.kind === "source_without_deals" || insight.kind === "best_source") {
    return (
      <span className="flex size-7 items-center justify-center rounded-full bg-muted">
        <span className={cn("size-2.5 rounded-full", sourceColorClass(insight.source))} />
      </span>
    );
  }
  const icons: Record<Exclude<Insight["kind"], "source_without_deals" | "best_source">, LucideIcon> = {
    stale_deals: Snowflake,
    funnel_drop: TrendingDown,
    won_this_month: Trophy,
    no_leads: Inbox,
  };
  const Icon = icons[insight.kind];
  return (
    <span
      className={cn(
        "flex size-7 items-center justify-center rounded-full",
        insight.kind === "stale_deals" ? "bg-warning-soft text-warning" : "bg-accent text-accent-foreground",
      )}
    >
      <Icon className="size-3.5" />
    </span>
  );
}

/** Plain statements picked from the numbers by fixed rules, the first one set as the headline. */
export function StandsOut({ summary, className }: { summary: DashboardSummary; className?: string }) {
  const { t } = useTranslation("dashboard");
  const text = useInsightText();
  const insights = dashboardInsights(summary);
  const [headline, ...rest] = insights;

  return (
    <section
      aria-labelledby="stands-out"
      className={cn("flex flex-col rounded-xl border bg-card p-4 sm:p-6", className)}
    >
      <h2 id="stands-out" className="text-sm font-medium text-muted-foreground">
        {t("insights.title")}
      </h2>
      {headline ? (
        <div className="mt-3 flex items-start gap-3">
          <span className="mt-0.5 shrink-0 sm:mt-1">
            <Marker insight={headline} />
          </span>
          <p className="text-xl leading-snug font-semibold tracking-tight text-balance sm:text-2xl">
            {text(headline)}
          </p>
        </div>
      ) : null}
      {rest.length ? (
        <ul className="mt-4 flex flex-col gap-3 border-t pt-4">
          {rest.map((insight) => (
            <li key={insight.kind} className="flex items-start gap-3">
              <span className="shrink-0">
                <Marker insight={insight} />
              </span>
              <p className="pt-1 text-sm leading-relaxed text-pretty sm:text-[15px]">{text(insight)}</p>
            </li>
          ))}
        </ul>
      ) : null}
      {headline?.kind === "no_leads" ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button asChild size="sm">
            <Link to="/settings/channels">{t("insights.connectChannels")}</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link to="/leads">{t("insights.openLeads")}</Link>
          </Button>
        </div>
      ) : (
        <p className="mt-auto pt-5 text-xs text-muted-foreground">
          {t("insights.footnote", { count: summary.periodDays })}
        </p>
      )}
    </section>
  );
}
