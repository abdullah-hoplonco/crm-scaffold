import { z } from "zod";
import {
  ActivityType,
  AssignmentStrategy,
  Channel,
  ChannelConnectionType,
  ConnectionStatus,
  DisqualifyReason,
  Emirate,
  Jurisdiction,
  LeadSource,
  LeadStatus,
  LostReason,
  MessageDirection,
  MessageKind,
  MessageStatus,
  NotificationType,
  PhoneLabel,
  QuoteSendVia,
  QuoteStatus,
  Role,
  StageType,
  TaskOrigin,
  TaskStatus,
  TemplateCategory,
  TemplateStatus,
} from "./enums";

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

/** UUIDv7 string. */
export const Id = z.string().min(1);
export type Id = z.infer<typeof Id>;

/** ISO-8601 UTC timestamp, e.g. 2026-09-17T08:30:00.000Z. */
export const Timestamp = z.string().min(1);
export type Timestamp = z.infer<typeof Timestamp>;

/** Calendar date YYYY-MM-DD, interpreted in the workspace timezone. */
export const DateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");
export type DateOnly = z.infer<typeof DateOnly>;

/** Decimal money in AED as a string with up to 2 decimals. Never a float. */
export const MoneyAed = z.string().regex(/^-?\d{1,12}(\.\d{1,2})?$/, "Enter an amount like 1250 or 1250.50");
export type MoneyAed = z.infer<typeof MoneyAed>;

/** Decimal quantity or rate as a string, e.g. "5.00" or "2.5". */
export const Decimal = z.string().regex(/^-?\d{1,12}(\.\d{1,4})?$/, "Enter a number");
export type Decimal = z.infer<typeof Decimal>;

/** Phone number in E.164 format, e.g. +971501234567. */
export const PhoneE164 = z
  .string()
  .regex(/^\+[1-9]\d{6,14}$/, "Use international format, e.g. +971501234567");
export type PhoneE164 = z.infer<typeof PhoneE164>;

export const JsonRecord = z.record(z.string(), z.unknown());
export type JsonRecord = z.infer<typeof JsonRecord>;

const tenantRow = {
  id: Id,
  workspaceId: Id,
  createdAt: Timestamp,
  updatedAt: Timestamp,
};

// ---------------------------------------------------------------------------
// Tenancy and people
// ---------------------------------------------------------------------------

export const Workspace = z.object({
  id: Id,
  name: z.string().min(1),
  currency: z.literal("AED"),
  vatRate: Decimal,
  trn: z.string().nullable(),
  timezone: z.string(),
  staleAfterDays: z.number().int().min(1).max(60),
  addressLine: z.string().nullable(),
  emirate: Emirate.nullable(),
  createdAt: Timestamp,
  updatedAt: Timestamp,
});
export type Workspace = z.infer<typeof Workspace>;

export const User = z.object({
  ...tenantRow,
  email: z.string(),
  name: z.string().min(1),
  role: Role,
  jobTitle: z.string().nullable(),
  isActive: z.boolean(),
});
export type User = z.infer<typeof User>;

// ---------------------------------------------------------------------------
// Customers
// ---------------------------------------------------------------------------

export const Lead = z.object({
  ...tenantRow,
  source: LeadSource,
  isSimulated: z.boolean(),
  /** Adapter that ingested the lead (e.g. "meta-leadads", "simulator"); idempotency key with externalId. */
  adapter: z.string(),
  externalId: z.string(),
  rawPayload: JsonRecord.nullable(),
  name: z.string(),
  phoneE164: PhoneE164.nullable(),
  email: z.string().nullable(),
  whatsappUserId: z.string().nullable(),
  companyName: z.string().nullable(),
  message: z.string().nullable(),
  /** Form answers mapped to labels, e.g. { "Treatment of interest": "Laser hair removal" }. */
  formFields: z.record(z.string(), z.string()),
  /** Ad or form name when known, e.g. "Summer laser offer — Instagram". */
  campaignName: z.string().nullable(),
  status: LeadStatus,
  disqualifyReason: DisqualifyReason.nullable(),
  disqualifyNote: z.string().nullable(),
  assigneeId: Id.nullable(),
  /** Existing Contact this Lead matched on arrival (same phone / WhatsApp ID / email). */
  matchedContactId: Id.nullable(),
  convertedContactId: Id.nullable(),
  convertedDealId: Id.nullable(),
  firstContactedAt: Timestamp.nullable(),
  receivedAt: Timestamp,
  deletedAt: Timestamp.nullable(),
});
export type Lead = z.infer<typeof Lead>;

export const ContactPhone = z.object({
  e164: PhoneE164,
  label: PhoneLabel,
  isWhatsapp: z.boolean(),
});
export type ContactPhone = z.infer<typeof ContactPhone>;

export const Contact = z.object({
  ...tenantRow,
  firstName: z.string().min(1),
  lastName: z.string().nullable(),
  phones: z.array(ContactPhone),
  /** Denormalised first phone; unique per workspace when present. */
  primaryPhoneE164: PhoneE164.nullable(),
  emails: z.array(z.string()),
  whatsappUserId: z.string().nullable(),
  jobTitle: z.string().nullable(),
  companyId: Id.nullable(),
  source: LeadSource,
  notes: z.string().nullable(),
  assigneeId: Id.nullable(),
  deletedAt: Timestamp.nullable(),
});
export type Contact = z.infer<typeof Contact>;

export const Company = z.object({
  ...tenantRow,
  name: z.string().min(1),
  tradeLicenseNo: z.string().nullable(),
  trn: z.string().nullable(),
  emirate: Emirate.nullable(),
  jurisdiction: Jurisdiction.nullable(),
  freeZoneName: z.string().nullable(),
  website: z.string().nullable(),
  address: z.string().nullable(),
  industry: z.string().nullable(),
  assigneeId: Id.nullable(),
  deletedAt: Timestamp.nullable(),
});
export type Company = z.infer<typeof Company>;

// ---------------------------------------------------------------------------
// Selling
// ---------------------------------------------------------------------------

export const Pipeline = z.object({
  ...tenantRow,
  name: z.string().min(1),
  isDefault: z.boolean(),
});
export type Pipeline = z.infer<typeof Pipeline>;

export const Stage = z.object({
  ...tenantRow,
  pipelineId: Id,
  name: z.string().min(1),
  position: z.number().int().min(0),
  type: StageType,
  probability: z.number().int().min(0).max(100),
});
export type Stage = z.infer<typeof Stage>;

export const Deal = z.object({
  ...tenantRow,
  title: z.string().min(1),
  contactId: Id,
  companyId: Id.nullable(),
  pipelineId: Id,
  stageId: Id,
  /** Order of the card inside its stage column (ascending). */
  position: z.number(),
  valueAed: MoneyAed,
  expectedCloseDate: DateOnly.nullable(),
  assigneeId: Id.nullable(),
  source: LeadSource,
  isSimulated: z.boolean(),
  leadId: Id.nullable(),
  lostReason: LostReason.nullable(),
  lostNote: z.string().nullable(),
  closedAt: Timestamp.nullable(),
  lastActivityAt: Timestamp,
  deletedAt: Timestamp.nullable(),
});
export type Deal = z.infer<typeof Deal>;

export const StageTransition = z.object({
  ...tenantRow,
  dealId: Id,
  fromStageId: Id.nullable(),
  toStageId: Id,
  byUserId: Id.nullable(),
  at: Timestamp,
});
export type StageTransition = z.infer<typeof StageTransition>;

export const QuoteLineItem = z.object({
  id: Id,
  description: z.string().min(1),
  qty: Decimal,
  unitPriceAed: MoneyAed,
});
export type QuoteLineItem = z.infer<typeof QuoteLineItem>;

export const Quote = z.object({
  ...tenantRow,
  dealId: Id,
  /** Per-workspace yearly sequence, e.g. Q-2026-0007. */
  number: z.string(),
  lineItems: z.array(QuoteLineItem),
  subtotalAed: MoneyAed,
  vatRate: Decimal,
  vatAmountAed: MoneyAed,
  totalAed: MoneyAed,
  validUntil: DateOnly,
  notes: z.string().nullable(),
  status: QuoteStatus,
  sentAt: Timestamp.nullable(),
  sentVia: QuoteSendVia.nullable(),
  pdfUrl: z.string().nullable(),
  createdByUserId: Id.nullable(),
});
export type Quote = z.infer<typeof Quote>;

// ---------------------------------------------------------------------------
// Follow-up
// ---------------------------------------------------------------------------

/** Links shared by Activities and Tasks: any combination of Lead, Contact and Deal. */
export const SubjectLinks = z.object({
  leadId: Id.nullable(),
  contactId: Id.nullable(),
  dealId: Id.nullable(),
});
export type SubjectLinks = z.infer<typeof SubjectLinks>;

export const Activity = z.object({
  ...tenantRow,
  ...SubjectLinks.shape,
  type: ActivityType,
  body: z.string().nullable(),
  metadata: JsonRecord,
  userId: Id.nullable(),
  occurredAt: Timestamp,
});
export type Activity = z.infer<typeof Activity>;

export const Task = z.object({
  ...tenantRow,
  ...SubjectLinks.shape,
  title: z.string().min(1),
  dueAt: Timestamp,
  assigneeId: Id,
  status: TaskStatus,
  completedAt: Timestamp.nullable(),
  origin: TaskOrigin,
  deletedAt: Timestamp.nullable(),
});
export type Task = z.infer<typeof Task>;

export const Notification = z.object({
  ...tenantRow,
  userId: Id,
  type: NotificationType,
  title: z.string(),
  body: z.string().nullable(),
  /** In-app path to open, e.g. /leads/019… */
  href: z.string().nullable(),
  readAt: Timestamp.nullable(),
});
export type Notification = z.infer<typeof Notification>;

// ---------------------------------------------------------------------------
// Messaging
// ---------------------------------------------------------------------------

export const ChannelConnection = z.object({
  ...tenantRow,
  /** Set for per-user connections (Gmail). */
  userId: Id.nullable(),
  type: ChannelConnectionType,
  status: ConnectionStatus,
  displayName: z.string(),
  externalAccountId: z.string().nullable(),
  /** Non-secret display settings. Tokens never leave the server. */
  config: JsonRecord,
  lastSyncedAt: Timestamp.nullable(),
});
export type ChannelConnection = z.infer<typeof ChannelConnection>;

export const Conversation = z.object({
  ...tenantRow,
  channel: Channel,
  channelConnectionId: Id,
  participantPhoneE164: PhoneE164.nullable(),
  participantEmail: z.string().nullable(),
  participantWhatsappUserId: z.string().nullable(),
  participantName: z.string().nullable(),
  contactId: Id.nullable(),
  leadId: Id.nullable(),
  assigneeId: Id.nullable(),
  lastInboundAt: Timestamp.nullable(),
  lastOutboundAt: Timestamp.nullable(),
  lastMessageAt: Timestamp.nullable(),
  lastMessagePreview: z.string().nullable(),
  unreadCount: z.number().int().min(0),
  /** WhatsApp only: lastInboundAt + 24h. */
  serviceWindowExpiresAt: Timestamp.nullable(),
  isSimulated: z.boolean(),
});
export type Conversation = z.infer<typeof Conversation>;

export const Media = z.object({
  kind: z.enum(["image", "document", "audio", "video"]),
  url: z.string(),
  mimeType: z.string(),
  fileName: z.string().nullable(),
  sizeBytes: z.number().int().nullable(),
  caption: z.string().nullable(),
});
export type Media = z.infer<typeof Media>;

export const MessageTemplateRef = z.object({
  templateId: Id,
  name: z.string(),
  language: z.string(),
  variables: z.array(z.string()),
});
export type MessageTemplateRef = z.infer<typeof MessageTemplateRef>;

export const Message = z.object({
  ...tenantRow,
  conversationId: Id,
  direction: MessageDirection,
  channel: Channel,
  kind: MessageKind,
  externalId: z.string().nullable(),
  body: z.string().nullable(),
  subject: z.string().nullable(),
  media: z.array(Media),
  template: MessageTemplateRef.nullable(),
  quoteId: Id.nullable(),
  status: MessageStatus,
  error: z.string().nullable(),
  sentByUserId: Id.nullable(),
  occurredAt: Timestamp,
});
export type Message = z.infer<typeof Message>;

export const WhatsAppTemplate = z.object({
  ...tenantRow,
  name: z.string(),
  language: z.string(),
  category: TemplateCategory,
  status: TemplateStatus,
  /** Body with numbered placeholders, e.g. "Hi {{1}}, thanks for your enquiry about {{2}}." */
  body: z.string(),
  /** Human hints for each placeholder, in order, e.g. ["Patient first name", "Treatment"]. */
  variableHints: z.array(z.string()),
});
export type WhatsAppTemplate = z.infer<typeof WhatsAppTemplate>;

export const AssignmentRule = z.object({
  ...tenantRow,
  strategy: AssignmentStrategy,
  eligibleUserIds: z.array(Id),
  lastAssignedUserId: Id.nullable(),
});
export type AssignmentRule = z.infer<typeof AssignmentRule>;

/** Per-workspace yearly counter backing Quote numbers. */
export const QuoteCounter = z.object({
  workspaceId: Id,
  year: z.number().int(),
  lastNumber: z.number().int().min(0),
});
export type QuoteCounter = z.infer<typeof QuoteCounter>;
