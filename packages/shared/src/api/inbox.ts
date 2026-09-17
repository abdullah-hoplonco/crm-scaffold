import { z } from "zod";
import { Contact, Conversation, Lead, Message, WhatsAppTemplate } from "../entities";
import { Channel, LeadSource } from "../enums";
import { defineRoute } from "./define";
import { DealCard } from "./pipeline";

export const ConversationListItem = Conversation.extend({
  /** Contact name, lead name, profile name or formatted phone. */
  displayName: z.string(),
  assigneeName: z.string().nullable(),
  source: LeadSource.nullable(),
  /** In-app path of the linked contact or lead. */
  subjectHref: z.string().nullable(),
  serviceWindowOpen: z.boolean(),
});
export type ConversationListItem = z.infer<typeof ConversationListItem>;

export const ConversationDetail = z.object({
  conversation: ConversationListItem,
  messages: z.array(Message),
  contact: Contact.nullable(),
  lead: Lead.nullable(),
  openDeals: z.array(DealCard),
});
export type ConversationDetail = z.infer<typeof ConversationDetail>;

export const SendMessageInput = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("text"), body: z.string().trim().min(1, "Write a message") }),
  z.object({
    kind: z.literal("template"),
    templateId: z.string(),
    variables: z.array(z.string().trim().min(1, "Fill in every field")),
  }),
]);
export type SendMessageInput = z.infer<typeof SendMessageInput>;

export const inboxRoutes = {
  list: defineRoute({
    method: "GET",
    path: "/conversations",
    summary: "Conversations, most recent message first",
    query: z.object({
      filter: z.enum(["all", "mine", "unassigned", "unread"]).default("all"),
      channel: Channel.optional(),
      q: z.string().optional(),
    }),
    response: z.object({ items: z.array(ConversationListItem), unreadTotal: z.number().int() }),
  }),
  get: defineRoute({
    method: "GET",
    path: "/conversations/:conversationId",
    summary: "Conversation with messages oldest first, linked contact or lead, and open deals",
    params: z.object({ conversationId: z.string() }),
    response: ConversationDetail,
  }),
  start: defineRoute({
    method: "POST",
    path: "/conversations/start",
    summary: "Find or open the WhatsApp conversation for a lead or contact",
    body: z.object({ leadId: z.string().optional(), contactId: z.string().optional() }),
    response: ConversationListItem,
  }),
  send: defineRoute({
    method: "POST",
    path: "/conversations/:conversationId/messages",
    summary:
      "Send a message. Free-form text outside the WhatsApp service window fails with 422 SERVICE_WINDOW_CLOSED; templates always allowed",
    params: z.object({ conversationId: z.string() }),
    body: SendMessageInput,
    response: Message,
  }),
  markRead: defineRoute({
    method: "POST",
    path: "/conversations/:conversationId/read",
    summary: "Clear the unread count",
    params: z.object({ conversationId: z.string() }),
    response: ConversationListItem,
  }),
  assign: defineRoute({
    method: "POST",
    path: "/conversations/:conversationId/assign",
    summary: "Reassign a conversation (null to unassign)",
    params: z.object({ conversationId: z.string() }),
    body: z.object({ assigneeId: z.string().nullable() }),
    response: ConversationListItem,
  }),
  templates: defineRoute({
    method: "GET",
    path: "/whatsapp-templates",
    summary: "Approved WhatsApp templates for messages outside the service window",
    response: z.object({ items: z.array(WhatsAppTemplate) }),
  }),
};
