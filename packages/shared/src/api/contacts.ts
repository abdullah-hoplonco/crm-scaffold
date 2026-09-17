import { z } from "zod";
import { Company, Contact, PhoneE164, Timestamp, User } from "../entities";
import { LeadSource, PhoneLabel } from "../enums";
import { defineRoute, Ok, PageQuery, Paginated } from "./define";

export const PhoneInput = z.object({
  /** Any format; normalised to E.164 with UAE as the default region. */
  number: z.string().trim().min(1, "Enter a phone number"),
  label: PhoneLabel.default("mobile"),
  isWhatsapp: z.boolean().default(true),
});

export const ContactInput = z.object({
  firstName: z.string().trim().min(1, "Enter a first name"),
  lastName: z.string().trim().nullable().optional(),
  phones: z.array(PhoneInput).default([]),
  emails: z.array(z.email("Enter a valid email")).default([]),
  jobTitle: z.string().trim().nullable().optional(),
  companyId: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  assigneeId: z.string().nullable().optional(),
  source: LeadSource.default("manual"),
});
export type ContactInput = z.input<typeof ContactInput>;

export const ContactListItem = Contact.extend({
  companyName: z.string().nullable(),
  assigneeName: z.string().nullable(),
  openDealsCount: z.number().int(),
  lastActivityAt: Timestamp.nullable(),
});
export type ContactListItem = z.infer<typeof ContactListItem>;

export const ContactDetail = z.object({
  contact: Contact,
  company: Company.nullable(),
  assignee: User.nullable(),
});
export type ContactDetail = z.infer<typeof ContactDetail>;

/** Target fields a CSV column can map to. */
export const ImportField = z.enum([
  "firstName",
  "lastName",
  "fullName",
  "phone",
  "email",
  "jobTitle",
  "companyName",
  "notes",
  "ignore",
]);
export type ImportField = z.infer<typeof ImportField>;

export const ImportDraft = z.object({
  rowIndex: z.number().int(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  phoneE164: PhoneE164.nullable(),
  email: z.string().nullable(),
  jobTitle: z.string().nullable(),
  companyName: z.string().nullable(),
  notes: z.string().nullable(),
  duplicateOfContactId: z.string().nullable(),
  duplicateOfContactName: z.string().nullable(),
  errors: z.array(z.string()),
});
export type ImportDraft = z.infer<typeof ImportDraft>;

export const contactRoutes = {
  list: defineRoute({
    method: "GET",
    path: "/contacts",
    summary: "Search contacts by name, phone, email or company",
    query: z.object({
      q: z.string().optional(),
      companyId: z.string().optional(),
      assigneeId: z.string().optional(),
      ...PageQuery,
    }),
    response: Paginated(ContactListItem),
  }),
  get: defineRoute({
    method: "GET",
    path: "/contacts/:contactId",
    summary: "Contact with company and assignee",
    params: z.object({ contactId: z.string() }),
    response: ContactDetail,
  }),
  create: defineRoute({
    method: "POST",
    path: "/contacts",
    summary: "Create a contact (409 DUPLICATE_PHONE when the primary phone exists)",
    body: ContactInput,
    response: Contact,
  }),
  update: defineRoute({
    method: "PATCH",
    path: "/contacts/:contactId",
    summary: "Edit a contact",
    params: z.object({ contactId: z.string() }),
    body: ContactInput.partial(),
    response: Contact,
  }),
  remove: defineRoute({
    method: "DELETE",
    path: "/contacts/:contactId",
    summary: "Soft-delete a contact",
    params: z.object({ contactId: z.string() }),
    response: Ok,
  }),
  importPreview: defineRoute({
    method: "POST",
    path: "/contacts/import/preview",
    summary: "Map spreadsheet rows to contact drafts and flag duplicates by phone",
    body: z.object({
      rows: z.array(z.record(z.string(), z.string())).max(5000),
      mapping: z.record(z.string(), ImportField),
    }),
    response: z.object({ drafts: z.array(ImportDraft) }),
  }),
  importCommit: defineRoute({
    method: "POST",
    path: "/contacts/import/commit",
    summary: "Create contacts (and companies by name) from reviewed drafts",
    body: z.object({ drafts: z.array(ImportDraft), duplicates: z.enum(["skip", "update"]) }),
    response: z.object({ created: z.number().int(), updated: z.number().int(), skipped: z.number().int() }),
  }),
};
