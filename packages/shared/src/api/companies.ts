import { z } from "zod";
import { Company, Contact, MoneyAed, User } from "../entities";
import { Emirate, Jurisdiction } from "../enums";
import { defineRoute, Ok, PageQuery, Paginated } from "./define";

export const CompanyInput = z.object({
  name: z.string().trim().min(1, "Enter the company name"),
  tradeLicenseNo: z.string().trim().nullable().optional(),
  trn: z
    .string()
    .trim()
    .regex(/^\d{15}$/, "A TRN has 15 digits")
    .nullable()
    .optional(),
  emirate: Emirate.nullable().optional(),
  jurisdiction: Jurisdiction.nullable().optional(),
  freeZoneName: z.string().trim().nullable().optional(),
  website: z.string().trim().nullable().optional(),
  address: z.string().trim().nullable().optional(),
  industry: z.string().trim().nullable().optional(),
  assigneeId: z.string().nullable().optional(),
});
export type CompanyInput = z.input<typeof CompanyInput>;

export const CompanyListItem = Company.extend({
  assigneeName: z.string().nullable(),
  contactsCount: z.number().int(),
  openDealsCount: z.number().int(),
  openPipelineAed: MoneyAed,
});
export type CompanyListItem = z.infer<typeof CompanyListItem>;

export const CompanyDetail = z.object({
  company: Company,
  contacts: z.array(Contact),
  assignee: User.nullable(),
});
export type CompanyDetail = z.infer<typeof CompanyDetail>;

export const companyRoutes = {
  list: defineRoute({
    method: "GET",
    path: "/companies",
    summary: "Search companies by name, TRN or trade licence",
    query: z.object({ q: z.string().optional(), emirate: Emirate.optional(), ...PageQuery }),
    response: Paginated(CompanyListItem),
  }),
  get: defineRoute({
    method: "GET",
    path: "/companies/:companyId",
    summary: "Company with its contacts",
    params: z.object({ companyId: z.string() }),
    response: CompanyDetail,
  }),
  create: defineRoute({
    method: "POST",
    path: "/companies",
    summary: "Create a company",
    body: CompanyInput,
    response: Company,
  }),
  update: defineRoute({
    method: "PATCH",
    path: "/companies/:companyId",
    summary: "Edit a company",
    params: z.object({ companyId: z.string() }),
    body: CompanyInput.partial(),
    response: Company,
  }),
  remove: defineRoute({
    method: "DELETE",
    path: "/companies/:companyId",
    summary: "Soft-delete a company",
    params: z.object({ companyId: z.string() }),
    response: Ok,
  }),
};
