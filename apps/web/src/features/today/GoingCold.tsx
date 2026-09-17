import { daysIdle } from "@hco/core/reports/index";
import type { DealCard } from "@hco/shared/api/pipeline";
import { Link } from "@tanstack/react-router";
import { ChevronRight, Snowflake } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Money } from "@/components/app/Money";
import { SourceBadge } from "@/components/app/SourceBadge";
import { ShowMoreButton, TodaySection, useCollapsedList } from "./TodaySection";

/** Open deals with no activity for the workspace's stale threshold, idle longest first. */
export function GoingCold({
  deals,
  now,
  showAssignee,
  className,
}: {
  deals: DealCard[];
  now: Date;
  showAssignee: boolean;
  className?: string;
}) {
  const { t } = useTranslation("dashboard");
  const { t: tc } = useTranslation();
  const list = useCollapsedList(deals);

  return (
    <TodaySection
      id="cold"
      icon={Snowflake}
      tone="attention"
      title={t("today.cold.title")}
      count={deals.length}
      className={className}
    >
      <ul className="divide-y">
        {list.visible.map((deal) => (
          <li key={deal.id}>
            <Link
              to="/deals/$dealId"
              params={{ dealId: deal.id }}
              className="group flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
            >
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-3">
                  <span className="line-clamp-2 text-sm font-medium">{deal.title}</span>
                  <Money value={deal.valueAed} className="shrink-0 text-sm font-semibold" />
                </span>
                <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                  <span>{deal.stageName}</span>
                  <SourceBadge source={deal.source} />
                  {showAssignee ? <span>{deal.assigneeName ?? tc("states.unassigned")}</span> : null}
                </span>
                <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-warning-soft px-2 py-0.5 text-xs font-medium text-warning">
                  <Snowflake className="size-3" aria-hidden="true" />
                  {t("today.cold.idle", { count: daysIdle(deal.lastActivityAt, now) })}
                </span>
              </span>
              <ChevronRight
                className="mt-1 size-4 shrink-0 text-muted-foreground rtl:rotate-180"
                aria-hidden="true"
              />
            </Link>
          </li>
        ))}
      </ul>
      <ShowMoreButton hidden={list.hidden} onClick={list.expand} />
    </TodaySection>
  );
}
