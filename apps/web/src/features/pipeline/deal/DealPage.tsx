import { api } from "@hco/shared";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ErrorState } from "@/components/app/States";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DealQuotesPanel } from "@/features/quotes/DealQuotesPanel";
import { TaskList } from "@/features/timeline/TaskList";
import { Timeline } from "@/features/timeline/Timeline";
import { useApiQuery } from "@/lib/api/hooks";
import { useMediaQuery } from "../useMediaQuery";
import { useStageMove } from "../useStageMove";
import { DealHeader } from "./DealHeader";
import { DealSidePanel } from "./DealSidePanel";

export function DealPage({ dealId }: { dealId: string }) {
  const { t } = useTranslation("pipeline");
  const query = useApiQuery(api.pipeline.get, { params: { dealId } });
  const { request, dialogs } = useStageMove();
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  if (query.isPending) return <DealSkeleton />;
  if (query.isError) {
    return (
      <div className="flex flex-col items-center">
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        <Button asChild variant="link">
          <Link to="/pipeline">{t("deal.backToPipeline")}</Link>
        </Button>
      </div>
    );
  }

  const detail = query.data;
  const subject = { dealId: detail.deal.id };
  const openTasks = detail.card.openTasksCount;

  return (
    <div className="min-h-full">
      <DealHeader
        detail={detail}
        onMove={(stage, options) => request({ deal: detail.card, to: stage, announce: options?.announce })}
      />

      {isDesktop ? (
        <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_320px] items-start gap-6 px-8 py-6">
          <div className="flex min-w-0 flex-col gap-6">
            <div className="grid items-start gap-6 xl:grid-cols-2">
              <Section title={t("deal.tasks")} count={openTasks}>
                <TaskList subject={subject} />
              </Section>
              {/* The panel carries its own heading, count and "New quote" action. */}
              <DealQuotesPanel dealId={detail.deal.id} />
            </div>
            <Section title={t("deal.timeline")}>
              <Timeline subject={subject} allowCompose />
            </Section>
          </div>
          <aside aria-label={t("deal.details")} className="sticky top-6">
            <DealSidePanel detail={detail} />
          </aside>
        </div>
      ) : (
        <Tabs defaultValue="timeline" className="gap-0">
          <div className="sticky top-0 z-10 border-b bg-background px-4 py-2 sm:px-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="timeline">{t("deal.timeline")}</TabsTrigger>
              <TabsTrigger value="tasks">
                {t("deal.tasks")}
                {openTasks > 0 ? (
                  <span className="text-xs text-muted-foreground tabular-nums">{openTasks}</span>
                ) : null}
              </TabsTrigger>
              <TabsTrigger value="quotes">{t("deal.quotes")}</TabsTrigger>
              <TabsTrigger value="details">{t("deal.details")}</TabsTrigger>
            </TabsList>
          </div>
          <div className="px-4 py-4 sm:px-6">
            <TabsContent value="timeline">
              <Timeline subject={subject} allowCompose />
            </TabsContent>
            <TabsContent value="tasks">
              <TaskList subject={subject} />
            </TabsContent>
            <TabsContent value="quotes">
              <DealQuotesPanel dealId={detail.deal.id} />
            </TabsContent>
            <TabsContent value="details">
              <DealSidePanel detail={detail} />
            </TabsContent>
          </div>
        </Tabs>
      )}
      {dialogs}
    </div>
  );
}

function Section({ title, count, children }: { title: string; count?: number; children: ReactNode }) {
  return (
    <section className="flex min-w-0 flex-col gap-3">
      <h2 className="flex items-center gap-2 text-base font-semibold">
        {title}
        {count ? (
          <span className="rounded-full bg-card px-1.5 text-xs font-medium text-muted-foreground tabular-nums shadow-[inset_0_0_0_1px_var(--border)]">
            {count}
          </span>
        ) : null}
      </h2>
      {children}
    </section>
  );
}

function DealSkeleton() {
  return (
    <div aria-busy="true" aria-live="polite">
      <div className="border-b bg-card">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-2/3 max-w-lg" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-8 w-full" />
          <div className="flex gap-6">
            <Skeleton className="h-10 w-28" />
            <Skeleton className="h-10 w-40" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
      </div>
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:px-8">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
        <Skeleton className="h-64 w-full max-lg:hidden" />
      </div>
    </div>
  );
}
