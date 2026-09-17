import { api, type SubjectLinks } from "@hco/shared";
import type { MockContext } from "../define";
import { handle, type MockHandler } from "../define";
import { findOr404, rows } from "../scope";
import { addActivity, completeTask, createTask, markLeadTouched } from "../services";
import { toTaskListItem, toTimelineItem } from "../views";

/** Timeline, notes and tasks. */

/**
 * Check the links of a new note or task and fill in the obvious ones: a deal's contact, so the
 * entry also shows on the contact's timeline.
 */
function resolveLinks(
  ctx: MockContext,
  input: { leadId?: string | null; contactId?: string | null; dealId?: string | null },
): SubjectLinks {
  const deal = input.dealId ? findOr404(ctx, "deals", input.dealId, "deal") : null;
  const lead = input.leadId ? findOr404(ctx, "leads", input.leadId, "lead") : null;
  const contactId = input.contactId ?? deal?.contactId ?? null;
  if (contactId) findOr404(ctx, "contacts", contactId, "contact");
  if (!deal && !lead && !contactId) {
    throw ctx.error("VALIDATION", "Choose the lead, contact or deal this is about.");
  }
  return { leadId: lead?.id ?? null, contactId, dealId: deal?.id ?? null };
}

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
    const links = resolveLinks(ctx, body);
    if (body.occurredAt && body.occurredAt > ctx.nowIso) {
      throw ctx.error("VALIDATION", "A logged call or meeting can't be in the future.");
    }
    const activity = addActivity(ctx, {
      type: body.type,
      body: body.body,
      ...links,
      occurredAt: body.occurredAt,
    });
    // A call is a first touch, just like a message: the lead becomes contacted.
    if (body.type === "call" && links.leadId) {
      const lead = rows(ctx, "leads").find((l) => l.id === links.leadId);
      if (lead) markLeadTouched(ctx, lead);
    }
    if (links.dealId) ctx.emit({ type: "deal.updated", id: links.dealId });
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
    const links = resolveLinks(ctx, body);
    const assigneeId = body.assigneeId ?? ctx.user.id;
    if (!rows(ctx, "users").some((u) => u.id === assigneeId && u.isActive)) {
      throw ctx.error("VALIDATION", "Choose an active teammate for this task.");
    }
    const task = createTask(ctx, {
      title: body.title,
      dueAt: body.dueAt,
      assigneeId,
      origin: "manual",
      ...links,
    });
    return toTaskListItem(ctx, task);
  }),

  handle(api.timeline.updateTask, (ctx, { params, body }) => {
    const task = findOr404(ctx, "tasks", params.taskId, "task");
    if (body.title !== undefined) task.title = body.title;
    if (body.dueAt !== undefined) task.dueAt = body.dueAt;
    if (body.assigneeId !== undefined) {
      if (!rows(ctx, "users").some((u) => u.id === body.assigneeId && u.isActive)) {
        throw ctx.error("VALIDATION", "Choose an active teammate for this task.");
      }
      task.assigneeId = body.assigneeId;
    }
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
