import { z } from "zod";
import { Media } from "./entities";
import { Channel, LeadSource, MessageKind, MessageStatus } from "./enums";

// ---------------------------------------------------------------------------
// Inbound events: what adapters produce from webhooks, polls and the Simulator.
// Adapters cannot see the database, so they carry the external account id
// (WhatsApp phone_number_id, Facebook page_id, TikTok advertiser_id, Gmail address);
// the worker resolves the Workspace from the matching Channel Connection.
// ---------------------------------------------------------------------------

export const LeadReceived = z.object({
  type: z.literal("lead.received"),
  adapter: z.string(),
  externalAccountId: z.string(),
  source: LeadSource,
  externalId: z.string(),
  receivedAt: z.string(),
  fields: z.record(z.string(), z.string()),
  campaignName: z.string().nullable(),
  isSimulated: z.boolean(),
  raw: z.unknown(),
});
export type LeadReceived = z.infer<typeof LeadReceived>;

export const MessageReceived = z.object({
  type: z.literal("message.received"),
  adapter: z.string(),
  externalAccountId: z.string(),
  channel: Channel,
  externalId: z.string(),
  kind: MessageKind,
  /** Phone (E.164) or email address; may be null for WhatsApp username-only users. */
  from: z.string().nullable(),
  fromName: z.string().nullable(),
  /** WhatsApp business-scoped user id when present. */
  fromWhatsappUserId: z.string().nullable(),
  subject: z.string().nullable(),
  body: z.string().nullable(),
  media: z.array(Media),
  occurredAt: z.string(),
  isSimulated: z.boolean(),
  raw: z.unknown(),
});
export type MessageReceived = z.infer<typeof MessageReceived>;

export const MessageStatusChanged = z.object({
  type: z.literal("message.status"),
  adapter: z.string(),
  externalAccountId: z.string(),
  externalId: z.string(),
  status: MessageStatus,
  error: z.string().nullable(),
  occurredAt: z.string(),
});
export type MessageStatusChanged = z.infer<typeof MessageStatusChanged>;

/** Id-only notification that needs a fetch before it becomes a real event (Lead Ads leadgen, Gmail historyId). */
export const HydrationNeeded = z.object({
  type: z.literal("hydrate"),
  adapter: z.string(),
  externalAccountId: z.string(),
  externalId: z.string(),
  raw: z.unknown(),
});
export type HydrationNeeded = z.infer<typeof HydrationNeeded>;

export const InboundEvent = z.discriminatedUnion("type", [
  LeadReceived,
  MessageReceived,
  MessageStatusChanged,
  HydrationNeeded,
]);
export type InboundEvent = z.infer<typeof InboundEvent>;

// ---------------------------------------------------------------------------
// Live events: pushed to browsers (SSE in Phase B, in-browser bus in the showcase).
// ---------------------------------------------------------------------------

export const LiveEventType = z.enum([
  "lead.created",
  "lead.updated",
  "conversation.updated",
  "message.created",
  "message.status",
  "deal.created",
  "deal.updated",
  "deal.moved",
  "task.created",
  "task.updated",
  "activity.created",
  "notification.created",
  "quote.updated",
  "contact.updated",
  "company.updated",
  "workspace.updated",
  "workspace.reset",
]);
export type LiveEventType = z.infer<typeof LiveEventType>;

export const LiveEvent = z.object({
  type: LiveEventType,
  workspaceId: z.string(),
  /** Id of the changed record. */
  id: z.string().nullable(),
  at: z.string(),
  actorUserId: z.string().nullable(),
  /** Users this event should toast for (e.g. the new lead's assignee). Empty = no toast. */
  notifyUserIds: z.array(z.string()),
  toast: z.object({ title: z.string(), body: z.string().nullable(), href: z.string().nullable() }).nullable(),
});
export type LiveEvent = z.infer<typeof LiveEvent>;
