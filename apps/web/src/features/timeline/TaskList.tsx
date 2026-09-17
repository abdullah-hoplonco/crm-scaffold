import { api } from "@hco/shared";
import type { TaskListItem } from "@hco/shared/api/timeline";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { AlarmClock, ChevronDown, ListChecks } from "lucide-react";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ErrorState, LoadingRows } from "@/components/app/States";
import { UserAvatar } from "@/components/app/UserAvatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { errorMessage } from "@/lib/api/errors";
import { apiKey, useApiMutation, useApiQuery } from "@/lib/api/hooks";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import { formatShortDate } from "@/features/pipeline/dates";
import { AddTaskForm } from "./AddTaskForm";
import { describeDue } from "./due";
import type { TimelineSubject } from "./Timeline";

/** Tasks about a lead, contact or deal: add with a due time, tick off, overdue ones stand out. */
export function TaskList({ subject }: { subject: TimelineSubject }) {
  const { t } = useTranslation("pipeline");
  const [showDone, setShowDone] = useState(false);
  const input = { query: subject };
  const query = useApiQuery(api.timeline.listTasks, input);
  const doneListId = useId();

  if (query.isPending) return <LoadingRows rows={3} className="p-0" />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;

  const open = query.data.items.filter((task) => task.status === "open");
  const done = query.data.items
    .filter((task) => task.status === "done")
    .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""));

  return (
    <div className="flex flex-col gap-3">
      <AddTaskForm subject={subject} />
      {open.length > 0 ? (
        <ul className="flex flex-col divide-y rounded-lg border bg-card" data-tour="task-list">
          {open.map((task) => (
            <TaskRow key={task.id} task={task} listInput={input} subject={subject} />
          ))}
        </ul>
      ) : (
        <p className="flex items-center gap-2 rounded-lg border border-dashed px-3 py-3 text-sm text-muted-foreground">
          <ListChecks className="size-4 shrink-0" aria-hidden="true" />
          {t("tasks.empty")}
        </p>
      )}
      {done.length > 0 ? (
        <div>
          <Button
            variant="ghost"
            size="sm"
            className="-ms-2 text-muted-foreground"
            aria-expanded={showDone}
            aria-controls={doneListId}
            onClick={() => setShowDone((v) => !v)}
          >
            <ChevronDown className={cn("transition-transform", showDone && "rotate-180")} />
            {showDone ? t("tasks.hideDone") : t("tasks.showDone", { count: done.length })}
          </Button>
          {showDone ? (
            <ul id={doneListId} className="mt-1 flex flex-col divide-y rounded-lg border bg-card/60">
              {done.map((task) => (
                <TaskRow key={task.id} task={task} listInput={input} subject={subject} />
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function TaskRow({
  task,
  listInput,
  subject,
}: {
  task: TaskListItem;
  listInput: { query: TimelineSubject };
  subject: TimelineSubject;
}) {
  const { t } = useTranslation("pipeline");
  const { user } = useSession();
  const queryClient = useQueryClient();
  const checkboxId = useId();
  const key = apiKey(api.timeline.listTasks, listInput);

  const update = useApiMutation(api.timeline.updateTask, {
    onMutate: async ({ body }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<{ items: TaskListItem[] }>(key);
      const status = body?.status;
      if (previous && status) {
        queryClient.setQueryData(key, {
          items: previous.items.map((item) =>
            item.id === task.id
              ? {
                  ...item,
                  status,
                  completedAt: status === "done" ? new Date().toISOString() : null,
                  isOverdue: status === "done" ? false : item.isOverdue,
                }
              : item,
          ),
        });
      }
      return { previous };
    },
    onError: (error, _input, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
      toast.error(t("tasks.updateFailed"), { description: errorMessage(error) });
    },
  });

  const isDone = task.status === "done";
  const due = describeDue(task.dueAt, {
    overdueDays: (count) => t("tasks.overdueDays", { count }),
    overdueFor: (duration) => t("tasks.overdueFor", { duration }),
    today: (time) => t("tasks.dueToday", { time }),
    tomorrow: (time) => t("tasks.dueTomorrow", { time }),
  });
  const showSubject = task.subjectHref && task.dealId !== subject.dealId && task.subjectLabel;

  const toggle = (checked: boolean) => {
    const status = checked ? "done" : "open";
    update.mutate(
      { params: { taskId: task.id }, body: { status } },
      {
        onSuccess: () => {
          if (status === "done") {
            toast.success(t("tasks.completed"), {
              description: task.title,
              action: {
                label: t("tasks.undo"),
                onClick: () => update.mutate({ params: { taskId: task.id }, body: { status: "open" } }),
              },
            });
          }
        },
      },
    );
  };

  return (
    <li className="flex items-start gap-3 px-3 py-2.5">
      <Checkbox
        id={checkboxId}
        checked={isDone}
        onCheckedChange={(checked) => toggle(checked === true)}
        className="mt-0.5 size-[18px] rounded-full data-[state=checked]:border-success data-[state=checked]:bg-success"
        aria-label={
          isDone ? t("tasks.markOpen", { title: task.title }) : t("tasks.markDone", { title: task.title })
        }
      />
      <div className="min-w-0 flex-1">
        <label
          htmlFor={checkboxId}
          className={cn("block text-sm leading-snug", isDone && "text-muted-foreground line-through")}
        >
          {task.title}
        </label>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
          {isDone ? (
            <span>
              {task.completedAt
                ? t("tasks.doneOn", { date: formatShortDate(task.completedAt) })
                : t("tasks.done")}
            </span>
          ) : (
            <span
              className={cn(
                "inline-flex items-center gap-1 tabular-nums",
                due.kind === "overdue" && "font-medium text-destructive",
                due.kind === "today" && "font-medium text-[#7A5200]",
              )}
            >
              <AlarmClock className="size-3" aria-hidden="true" />
              {due.text}
            </span>
          )}
          {task.origin !== "manual" ? (
            <span className="rounded-full bg-muted px-1.5 leading-4">{t(`tasks.origin.${task.origin}`)}</span>
          ) : null}
          {showSubject && task.subjectHref ? (
            <Link to={task.subjectHref} className="truncate text-primary underline-offset-4 hover:underline">
              {task.subjectLabel}
            </Link>
          ) : null}
        </p>
      </div>
      {task.assigneeId !== user.id ? (
        <span title={task.assigneeName ?? undefined} className="inline-flex">
          <UserAvatar name={task.assigneeName} size="sm" />
          <span className="sr-only">{t("card.assignedTo", { name: task.assigneeName ?? "" })}</span>
        </span>
      ) : null}
    </li>
  );
}
