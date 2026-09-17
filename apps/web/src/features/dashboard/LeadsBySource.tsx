import type { LeadSource } from "@hco/shared";
import type { DashboardSummary } from "@hco/shared/api/dashboard";
import { UserPlus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { sourceColorClass } from "@/components/app/SourceBadge";
import { EmptyState } from "@/components/app/States";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { barWidth, inkFill, sourceFill, type SourceStep } from "./chart-colors";
import { Panel } from "./Panel";

type SourceRow = DashboardSummary["leadsBySource"][number];

function rate(row: SourceRow): number {
  return row.leads > 0 ? Math.round((row.deals / row.leads) * 100) : 0;
}

function SourceName({ source }: { source: LeadSource }) {
  const { t } = useTranslation();
  return (
    <span className="flex min-w-0 items-center gap-2 text-sm font-medium">
      <span className={cn("size-2.5 shrink-0 rounded-full", sourceColorClass(source))} aria-hidden="true" />
      <span className="truncate">{t(`sources.${source}`)}</span>
    </span>
  );
}

/**
 * One bar per source, as long as its lead count. The bar is split into won deals, other deals and
 * leads that never became a deal, in three tints of the channel colour with a 2px gap between them.
 */
function SourceBar({ row, max }: { row: SourceRow; max: number }) {
  const { t } = useTranslation("dashboard");
  const { t: tc } = useTranslation();
  const segments: Array<{ step: SourceStep; value: number }> = [
    { step: "won", value: row.won },
    { step: "deal", value: row.deals - row.won },
    { step: "noDeal", value: row.leads - row.deals },
  ];
  const summary = t("sources.rowSummary", {
    source: tc(`sources.${row.source}`),
    count: row.leads,
    deals: row.deals,
    won: row.won,
    pct: rate(row),
  });
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          tabIndex={0}
          aria-label={summary}
          className="flex h-6 w-full items-center rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <div className="flex h-3.5 gap-0.5" style={{ width: barWidth(row.leads, max) }}>
            {segments
              .filter((s) => s.value > 0)
              .map((s) => (
                <span
                  key={s.step}
                  className="h-full min-w-[3px] last:rounded-e-[4px]"
                  style={{ flexGrow: s.value, flexBasis: 0, backgroundColor: sourceFill(row.source, s.step) }}
                />
              ))}
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent side="top">{summary}</TooltipContent>
    </Tooltip>
  );
}

function Legend() {
  const { t } = useTranslation("dashboard");
  const items: Array<{ step: SourceStep; label: string }> = [
    { step: "won", label: t("sources.legendWon") },
    { step: "deal", label: t("sources.legendDeal") },
    { step: "noDeal", label: t("sources.legendNoDeal") },
  ];
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {items.map((item) => (
        <li key={item.step} className="flex items-center gap-1.5">
          <span
            className="h-2.5 w-3 rounded-[2px]"
            style={{ backgroundColor: inkFill(item.step) }}
            aria-hidden="true"
          />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

/** Leads → deals → won per source, most leads first, so volume and conversion read side by side. */
export function LeadsBySource({ summary, className }: { summary: DashboardSummary; className?: string }) {
  const { t } = useTranslation("dashboard");
  const rows = summary.leadsBySource.filter((r) => r.leads > 0);
  const max = Math.max(0, ...rows.map((r) => r.leads));
  const totals = rows.reduce(
    (sum, r) => ({ leads: sum.leads + r.leads, deals: sum.deals + r.deals, won: sum.won + r.won }),
    { leads: 0, deals: 0, won: 0 },
  );

  return (
    <Panel
      id="leads-by-source"
      title={t("sources.title")}
      scope={t("scope.period", { count: summary.periodDays })}
      className={className}
    >
      {rows.length === 0 ? (
        <EmptyState
          icon={UserPlus}
          title={t("sources.emptyTitle", { count: summary.periodDays })}
          description={t("sources.emptyDescription")}
          className="flex-1 py-8"
        />
      ) : (
        <>
          <Legend />

          {/* Wide screens: a table with the bar and every number in its own column. */}
          <table className="mt-3 mb-4 hidden w-full border-collapse text-sm sm:table">
            <thead>
              <tr className="text-xs text-muted-foreground">
                <th scope="col" className="w-28 pb-2 text-start font-normal">
                  {t("sources.colSource")}
                </th>
                <th scope="col" className="pb-2 text-start font-normal">
                  <span className="sr-only">{t("sources.colBar")}</span>
                </th>
                <th scope="col" className="w-14 pb-2 text-end font-normal">
                  {t("sources.colLeads")}
                </th>
                <th scope="col" className="w-14 pb-2 text-end font-normal">
                  {t("sources.colDeals")}
                </th>
                <th scope="col" className="w-12 pb-2 text-end font-normal">
                  {t("sources.colWon")}
                </th>
                <th scope="col" className="w-20 pb-2 text-end font-normal">
                  {t("sources.colRate")}
                </th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {rows.map((row) => (
                <tr key={row.source} className="border-t">
                  <th scope="row" className="py-3 pe-3 text-start font-normal">
                    <SourceName source={row.source} />
                  </th>
                  <td className="py-3 pe-3">
                    <SourceBar row={row} max={max} />
                  </td>
                  <td className="py-3 text-end font-semibold">{row.leads}</td>
                  <td className="py-3 text-end">{row.deals}</td>
                  <td className="py-3 text-end">{row.won}</td>
                  <td className={cn("py-3 text-end", row.deals === 0 && "text-muted-foreground")}>
                    {rate(row)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Phones: the bar on its own line with the numbers underneath. */}
          <ul className="mt-3 mb-4 flex flex-col sm:hidden">
            {rows.map((row) => (
              <li key={row.source} className="border-t py-3 first:border-t-0 first:pt-1">
                <div className="flex items-baseline justify-between gap-3">
                  <SourceName source={row.source} />
                  <span className="text-xs text-muted-foreground">
                    {t("sources.rateShort", { pct: rate(row) })}
                  </span>
                </div>
                <SourceBar row={row} max={max} />
                <p className="text-xs text-muted-foreground tabular-nums">
                  <span className="font-semibold text-foreground">
                    {t("sources.leadsCount", { count: row.leads })}
                  </span>
                  <span className="mx-2 text-border" aria-hidden="true">
                    |
                  </span>
                  {t("sources.dealsCount", { count: row.deals })}
                  <span className="mx-2 text-border" aria-hidden="true">
                    |
                  </span>
                  {t("sources.wonCount", { count: row.won })}
                </p>
              </li>
            ))}
          </ul>

          <p className="mt-auto flex flex-wrap items-baseline justify-between gap-x-3 border-t pt-3 text-sm">
            <span className="text-muted-foreground">{t("sources.totalLabel")}</span>
            <span className="font-medium tabular-nums">
              {t("sources.total", { leads: totals.leads, deals: totals.deals, won: totals.won })}
            </span>
          </p>
        </>
      )}
    </Panel>
  );
}
