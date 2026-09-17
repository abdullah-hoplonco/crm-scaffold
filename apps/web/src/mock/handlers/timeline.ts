import { api } from "@hco/shared";
import { handle, type MockHandler } from "../define";
import { findOr404, rows } from "../scope";
import { addActivity, completeTask, createTask } from "../services";
import { toTaskListItem, toTimelineItem } from "../views";

/** Timeline, notes and tasks. Starter implementation; the pipeline workstream owns and completes this file. */
export const timelineHandlers: MockHandler[] = [
  handle(api.timeline.list, (ctx, { query }) => {
    const dealIds = new Set<string>();
    const contactIds = new Set<string>();
    const leadIds = new Set<string>();
    if (query.dealId) {
      dealIds.add(query.dealId);
      const deal = rows(ctx, "deals").find((d) => d.id === query.dealId);
      if (deal) {
        contactIds.add(deal.contactId);
        if (deal.leadId) leadIds.add(deal.leadId);
      }
    }
    if (query.contactId) {
      contactIds.add(query.contactId);
      for (const d of rows(ctx, "deals").filter((d) => d.contactId === query.contactId)) dealIds.add(d.id);
      for (const l of rows(ctx, "leads").filter(
        (l) => l.convertedContactId === query.contactId || l.matchedContactId === query.contactId,
      ))
        leadIds.add(l.id);
    }
    if (query.leadId) leadIds.add(query.leadId);
    const items = rows(ctx, "activities")
      .filter(
        (a) =>
          (a.dealId && dealIds.has(a.dealId)) ||
          (a.contactId && contactIds.has(a.contactId)) ||
          (a.leadId && leadIds.has(a.leadId)),
      )
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
      .map((a) => toTimelineItem(ctx, a));
    return { items };
  }),
  handle(api.timeline.addActivity, (ctx, { body }) => {
    const activity = addActivity(ctx, {
      type: body.type,
      body: body.body,
      leadId: body.leadId ?? null,
      contactId: body.contactId ?? null,
      dealId: body.dealId ?? null,
      occurredAt: body.occurredAt,
    });
    return toTimelineItem(ctx, activity);
  }),
  handle(api.timeline.listTasks, (ctx, { query }) => {
    const items = rows(ctx, "tasks")
      .filter((t) => !query.status || t.status === query.status)
      .filter((t) => !query.assigneeId || t.assigneeId === query.assigneeId)
      .filter((t) => !query.dealId || t.dealId === query.dealId)
      .filter((t) => !query.leadId || t.leadId === query.leadId)
      .filter((t) => !query.contactId || t.contactId === query.contactId)
      .sort((a, b) => a.dueAt.localeCompare(b.dueAt))
      .map((t) => toTaskListItem(ctx, t));
    return { items };
  }),
  handle(api.timeline.createTask, (ctx, { body }) => {
    const task = createTask(ctx, {
      title: body.title,
      dueAt: body.dueAt,
      assigneeId: body.assigneeId ?? ctx.user.id,
      origin: "manual",
      leadId: body.leadId ?? null,
      contactId: body.contactId ?? null,
      dealId: body.dealId ?? null,
    });
    return toTaskListItem(ctx, task);
  }),
  handle(api.timeline.updateTask, (ctx, { params, body }) => {
    const task = findOr404(ctx, "tasks", params.taskId, "task");
    if (body.title !== undefined) task.title = body.title;
    if (body.dueAt !== undefined) task.dueAt = body.dueAt;
    if (body.assigneeId !== undefined) task.assigneeId = body.assigneeId;
    task.updatedAt = ctx.nowIso;
    if (body.status === "done") completeTask(ctx, task);
    if (body.status === "open" && task.status === "done") {
      task.status = "open";
      task.completedAt = null;
    }
    ctx.emit({ type: "task.updated", id: task.id });
    return toTaskListItem(ctx, task);
  }),
];
