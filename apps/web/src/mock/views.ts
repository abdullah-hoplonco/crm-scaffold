import { formatPhone, isDealStale, serviceWindowState } from "@hco/core";
import type { Activity, Contact, Conversation, Deal, Lead, Task, User } from "@hco/shared";
import type { ConversationListItem } from "@hco/shared/api/inbox";
import type { LeadListItem } from "@hco/shared/api/leads";
import type { DealCard } from "@hco/shared/api/pipeline";
import type { TaskListItem, TimelineItem } from "@hco/shared/api/timeline";
import type { MockContext } from "./define";
import { rows } from "./scope";

/** Read models shared by several areas. Keep them in step with the contract in @hco/shared/api. */

export function userById(ctx: MockContext, id: string | null | undefined): User | null {
  if (!id) return null;
  return ctx.db.users.find((u) => u.id === id) ?? null;
}

export function userName(ctx: MockContext, id: string | null | undefined): string | null {
  return userById(ctx, id)?.name ?? null;
}

export function contactName(contact: Pick<Contact, "firstName" | "lastName">): string {
  return [contact.firstName, contact.lastName].filter(Boolean).join(" ");
}

export function stageById(ctx: MockContext, id: string) {
  const stage = ctx.db.stages.find((s) => s.id === id);
  if (!stage) ctx.fail("NOT_FOUND", "That stage doesn't exist.");
  return stage;
}

export function toDealCard(ctx: MockContext, deal: Deal): DealCard {
  const stage = stageById(ctx, deal.stageId);
  const contact = ctx.db.contacts.find((c) => c.id === deal.contactId);
  const company = deal.companyId ? ctx.db.companies.find((c) => c.id === deal.companyId) : null;
  const openTasksCount = ctx.db.tasks.filter(
    (t) => t.dealId === deal.id && t.status === "open" && !t.deletedAt,
  ).length;
  const hasUnreadMessages = ctx.db.conversations.some(
    (c) => c.contactId === deal.contactId && c.unreadCount > 0,
  );
  return {
    id: deal.id,
    title: deal.title,
    valueAed: deal.valueAed,
    stageId: stage.id,
    stageName: stage.name,
    stageType: stage.type,
    position: deal.position,
    contactId: deal.contactId,
    contactName: contact ? contactName(contact) : "Unknown contact",
    companyId: company?.id ?? null,
    companyName: company?.name ?? null,
    assigneeId: deal.assigneeId,
    assigneeName: userName(ctx, deal.assigneeId),
    source: deal.source,
    isStale: isDealStale(deal, stage.type, ctx.now, ctx.workspace.staleAfterDays),
    lastActivityAt: deal.lastActivityAt,
    expectedCloseDate: deal.expectedCloseDate,
    closedAt: deal.closedAt,
    openTasksCount,
    hasUnreadMessages,
  };
}

export function conversationDisplayName(ctx: MockContext, conv: Conversation): string {
  const contact = conv.contactId ? ctx.db.contacts.find((c) => c.id === conv.contactId) : null;
  if (contact) return contactName(contact);
  const lead = conv.leadId ? ctx.db.leads.find((l) => l.id === conv.leadId) : null;
  if (lead?.name) return lead.name;
  return (
    conv.participantName ??
    (conv.participantPhoneE164
      ? formatPhone(conv.participantPhoneE164)
      : (conv.participantEmail ?? "Unknown"))
  );
}

export function toConversationListItem(ctx: MockContext, conv: Conversation): ConversationListItem {
  const contact = conv.contactId ? ctx.db.contacts.find((c) => c.id === conv.contactId) : null;
  const lead = conv.leadId ? ctx.db.leads.find((l) => l.id === conv.leadId) : null;
  return {
    ...conv,
    displayName: conversationDisplayName(ctx, conv),
    assigneeName: userName(ctx, conv.assigneeId),
    source: contact?.source ?? lead?.source ?? null,
    subjectHref: contact ? `/contacts/${contact.id}` : lead ? `/leads/${lead.id}` : null,
    serviceWindowOpen: serviceWindowState(conv, ctx.now).open,
  };
}

export function toTaskListItem(ctx: MockContext, task: Task): TaskListItem {
  const deal = task.dealId ? ctx.db.deals.find((d) => d.id === task.dealId) : null;
  const lead = task.leadId ? ctx.db.leads.find((l) => l.id === task.leadId) : null;
  const contact = task.contactId ? ctx.db.contacts.find((c) => c.id === task.contactId) : null;
  const subjectLabel = deal
    ? deal.title
    : lead
      ? `${lead.name} · lead`
      : contact
        ? contactName(contact)
        : null;
  const subjectHref = deal
    ? `/deals/${deal.id}`
    : lead
      ? `/leads/${lead.id}`
      : contact
        ? `/contacts/${contact.id}`
        : null;
  return {
    ...task,
    assigneeName: userName(ctx, task.assigneeId),
    subjectLabel,
    subjectHref,
    isOverdue: task.status === "open" && task.dueAt < ctx.nowIso,
  };
}

export function toLeadListItem(ctx: MockContext, lead: Lead): LeadListItem {
  const matched = lead.matchedContactId ? ctx.db.contacts.find((c) => c.id === lead.matchedContactId) : null;
  const conversation =
    ctx.db.conversations.find((c) => c.leadId === lead.id) ??
    (lead.convertedContactId
      ? ctx.db.conversations.find((c) => c.contactId === lead.convertedContactId)
      : undefined) ??
    (lead.matchedContactId
      ? ctx.db.conversations.find((c) => c.contactId === lead.matchedContactId)
      : undefined);
  const nextTask = ctx.db.tasks
    .filter((t) => t.leadId === lead.id && t.status === "open" && !t.deletedAt)
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt))[0];
  return {
    ...lead,
    assigneeName: userName(ctx, lead.assigneeId),
    matchedContactName: matched ? contactName(matched) : null,
    conversationId: conversation?.id ?? null,
    nextTaskDueAt: nextTask?.dueAt ?? null,
  };
}

export function toTimelineItem(ctx: MockContext, activity: Activity): TimelineItem {
  return { ...activity, userName: userName(ctx, activity.userId) };
}

/** Open deals of a contact, most recently active first. */
export function openDealsOfContact(ctx: MockContext, contactId: string): Deal[] {
  const openStageIds = new Set(
    rows(ctx, "stages")
      .filter((s) => s.type === "open")
      .map((s) => s.id),
  );
  return rows(ctx, "deals")
    .filter((d) => d.contactId === contactId && openStageIds.has(d.stageId))
    .sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt));
}
