import { z } from "zod";
import { LeadSource } from "../enums";
import { defineRoute, Ok } from "./define";

export const demoRoutes = {
  simulateLead: defineRoute({
    method: "POST",
    path: "/dev/simulate/lead",
    summary: "Generate realistic leads through the ingestion path (DEMO_MODE only)",
    body: z.object({
      source: LeadSource.exclude(["manual", "csv"]),
      count: z.number().int().min(1).max(25).default(1),
      /** Optional real phone to route the simulated lead to. */
      phone: z.string().trim().optional(),
    }),
    response: z.object({ leadIds: z.array(z.string()) }),
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
    }),
    response: z.object({ conversationId: z.string(), messageId: z.string(), leadId: z.string().nullable() }),
  }),
  reset: defineRoute({
    method: "POST",
    path: "/dev/reset",
    summary: "Restore the demo workspace to its starting story (DEMO_MODE only)",
    response: Ok,
  }),
};
