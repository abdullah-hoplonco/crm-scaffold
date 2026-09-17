import { api } from "@hco/shared";
import { keepPreviousData } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/app/PageHeader";
import { ErrorState } from "@/components/app/States";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useApiQuery } from "@/lib/api/hooks";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import { HeadlineFigures } from "./HeadlineFigures";
import { LeadsBySource } from "./LeadsBySource";
import { PERIODS, type Period } from "./periods";
import { StageFunnel } from "./StageFunnel";
import { StandsOut } from "./StandsOut";
import { TeamActivity } from "./TeamActivity";

function PeriodToggle({ value, onChange }: { value: Period; onChange: (period: Period) => void }) {
  const { t } = useTranslation("dashboard");
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      size="sm"
      value={String(value)}
      onValueChange={(next) => {
        const period = PERIODS.find((p) => String(p) === next);
        if (period) onChange(period);
      }}
      aria-label={t("period.label")}
      className="bg-card"
    >
      {PERIODS.map((p) => (
        <ToggleGroupItem key={p} value={String(p)} className="px-3 data-[state=on]:font-semibold">
          {t("period.days", { count: p })}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

function DashboardSkeleton() {
  return (
    <div className="grid gap-4 lg:gap-5" aria-busy="true" aria-live="polite">
      <div className="grid gap-4 lg:grid-cols-12 lg:gap-5">
        <Skeleton className="h-52 lg:col-span-7" />
        <Skeleton className="h-52 lg:col-span-5" />
      </div>
      <div className="grid gap-4 lg:grid-cols-12 lg:gap-5">
        <Skeleton className="h-80 lg:col-span-7" />
        <Skeleton className="h-80 lg:col-span-5" />
      </div>
      <Skeleton className="h-56" />
    </div>
  );
}

/** Owner and manager view: the story first, then the figures behind it. */
export function DashboardPage({
  period,
  onPeriodChange,
}: {
  period: Period;
  onPeriodChange: (p: Period) => void;
}) {
  const { t } = useTranslation("dashboard");
  const { workspace } = useSession();
  const summary = useApiQuery(
    api.dashboard.summary,
    { query: { periodDays: period } },
    { placeholderData: keepPreviousData },
  );

  return (
    <div className="mx-auto w-full max-w-7xl">
      <PageHeader
        title={t("dashboard.title")}
        description={workspace.name}
        actions={<PeriodToggle value={period} onChange={onPeriodChange} />}
      />
      <div className="px-4 pb-8 sm:px-6 lg:px-8">
        {summary.isPending ? (
          <DashboardSkeleton />
        ) : summary.isError ? (
          <ErrorState
            error={summary.error}
            onRetry={() => void summary.refetch()}
            className="rounded-xl border bg-card"
          />
        ) : (
          <div
            className={cn(
              "grid gap-4 transition-opacity lg:gap-5",
              summary.isPlaceholderData && "pointer-events-none opacity-60",
            )}
            aria-busy={summary.isPlaceholderData}
          >
            <div className="grid gap-4 lg:grid-cols-12 lg:gap-5">
              <StandsOut summary={summary.data} className="lg:col-span-7" />
              <HeadlineFigures summary={summary.data} className="lg:col-span-5" />
            </div>
            <div className="grid gap-4 lg:grid-cols-12 lg:gap-5">
              <LeadsBySource summary={summary.data} className="lg:col-span-7" />
              <StageFunnel summary={summary.data} className="lg:col-span-5" />
            </div>
            <TeamActivity summary={summary.data} />
          </div>
        )}
      </div>
    </div>
  );
}
