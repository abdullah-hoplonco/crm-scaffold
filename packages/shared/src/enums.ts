import { z } from "zod";

export const Role = z.enum(["owner", "manager", "rep"]);
export type Role = z.infer<typeof Role>;

/** Where a Lead came from (attribution). Simulated leads carry `isSimulated`, not a separate source. */
export const LeadSource = z.enum(["facebook", "instagram", "tiktok", "whatsapp", "email", "manual", "csv"]);
export type LeadSource = z.infer<typeof LeadSource>;

export const LeadStatus = z.enum(["new", "contacted", "qualified", "disqualified", "converted"]);
export type LeadStatus = z.infer<typeof LeadStatus>;

export const DisqualifyReason = z.enum([
  "spam",
  "wrong_number",
  "not_interested",
  "out_of_area",
  "duplicate",
  "other",
]);
export type DisqualifyReason = z.infer<typeof DisqualifyReason>;

export const StageType = z.enum(["open", "won", "lost"]);
export type StageType = z.infer<typeof StageType>;

export const LostReason = z.enum(["price", "competitor", "no_budget", "no_response", "timing", "other"]);
export type LostReason = z.infer<typeof LostReason>;

export const ActivityType = z.enum([
  "note",
  "message_in",
  "message_out",
  "email_in",
  "email_out",
  "call",
  "meeting",
  "stage_change",
  "task_done",
  "quote_sent",
  "system",
]);
export type ActivityType = z.infer<typeof ActivityType>;

export const TaskStatus = z.enum(["open", "done"]);
export type TaskStatus = z.infer<typeof TaskStatus>;

export const TaskOrigin = z.enum(["manual", "auto_stale", "auto_lead"]);
export type TaskOrigin = z.infer<typeof TaskOrigin>;

export const Channel = z.enum(["whatsapp", "email"]);
export type Channel = z.infer<typeof Channel>;

export const MessageDirection = z.enum(["in", "out"]);
export type MessageDirection = z.infer<typeof MessageDirection>;

export const MessageStatus = z.enum(["queued", "sent", "delivered", "read", "failed"]);
export type MessageStatus = z.infer<typeof MessageStatus>;

export const MessageKind = z.enum(["text", "image", "document", "template"]);
export type MessageKind = z.infer<typeof MessageKind>;

export const QuoteStatus = z.enum(["draft", "sent", "accepted", "rejected"]);
export type QuoteStatus = z.infer<typeof QuoteStatus>;

export const QuoteSendVia = z.enum(["whatsapp", "email"]);
export type QuoteSendVia = z.infer<typeof QuoteSendVia>;

export const ChannelConnectionType = z.enum([
  "whatsapp_cloud",
  "meta_leadads",
  "tiktok_leads",
  "gmail",
  "simulator",
]);
export type ChannelConnectionType = z.infer<typeof ChannelConnectionType>;

export const ConnectionStatus = z.enum(["connected", "disconnected", "pending", "error"]);
export type ConnectionStatus = z.infer<typeof ConnectionStatus>;

export const Emirate = z.enum([
  "abu_dhabi",
  "dubai",
  "sharjah",
  "ajman",
  "umm_al_quwain",
  "ras_al_khaimah",
  "fujairah",
]);
export type Emirate = z.infer<typeof Emirate>;

export const Jurisdiction = z.enum(["mainland", "free_zone"]);
export type Jurisdiction = z.infer<typeof Jurisdiction>;

export const AssignmentStrategy = z.enum(["round_robin", "manual"]);
export type AssignmentStrategy = z.infer<typeof AssignmentStrategy>;

export const NotificationType = z.enum([
  "lead_assigned",
  "message_received",
  "task_due",
  "deal_stale",
  "deal_assigned",
  "quote_accepted",
]);
export type NotificationType = z.infer<typeof NotificationType>;

export const PhoneLabel = z.enum(["mobile", "work", "home", "other"]);
export type PhoneLabel = z.infer<typeof PhoneLabel>;

export const TemplateCategory = z.enum(["utility", "marketing", "authentication"]);
export type TemplateCategory = z.infer<typeof TemplateCategory>;

export const TemplateStatus = z.enum(["approved", "pending", "rejected"]);
export type TemplateStatus = z.infer<typeof TemplateStatus>;
