import {
  ACTIVITY_TYPES_THAT_REFRESH_DEALS,
  nextAssignee,
  normalizePhone,
  serviceWindowExpiry,
  statusAfterFirstTouch,
} from "@hco/core";
import {
  newId,
  type Activity,
  type ActivityType,
  type Contact,
  type Conversation,
  type Lead,
  type LeadSource,
  type Media,
  type Message,
  type MessageKind,
  type MessageTemplateRef,
  type NotificationType,
  type Task,
} from "@hco/shared";
import type { MockContext } from "./define";
import { rows } from "./scope";
import { contactName, openDealsOfContact } from "./views";

/**
 * Domain services of the showcase backend. They mirror what Phase B's API and worker do, so
 * every screen sees the same side effects (timeline, deal activity, assignment, notifications).
 */

function base(ctx: MockContext, at = ctx.nowIso) {
  return { id: newId(), workspaceId: ctx.workspace.id, createdAt: at, updatedAt: at };
}

// ---------------------------------------------------------------------------
// Timeline
// ---------------------------------------------------------------------------

export interface ActivityInput {
  type: ActivityType;
  leadId?: string | null;
  contactId?: string | null;
  dealId?: string | null;
  body?: string | null;
  metadata?: Record<string, unknown>;
  userId?: string | null;
  occurredAt?: string;
}

/** Append a timeline entry and refresh "last activity" on the deals it concerns. */
export function addActivity(ctx: MockContext, input: ActivityInput): Activity {
  const occurredAt = input.occurredAt ?? ctx.nowIso;
  const activity: Activity = {
    ...base(ctx, occurredAt),
    type: input.type,
    leadId: input.leadId ?? null,
    contactId: input.contactId ?? null,
    dealId: input.dealId ?? null,
    body: input.body ?? null,
    metadata: input.metadata ?? {},
    userId: input.userId === undefined ? safeUserId(ctx) : input.userId,
    occurredAt,
  };
  ctx.db.activities.push(activity);
  if (ACTIVITY_TYPES_THAT_REFRESH_DEALS.has(activity.type)) {
    const deals = activity.dealId
      ? rows(ctx, "deals").filter((d) => d.id === activity.dealId)
      : activity.contactId
        ? openDealsOfContact(ctx, activity.contactId)
        : [];
    for (const deal of deals) {
      if (deal.lastActivityAt < occurredAt) {
        deal.lastActivityAt = occurredAt;
        deal.updatedAt = occurredAt;
      }
    }
  }
  ctx.emit({ type: "activity.created", id: activity.id });
  return activity;
}

function safeUserId(ctx: MockContext): string | null {
  try {
    return ctx.user.id;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Notifications and tasks
// ---------------------------------------------------------------------------

export function notify(
  ctx: MockContext,
  input: {
    userId: string;
    type: NotificationType;
    title: string;
    body?: string | null;
    href?: string | null;
    toast?: boolean;
  },
) {
  const notification = {
    ...base(ctx),
    userId: input.userId,
    type: input.type,
    title: input.title,
    body: input.body ?? null,
    href: input.href ?? null,
    readAt: null,
  };
  ctx.db.notifications.push(notification);
  ctx.emit({
    type: "notification.created",
    id: notification.id,
    notifyUserIds: input.toast === false ? [] : [input.userId],
    toast:
      input.toast === false
        ? null
        : { title: input.title, body: input.body ?? null, href: input.href ?? null },
  });
  return notification;
}

export function createTask(
  ctx: MockContext,
  input: Pick<Task, "title" | "dueAt" | "assigneeId" | "origin"> &
    Partial<Pick<Task, "leadId" | "contactId" | "dealId">>,
): Task {
  const task: Task = {
    ...base(ctx),
    title: input.title,
    dueAt: input.dueAt,
    assigneeId: input.assigneeId,
    leadId: input.leadId ?? null,
    contactId: input.contactId ?? null,
    dealId: input.dealId ?? null,
    status: "open",
    completedAt: null,
    origin: input.origin,
    deletedAt: null,
  };
  ctx.db.tasks.push(task);
  ctx.emit({ type: "task.created", id: task.id });
  return task;
}

export function completeTask(ctx: MockContext, task: Task) {
  if (task.status === "done") return;
  task.status = "done";
  task.completedAt = ctx.nowIso;
  task.updatedAt = ctx.nowIso;
  addActivity(ctx, {
    type: "task_done",
    leadId: task.leadId,
    contactId: task.contactId,
    dealId: task.dealId,
    body: task.title,
    metadata: { taskId: task.id, origin: task.origin },
  });
  ctx.emit({ type: "task.updated", id: task.id });
}

// ---------------------------------------------------------------------------
// Leads: matching, assignment, first touch
// ---------------------------------------------------------------------------

/** Find who an inbound person is: WhatsApp user id first, then any phone, then email (Q3/Q15). */
export function matchPerson(
  ctx: MockContext,
  input: { phoneE164?: string | null; whatsappUserId?: string | null; email?: string | null },
): { contact: Contact | null; openLead: Lead | null; closedLead: Lead | null } {
  const contacts = rows(ctx, "contacts");
  const email = input.email?.trim().toLowerCase() || null;
  const contact =
    (input.whatsappUserId ? contacts.find((c) => c.whatsappUserId === input.whatsappUserId) : undefined) ??
    (input.phoneE164 ? contacts.find((c) => c.phones.some((p) => p.e164 === input.phoneE164)) : undefined) ??
    (email ? contacts.find((c) => c.emails.some((e) => e.toLowerCase() === email)) : undefined) ??
    null;
  const leads = rows(ctx, "leads")
    .filter(
      (l) =>
        (input.whatsappUserId && l.whatsappUserId === input.whatsappUserId) ||
        (input.phoneE164 && l.phoneE164 === input.phoneE164) ||
        (email && l.email?.toLowerCase() === email),
    )
    .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));
  const openLead =
    leads.find((l) => l.status === "new" || l.status === "contacted" || l.status === "qualified") ?? null;
  const closedLead = leads.find((l) => l.status === "disqualified" || l.status === "converted") ?? null;
  return { contact, openLead, closedLead };
}

/** Round-robin assignment for brand-new people. Returns the assignee id or null (manual rule). */
export function autoAssign(ctx: MockContext): string | null {
  const rule = rows(ctx, "assignmentRules")[0];
  if (!rule) return null;
  const active = new Set(
    rows(ctx, "users")
      .filter((u) => u.isActive)
      .map((u) => u.id),
  );
  const next = nextAssignee(rule, active);
  if (next) {
    rule.lastAssignedUserId = next;
    rule.updatedAt = ctx.nowIso;
  }
  return next;
}

const SOURCE_LABEL: Record<LeadSource, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok: "TikTok",
  whatsapp: "WhatsApp",
  email: "email",
  manual: "manual",
  csv: "CSV",
};

/** Assignment side effects for a new Lead: activity, "contact within 15 minutes" task, notification. */
export function onLeadAssigned(
  ctx: MockContext,
  lead: Lead,
  how: "round_robin" | "matched_contact" | "manual",
) {
  if (!lead.assigneeId) return;
  const assignee = ctx.db.users.find((u) => u.id === lead.assigneeId);
  addActivity(ctx, {
    type: "system",
    leadId: lead.id,
    contactId: lead.matchedContactId,
    body: `Assigned to ${assignee?.name ?? "a teammate"}`,
    metadata: { kind: "assigned", assigneeId: lead.assigneeId, strategy: how },
    userId: null,
  });
  if (lead.status === "new") {
    createTask(ctx, {
      title: `Contact ${lead.name} within 15 minutes`,
      dueAt: new Date(new Date(lead.receivedAt).getTime() + 15 * 60_000).toISOString(),
      assigneeId: lead.assigneeId,
      origin: "auto_lead",
      leadId: lead.id,
      contactId: lead.matchedContactId,
    });
  }
  notify(ctx, {
    userId: lead.assigneeId,
    type: "lead_assigned",
    title: `New ${SOURCE_LABEL[lead.source]} lead: ${lead.name}`,
    body: lead.message,
    href: `/leads/${lead.id}`,
  });
}

/** First outbound touch on a lead: new → contacted, and the auto "contact within 15 minutes" task is done. */
export function markLeadTouched(ctx: MockContext, lead: Lead) {
  const next = statusAfterFirstTouch(lead.status);
  if (next !== lead.status) {
    lead.status = next;
    lead.firstContactedAt = ctx.nowIso;
    lead.updatedAt = ctx.nowIso;
    ctx.emit({ type: "lead.updated", id: lead.id });
  }
  for (const task of rows(ctx, "tasks").filter(
    (t) => t.leadId === lead.id && t.origin === "auto_lead" && t.status === "open",
  )) {
    completeTask(ctx, task);
  }
}

// ---------------------------------------------------------------------------
// Conversations and messages
// ---------------------------------------------------------------------------

export function simulatorConnection(ctx: MockContext) {
  const conn = rows(ctx, "channelConnections").find((c) => c.type === "simulator");
  if (!conn) ctx.fail("NOT_FOUND", "The demo simulator connection is missing. Reset the demo.");
  return conn;
}

/** The WhatsApp conversation for a contact or lead, created on first use (bound to the Simulator in the showcase). */
export function findOrCreateWhatsappConversation(
  ctx: MockContext,
  who: { contact?: Contact | null; lead?: Lead | null },
): Conversation {
  const { contact, lead } = who;
  const existing = rows(ctx, "conversations").find(
    (c) =>
      c.channel === "whatsapp" &&
      ((contact && c.contactId === contact.id) ||
        (lead && c.leadId === lead.id) ||
        (contact?.primaryPhoneE164 && c.participantPhoneE164 === contact.primaryPhoneE164) ||
        (lead?.phoneE164 && c.participantPhoneE164 === lead.phoneE164)),
  );
  if (existing) return existing;
  const conv: Conversation = {
    ...base(ctx),
    channel: "whatsapp",
    channelConnectionId: simulatorConnection(ctx).id,
    participantPhoneE164: contact?.primaryPhoneE164 ?? lead?.phoneE164 ?? null,
    participantEmail: null,
    participantWhatsappUserId: contact?.whatsappUserId ?? lead?.whatsappUserId ?? null,
    participantName: contact ? contactName(contact) : (lead?.name ?? null),
    contactId: contact?.id ?? null,
    leadId: contact ? null : (lead?.id ?? null),
    assigneeId: contact?.assigneeId ?? lead?.assigneeId ?? null,
    lastInboundAt: null,
    lastOutboundAt: null,
    lastMessageAt: null,
    lastMessagePreview: null,
    unreadCount: 0,
    serviceWindowExpiresAt: null,
    isSimulated: true,
  };
  ctx.db.conversations.push(conv);
  ctx.emit({ type: "conversation.updated", id: conv.id });
  return conv;
}

export interface AppendMessageInput {
  direction: "in" | "out";
  kind: MessageKind;
  body: string | null;
  subject?: string | null;
  media?: Media[];
  template?: MessageTemplateRef | null;
  quoteId?: string | null;
  sentByUserId?: string | null;
  occurredAt?: string;
}

/**
 * Add a message to a conversation: updates the conversation (preview, unread, service window),
 * writes the timeline entry, touches the lead, and for simulated outbound messages plays back
 * sent → delivered → read ticks.
 */
export function appendMessage(ctx: MockContext, conv: Conversation, input: AppendMessageInput): Message {
  const occurredAt = input.occurredAt ?? ctx.nowIso;
  const message: Message = {
    ...base(ctx, occurredAt),
    conversationId: conv.id,
    direction: input.direction,
    channel: conv.channel,
    kind: input.kind,
    externalId:
      conv.channel === "whatsapp"
        ? `wamid.SIM${Date.now()}${Math.floor(Math.random() * 1e6)}`
        : `<${newId()}@demo>`,
    body: input.body,
    subject: input.subject ?? null,
    media: input.media ?? [],
    template: input.template ?? null,
    quoteId: input.quoteId ?? null,
    status: input.direction === "in" ? "read" : "sent",
    error: null,
    sentByUserId: input.direction === "out" ? (input.sentByUserId ?? safeUserId(ctx)) : null,
    occurredAt,
  };
  ctx.db.messages.push(message);

  conv.lastMessageAt = occurredAt;
  conv.lastMessagePreview =
    input.kind === "document"
      ? `📄 ${input.media?.[0]?.fileName ?? "Document"}`
      : input.kind === "image"
        ? "📷 Photo"
        : (input.body ?? "");
  conv.updatedAt = occurredAt;
  if (input.direction === "in") {
    conv.lastInboundAt = occurredAt;
    conv.unreadCount += 1;
    if (conv.channel === "whatsapp") conv.serviceWindowExpiresAt = serviceWindowExpiry(occurredAt);
  } else {
    conv.lastOutboundAt = occurredAt;
  }

  const deal = conv.contactId ? openDealsOfContact(ctx, conv.contactId)[0] : undefined;
  const lead = conv.leadId ? ctx.db.leads.find((l) => l.id === conv.leadId) : undefined;
  const activityType: ActivityType =
    conv.channel === "email"
      ? input.direction === "in"
        ? "email_in"
        : "email_out"
      : input.direction === "in"
        ? "message_in"
        : "message_out";
  addActivity(ctx, {
    type: activityType,
    leadId: lead?.id ?? null,
    contactId: conv.contactId,
    dealId: deal?.id ?? null,
    body: conv.lastMessagePreview,
    metadata: { conversationId: conv.id, messageId: message.id, channel: conv.channel, kind: input.kind },
    userId: input.direction === "out" ? message.sentByUserId : null,
    occurredAt,
  });

  if (input.direction === "out" && lead) markLeadTouched(ctx, lead);

  ctx.emit({ type: "message.created", id: message.id });
  ctx.emit({ type: "conversation.updated", id: conv.id });

  if (input.direction === "out" && conv.isSimulated) {
    const progress = (status: "delivered" | "read") => (later: MockContext) => {
      const m = later.db.messages.find((x) => x.id === message.id);
      if (!m || m.status === "read" || m.status === "failed") return;
      m.status = status;
      m.updatedAt = later.nowIso;
      later.emit({ type: "message.status", id: m.id });
    };
    ctx.defer(1200, progress("delivered"));
    ctx.defer(4500, progress("read"));
  }
  return message;
}

// ---------------------------------------------------------------------------
// Ingestion (the Simulator and, in Phase B, every real adapter end here)
// ---------------------------------------------------------------------------

export interface IngestLeadInput {
  source: LeadSource;
  adapter: string;
  externalId: string;
  name: string;
  phone: string | null;
  email: string | null;
  whatsappUserId?: string | null;
  companyName?: string | null;
  message: string | null;
  formFields: Record<string, string>;
  campaignName: string | null;
  isSimulated: boolean;
  receivedAt?: string;
  rawPayload?: Record<string, unknown> | null;
}

/**
 * Turn an inbound lead into a Lead. Duplicate (adapter, externalId) is a no-op. A person with an
 * open lead gets a timeline note instead of a second lead; an existing contact gets a new lead
 * linked to them and keeps their assignee; everyone else is assigned round-robin.
 */
export function ingestLead(ctx: MockContext, input: IngestLeadInput): { lead: Lead; created: boolean } {
  const duplicate = rows(ctx, "leads").find(
    (l) => l.adapter === input.adapter && l.externalId === input.externalId,
  );
  if (duplicate) return { lead: duplicate, created: false };

  const phoneE164 = normalizePhone(input.phone);
  const match = matchPerson(ctx, { phoneE164, whatsappUserId: input.whatsappUserId, email: input.email });
  if (match.openLead) {
    addActivity(ctx, {
      type: "system",
      leadId: match.openLead.id,
      contactId: match.openLead.matchedContactId,
      body: `Also enquired via ${SOURCE_LABEL[input.source]}: ${input.message ?? "form submitted"}`,
      metadata: { kind: "repeat_enquiry", source: input.source, externalId: input.externalId },
      userId: null,
    });
    match.openLead.updatedAt = ctx.nowIso;
    ctx.emit({ type: "lead.updated", id: match.openLead.id });
    return { lead: match.openLead, created: false };
  }

  const receivedAt = input.receivedAt ?? ctx.nowIso;
  const lead: Lead = {
    ...base(ctx, receivedAt),
    source: input.source,
    isSimulated: input.isSimulated,
    adapter: input.adapter,
    externalId: input.externalId,
    rawPayload: input.rawPayload ?? null,
    name: input.name,
    phoneE164,
    email: input.email,
    whatsappUserId: input.whatsappUserId ?? null,
    companyName: input.companyName ?? null,
    message: input.message,
    formFields: input.formFields,
    campaignName: input.campaignName,
    status: "new",
    disqualifyReason: null,
    disqualifyNote: null,
    assigneeId: match.contact?.assigneeId ?? null,
    matchedContactId: match.contact?.id ?? null,
    convertedContactId: null,
    convertedDealId: null,
    firstContactedAt: null,
    receivedAt,
    deletedAt: null,
  };
  let how: "round_robin" | "matched_contact" = "matched_contact";
  if (!lead.assigneeId) {
    lead.assigneeId = autoAssign(ctx);
    how = "round_robin";
  }
  ctx.db.leads.push(lead);
  ctx.emit({
    type: "lead.created",
    id: lead.id,
  });
  onLeadAssigned(ctx, lead, how);
  return { lead, created: true };
}

export interface IngestMessageInput {
  externalId: string;
  from: string | null;
  fromName: string | null;
  whatsappUserId?: string | null;
  body: string | null;
  kind?: MessageKind;
  media?: Media[];
  isSimulated: boolean;
  occurredAt?: string;
}

/**
 * Inbound WhatsApp message. Known contact or open lead: added to their conversation. Unknown
 * number: a new WhatsApp lead is created (and assigned) with the message as its enquiry.
 */
export function ingestWhatsappMessage(
  ctx: MockContext,
  input: IngestMessageInput,
): { conversation: Conversation; message: Message; lead: Lead | null } {
  const existingMessage = rows(ctx, "messages").find((m) => m.externalId === input.externalId);
  if (existingMessage) {
    const conversation = rows(ctx, "conversations").find((c) => c.id === existingMessage.conversationId);
    if (conversation) return { conversation, message: existingMessage, lead: null };
  }
  const phoneE164 = normalizePhone(input.from);
  const match = matchPerson(ctx, { phoneE164, whatsappUserId: input.whatsappUserId });
  let lead: Lead | null = null;
  if (!match.contact && !match.openLead) {
    lead = ingestLead(ctx, {
      source: "whatsapp",
      adapter: "whatsapp-cloud",
      externalId: input.externalId,
      name: input.fromName ?? phoneE164 ?? "WhatsApp user",
      phone: phoneE164,
      email: null,
      whatsappUserId: input.whatsappUserId ?? null,
      message: input.body,
      formFields: {},
      campaignName: null,
      isSimulated: input.isSimulated,
      receivedAt: input.occurredAt,
    }).lead;
  }
  const conversation = findOrCreateWhatsappConversation(ctx, {
    contact: match.contact,
    lead: match.contact ? null : (lead ?? match.openLead),
  });
  const message = appendMessage(ctx, conversation, {
    direction: "in",
    kind: input.kind ?? "text",
    body: input.body,
    media: input.media,
    occurredAt: input.occurredAt,
  });
  if (conversation.assigneeId) {
    notify(ctx, {
      userId: conversation.assigneeId,
      type: "message_received",
      title: conversation.participantName ?? "New WhatsApp message",
      body: input.body,
      href: `/inbox/${conversation.id}`,
      toast: lead === null,
    });
  }
  return { conversation, message, lead };
}
