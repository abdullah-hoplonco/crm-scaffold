import { z } from "zod";
import { AssignmentStrategy, LeadSource, Role } from "../enums";
import { defineRoute, Ok } from "./define";

/** Sources the Simulator can produce leads for. "mixed" spreads a burst across ads and WhatsApp. */
export const SimulatedLeadSource = LeadSource.exclude(["manual", "csv"]);
export type SimulatedLeadSource = z.infer<typeof SimulatedLeadSource>;

/** What one simulated lead turned into, for the demo panel's event log. */
export const SimulationResult = z.object({
  /** created: a new lead; repeat: added to the person's open lead; message: added to a contact's conversation. */
  outcome: z.enum(["created", "repeat", "message"]),
  source: LeadSource,
  leadId: z.string().nullable(),
  conversationId: z.string().nullable(),
  name: z.string(),
  assigneeId: z.string().nullable(),
  assigneeName: z.string().nullable(),
  /** The enquiry or message text. */
  text: z.string().nullable(),
});
export type SimulationResult = z.infer<typeof SimulationResult>;

export const DemoStatus = z.object({
  assignment: z.object({
    strategy: AssignmentStrategy,
    nextAssigneeId: z.string().nullable(),
    nextAssigneeName: z.string().nullable(),
  }),
  /** Active reps, for "Open as a rep in a new window". */
  reps: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      email: z.string(),
      role: Role,
      jobTitle: z.string().nullable(),
      newLeads: z.number().int().min(0),
      unreadConversations: z.number().int().min(0),
    }),
  ),
});
export type DemoStatus = z.infer<typeof DemoStatus>;

export const demoRoutes = {
  simulateLead: defineRoute({
    method: "POST",
    path: "/dev/simulate/lead",
    summary: "Generate realistic leads through the ingestion path (DEMO_MODE only)",
    body: z.object({
      source: z.union([SimulatedLeadSource, z.literal("mixed")]),
      count: z.number().int().min(1).max(25).default(1),
      /** Optional real phone to route the simulated lead to (the first lead of a burst). */
      phone: z.string().trim().optional(),
    }),
    response: z.object({
      leadIds: z.array(z.string()),
      results: z.array(SimulationResult).optional(),
    }),
  }),
  simulateMessage: defineRoute({
    method: "POST",
    path: "/dev/simulate/message",
    summary:
      "Generate an inbound WhatsApp message from an existing contact or an unknown number (DEMO_MODE only)",
    body: z.object({
      from: z.enum(["existing_contact", "unknown_number"]),
      contactId: z.string().optional(),
      body: z.string().trim().optional(),
      /** Optional real phone for an unknown-number message. */
      phone: z.string().trim().optional(),
    }),
    response: z.object({
      conversationId: z.string(),
      messageId: z.string(),
      leadId: z.string().nullable(),
      result: SimulationResult.optional(),
    }),
  }),
  reset: defineRoute({
    method: "POST",
    path: "/dev/reset",
    summary: "Restore the demo workspace to its starting story (DEMO_MODE only)",
    response: Ok,
  }),
  status: defineRoute({
    method: "GET",
    path: "/dev/status",
    summary: "Who the next lead goes to and each rep's new leads and unread conversations (DEMO_MODE only)",
    response: DemoStatus,
  }),
};
