import { z } from "zod";
import { Activity, Task, Timestamp } from "../entities";
import { TaskStatus } from "../enums";
import { defineRoute } from "./define";

export const TimelineItem = Activity.extend({ userName: z.string().nullable() });
export type TimelineItem = z.infer<typeof TimelineItem>;

export const TaskListItem = Task.extend({
  assigneeName: z.string().nullable(),
  /** e.g. "Fatima Al Mansoori · Laser hair removal package" */
  subjectLabel: z.string().nullable(),
  /** In-app path of the linked deal, lead or contact. */
  subjectHref: z.string().nullable(),
  isOverdue: z.boolean(),
});
export type TaskListItem = z.infer<typeof TaskListItem>;

const SubjectQuery = {
  leadId: z.string().optional(),
  contactId: z.string().optional(),
  dealId: z.string().optional(),
};

export const timelineRoutes = {
  list: defineRoute({
    method: "GET",
    path: "/timeline",
    summary:
      "Activities newest first. A deal includes its contact's and originating lead's activities; a contact includes its deals' and leads'",
    query: z.object(SubjectQuery),
    response: z.object({ items: z.array(TimelineItem) }),
  }),
  addActivity: defineRoute({
    method: "POST",
    path: "/activities",
    summary: "Log a note, call or meeting",
    body: z.object({
      type: z.enum(["note", "call", "meeting"]),
      body: z.string().trim().min(1, "Write something first"),
      leadId: z.string().nullable().optional(),
      contactId: z.string().nullable().optional(),
      dealId: z.string().nullable().optional(),
      occurredAt: Timestamp.optional(),
    }),
    response: TimelineItem,
  }),
  listTasks: defineRoute({
    method: "GET",
    path: "/tasks",
    summary: "Tasks, soonest due first",
    query: z.object({
      ...SubjectQuery,
      assigneeId: z.string().optional(),
      status: TaskStatus.optional(),
    }),
    response: z.object({ items: z.array(TaskListItem) }),
  }),
  createTask: defineRoute({
    method: "POST",
    path: "/tasks",
    summary: "Create a task; assigned to the current user when no assignee is given",
    body: z.object({
      title: z.string().trim().min(1, "Enter a task title"),
      dueAt: Timestamp,
      assigneeId: z.string().optional(),
      leadId: z.string().nullable().optional(),
      contactId: z.string().nullable().optional(),
      dealId: z.string().nullable().optional(),
    }),
    response: TaskListItem,
  }),
  updateTask: defineRoute({
    method: "PATCH",
    path: "/tasks/:taskId",
    summary: "Edit or complete a task; completing writes a task_done activity",
    params: z.object({ taskId: z.string() }),
    body: z.object({
      title: z.string().trim().min(1).optional(),
      dueAt: Timestamp.optional(),
      assigneeId: z.string().optional(),
      status: TaskStatus.optional(),
    }),
    response: TaskListItem,
  }),
};
