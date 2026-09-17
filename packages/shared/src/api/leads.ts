import { z } from "zod";
import { Contact, DateOnly, Lead, MoneyAed, Task, Timestamp, User } from "../entities";
import { DisqualifyReason, Emirate, Jurisdiction, LeadSource, LeadStatus } from "../enums";
import { defineRoute, PageQuery, Paginated } from "./define";
import { DealCard } from "./pipeline";

export const LeadListItem = Lead.extend({
  assigneeName: z.string().nullable(),
  matchedContactName: z.string().nullable(),
  conversationId: z.string().nullable(),
  nextTaskDueAt: Timestamp.nullable(),
});
export type LeadListItem = z.infer<typeof LeadListItem>;

export const LeadDetail = z.object({
  lead: LeadListItem,
  assignee: User.nullable(),
  matchedContact: Contact.nullable(),
  tasks: z.array(Task),
  /** Set once the lead is converted. */
  convertedContact: Contact.nullable().optional(),
  convertedDeal: DealCard.nullable().optional(),
});
export type LeadDetail = z.infer<typeof LeadDetail>;

/** Lead counts per saved view, with the source, assignee and search filters applied. */
export const LeadViewCounts = z.object({
  new: z.number().int(),
  open: z.number().int(),
  converted: z.number().int(),
  disqualified: z.number().int(),
  all: z.number().int(),
});
export type LeadViewCounts = z.infer<typeof LeadViewCounts>;

export const ConvertLeadInput = z.object({
  contact: z.discriminatedUnion("mode", [
    z.object({ mode: z.literal("existing"), contactId: z.string() }),
    z.object({
      mode: z.literal("new"),
      firstName: z.string().trim().min(1, "Enter a first name"),
      lastName: z.string().trim().nullable().optional(),
      phone: z.string().trim().nullable().optional(),
      email: z.string().trim().nullable().optional(),
      jobTitle: z.string().trim().nullable().optional(),
    }),
  ]),
  company: z
    .discriminatedUnion("mode", [
      z.object({ mode: z.literal("existing"), companyId: z.string() }),
      z.object({
        mode: z.literal("new"),
        name: z.string().trim().min(1, "Enter the company name"),
        emirate: Emirate.nullable().optional(),
        jurisdiction: Jurisdiction.nullable().optional(),
      }),
    ])
    .nullable(),
  deal: z.object({
    title: z.string().trim().min(1, "Enter a deal title"),
    valueAed: MoneyAed,
    stageId: z.string().optional(),
    expectedCloseDate: DateOnly.nullable().optional(),
  }),
});
export type ConvertLeadInput = z.input<typeof ConvertLeadInput>;

export const leadRoutes = {
  list: defineRoute({
    method: "GET",
    path: "/leads",
    summary: "Leads newest first; reps see their own and unassigned",
    query: z.object({
      status: z.union([LeadStatus, z.literal("open")]).optional(),
      source: LeadSource.optional(),
      /** A user id, or "unassigned". */
      assigneeId: z.string().optional(),
      q: z.string().optional(),
      ...PageQuery,
    }),
    response: Paginated(LeadListItem).extend({ counts: LeadViewCounts.optional() }),
  }),
  get: defineRoute({
    method: "GET",
    path: "/leads/:leadId",
    summary: "Lead with assignee, matched contact and tasks",
    params: z.object({ leadId: z.string() }),
    response: LeadDetail,
  }),
  create: defineRoute({
    method: "POST",
    path: "/leads",
    summary: "Add a lead by hand (walk-in, phone call, referral)",
    body: z.object({
      name: z.string().trim().min(1, "Enter a name"),
      phone: z.string().trim().nullable().optional(),
      email: z.string().trim().nullable().optional(),
      companyName: z.string().trim().nullable().optional(),
      message: z.string().trim().nullable().optional(),
      assigneeId: z.string().nullable().optional(),
    }),
    /** `created` is false when the person already had an open lead and the enquiry was added to it. */
    response: LeadListItem.extend({ created: z.boolean().optional() }),
  }),
  assign: defineRoute({
    method: "POST",
    path: "/leads/:leadId/assign",
    summary: "Reassign a lead (null to unassign)",
    params: z.object({ leadId: z.string() }),
    body: z.object({ assigneeId: z.string().nullable() }),
    response: LeadListItem,
  }),
  setStatus: defineRoute({
    method: "POST",
    path: "/leads/:leadId/status",
    summary: "Mark contacted, qualified or disqualified (reason required, 422 DISQUALIFY_REASON_REQUIRED)",
    params: z.object({ leadId: z.string() }),
    body: z.object({
      status: z.enum(["contacted", "qualified", "disqualified"]),
      reason: DisqualifyReason.optional(),
      note: z.string().trim().optional(),
    }),
    response: LeadListItem,
  }),
  convert: defineRoute({
    method: "POST",
    path: "/leads/:leadId/convert",
    summary: "Convert to a new or existing contact (+ optional company) and a new deal, in one step",
    params: z.object({ leadId: z.string() }),
    body: ConvertLeadInput,
    response: z.object({ contactId: z.string(), companyId: z.string().nullable(), dealId: z.string() }),
  }),
};
