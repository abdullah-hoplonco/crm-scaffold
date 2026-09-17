import { api } from "@hco/shared";
import { Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { Check, CheckCircle2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { EmptyState, ErrorState } from "@/components/app/States";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useApiQuery } from "@/lib/api/hooks";
import { inWorkspaceTz } from "@/lib/format";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import { GoingCold } from "./GoingCold";
import { TasksDue } from "./TasksDue";
import { greetingName, partOfDay, useNow } from "./time";
import { WaitingForReply } from "./WaitingForReply";

interface Counts {
  tasks: number;
  overdue: number;
  replies: number;
  cold: number;
}

/** Jump links under the greeting: what's waiting, or a quiet tick when a list is clear. */
function DaySummary({ counts }: { counts: Counts }) {
  const { t } = useTranslation("dashboard");
  const items = [
    {
      key: "tasks",
      href: "#tasks",
      count: counts.tasks,
      label: t("today.summary.tasks", { count: counts.tasks }),
      clear: t("today.summary.noTasks"),
    },
    {
      key: "replies",
      href: "#replies",
      count: counts.replies,
      label: t("today.summary.replies", { count: counts.replies }),
      clear: t("today.summary.noReplies"),
    },
    {
      key: "cold",
      href: "#cold",
      count: counts.cold,
      label: t("today.summary.cold", { count: counts.cold }),
      clear: t("today.summary.noCold"),
    },
  ];
  return (
    <ul className="mt-4 flex flex-wrap gap-2" aria-label={t("today.summary.label")}>
      {items.map((item) => (
        <li key={item.key}>
          {item.count > 0 ? (
            <a
              href={item.href}
              onClick={(event) => {
                const target = document.getElementById(item.key);
                if (!target) return;
                event.preventDefault();
                target.scrollIntoView({ behavior: "smooth", block: "start" });
                target.querySelector<HTMLElement>("a, button")?.focus({ preventScroll: true });
              }}
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-full border bg-card px-3 text-sm font-medium shadow-xs transition-colors hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                item.key === "cold" && "border-attention/50",
              )}
            >
              {item.label}
              {item.key === "tasks" && counts.overdue > 0 ? (
                <span className="rounded-full bg-danger-soft px-1.5 text-xs text-destructive">
                  {t("today.summary.overdue", { count: counts.overdue })}
                </span>
              ) : null}
            </a>
          ) : (
            <span className="inline-flex h-8 items-center gap-1.5 rounded-full px-2 text-sm text-muted-foreground">
              <Check className="size-3.5 text-success" aria-hidden="true" />
              {item.clear}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

function TodaySkeleton() {
  return (
    <div className="grid gap-4 xl:grid-cols-12 xl:items-start lg:gap-5" aria-busy="true" aria-live="polite">
      <Skeleton className="h-72 xl:col-span-7" />
      <div className="grid gap-4 xl:col-span-5 lg:gap-5">
        <Skeleton className="h-44" />
        <Skeleton className="h-36" />
      </div>
    </div>
  );
}

/** Everyone's home screen, built for a phone: what to do today, who is waiting, which deals are cooling. */
export function TodayPage() {
  const { t } = useTranslation("dashboard");
  const { user } = useSession();
  const now = useNow();
  const today = useApiQuery(api.dashboard.today, {});
  const showAssignee = user.role !== "rep";

  const data = today.data;
  const counts: Counts | null = data
    ? {
        tasks: data.tasksDue.length,
        overdue: data.tasksDue.filter((task) => new Date(task.dueAt) < now).length,
        replies: data.unansweredConversations.length,
        cold: data.staleDeals.length,
      }
    : null;
  const allClear = counts !== null && counts.tasks + counts.replies + counts.cold === 0;

  return (
    <div className="mx-auto w-full max-w-6xl">
      <header className="px-4 pt-6 pb-5 sm:px-6 lg:px-8 lg:pt-8">
        <p className="text-sm text-muted-foreground">{format(inWorkspaceTz(now), "EEEE d MMMM")}</p>
        <h1 className="mt-0.5 text-2xl font-semibold tracking-tight sm:text-3xl">
          {t(`today.greeting.${partOfDay(now)}`, { name: greetingName(user.name) })}
        </h1>
        {counts && !allClear ? <DaySummary counts={counts} /> : null}
      </header>

      <div className="px-4 pb-8 sm:px-6 lg:px-8">
        {today.isPending ? (
          <TodaySkeleton />
        ) : today.isError ? (
          <ErrorState
            error={today.error}
            onRetry={() => void today.refetch()}
            className="rounded-xl border bg-card"
          />
        ) : allClear || !data ? (
          <EmptyState
            icon={CheckCircle2}
            title={t("today.clear.title")}
            description={t("today.clear.description")}
            className="rounded-xl border bg-card py-16"
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link to="/leads">{t("today.clear.openLeads")}</Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link to="/pipeline">{t("today.clear.openPipeline")}</Link>
                </Button>
              </div>
            }
          />
        ) : (
          <div
            className={cn(
              "grid gap-4 xl:items-start lg:gap-5",
              data.tasksDue.length ? "xl:grid-cols-12" : "xl:grid-cols-2",
            )}
          >
            {data.tasksDue.length ? (
              <TasksDue
                tasks={data.tasksDue}
                now={now}
                showAssignee={showAssignee}
                className="xl:col-span-7"
              />
            ) : null}
            {data.unansweredConversations.length || data.staleDeals.length ? (
              <div
                className={cn(
                  "grid gap-4 lg:gap-5",
                  data.tasksDue.length ? "xl:col-span-5" : "xl:col-span-2 xl:grid-cols-2 xl:items-start",
                )}
              >
                {data.unansweredConversations.length ? (
                  <WaitingForReply
                    conversations={data.unansweredConversations}
                    now={now}
                    showAssignee={showAssignee}
                  />
                ) : null}
                {data.staleDeals.length ? (
                  <GoingCold deals={data.staleDeals} now={now} showAssignee={showAssignee} />
                ) : null}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
