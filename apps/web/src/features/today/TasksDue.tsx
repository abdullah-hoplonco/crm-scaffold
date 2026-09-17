import { api } from "@hco/shared";
import type { TaskListItem } from "@hco/shared/api/timeline";
import { Link } from "@tanstack/react-router";
import { CalendarCheck, Snowflake, Zap } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { errorMessage } from "@/lib/api/errors";
import { useApiMutation } from "@/lib/api/hooks";
import { formatListTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { TodaySection, useDurationLabel } from "./TodaySection";

function TaskRow({
  task,
  now,
  checked,
  onCheck,
  showAssignee,
}: {
  task: TaskListItem;
  now: Date;
  checked: boolean;
  onCheck: () => void;
  showAssignee: boolean;
}) {
  const { t } = useTranslation("dashboard");
  const duration = useDurationLabel();
  const overdue = !checked && new Date(task.dueAt) < now;

  return (
    <li className="flex items-start gap-3 px-4 py-3">
      <Checkbox
        checked={checked}
        aria-label={t("today.tasks.markDone", { title: task.title })}
        disabled={checked}
        onCheckedChange={(value) => value === true && onCheck()}
        className="relative mt-0.5 size-5 rounded-full after:absolute after:-inset-2.5 after:content-['']"
      />
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "block text-sm leading-snug font-medium",
            checked && "text-muted-foreground line-through decoration-muted-foreground/60",
          )}
        >
          {task.title}
        </p>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className={cn(overdue && "font-medium text-destructive", checked && "text-success")}>
            {checked
              ? t("today.tasks.doneLabel")
              : overdue
                ? t("today.tasks.overdueBy", {
                    duration: duration(now.getTime() - new Date(task.dueAt).getTime()),
                  })
                : t("today.tasks.dueAt", { time: formatListTime(task.dueAt, now) })}
          </span>
          {task.subjectLabel && task.subjectHref ? (
            <Link
              to={task.subjectHref}
              className="max-w-full truncate text-foreground/80 underline-offset-2 hover:text-primary hover:underline"
            >
              {task.subjectLabel}
            </Link>
          ) : null}
          {task.origin !== "manual" ? (
            <span className="inline-flex items-center gap-1">
              {task.origin === "auto_stale" ? (
                <Snowflake className="size-3" aria-hidden="true" />
              ) : (
                <Zap className="size-3" aria-hidden="true" />
              )}
              {t(`today.tasks.origin.${task.origin}`)}
            </span>
          ) : null}
          {showAssignee && task.assigneeName ? <span>{task.assigneeName}</span> : null}
        </p>
      </div>
    </li>
  );
}

/** Open tasks due by the end of today, overdue first. Ticking one off completes it, with undo. */
export function TasksDue({
  tasks,
  now,
  showAssignee,
  className,
}: {
  tasks: TaskListItem[];
  now: Date;
  showAssignee: boolean;
  className?: string;
}) {
  const { t } = useTranslation("dashboard");
  const [completing, setCompleting] = useState<ReadonlySet<string>>(new Set());
  const setDone = (id: string, done: boolean) =>
    setCompleting((prev) => {
      const next = new Set(prev);
      if (done) next.add(id);
      else next.delete(id);
      return next;
    });

  const reopen = useApiMutation(api.timeline.updateTask, {
    onSuccess: (task) => {
      setDone(task.id, false);
      toast(t("today.tasks.reopened"));
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
  const complete = useApiMutation(api.timeline.updateTask, {
    onSuccess: (task) =>
      toast(t("today.tasks.completed"), {
        description: task.title,
        action: {
          label: t("today.tasks.undo"),
          onClick: () => reopen.mutate({ params: { taskId: task.id }, body: { status: "open" } }),
        },
      }),
    onError: (error, input) => {
      setDone(input.params.taskId, false);
      toast.error(errorMessage(error));
    },
  });

  const overdue = tasks.filter((task) => new Date(task.dueAt) < now);
  const later = tasks.filter((task) => new Date(task.dueAt) >= now);
  const row = (task: TaskListItem) => (
    <TaskRow
      key={task.id}
      task={task}
      now={now}
      checked={completing.has(task.id)}
      showAssignee={showAssignee}
      onCheck={() => {
        setDone(task.id, true);
        complete.mutate({ params: { taskId: task.id }, body: { status: "done" } });
      }}
    />
  );

  return (
    <TodaySection
      id="tasks"
      icon={CalendarCheck}
      title={t("today.tasks.title")}
      count={tasks.length}
      className={className}
    >
      {overdue.length ? (
        <>
          <h3 className="bg-danger-soft/60 px-4 py-1.5 text-xs font-medium text-destructive">
            {t("today.tasks.overdueGroup", { count: overdue.length })}
          </h3>
          <ul className="divide-y">{overdue.map(row)}</ul>
        </>
      ) : null}
      {later.length ? (
        <>
          {overdue.length ? (
            <h3 className="border-t bg-muted/60 px-4 py-1.5 text-xs font-medium text-muted-foreground">
              {t("today.tasks.laterGroup")}
            </h3>
          ) : null}
          <ul className="divide-y">{later.map(row)}</ul>
        </>
      ) : null}
    </TodaySection>
  );
}
