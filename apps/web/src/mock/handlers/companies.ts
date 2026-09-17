import { api, newId, type Company, type Deal } from "@hco/shared";
import type { CompanyInput } from "@hco/shared/api/companies";
import { ApiError } from "@hco/shared/api/define";
import { sumMoney } from "@hco/core";
import { trnDigits } from "@hco/core/contacts/registration";
import { handle, type MockContext, type MockHandler } from "../define";
import { findOr404, matchesQuery, rows } from "../scope";
import { contactName, userById, userName } from "../views";
import { assigneeOrThrow, blankToNull, openStageIds } from "./contacts";

/** Open deals of every company: linked directly, or through a contact of the company when the deal has no company. */
function openDealsByCompany(ctx: MockContext): Map<string, Deal[]> {
  const open = openStageIds(ctx);
  const contactCompany = new Map(rows(ctx, "contacts").map((c) => [c.id, c.companyId]));
  const byCompany = new Map<string, Deal[]>();
  for (const deal of rows(ctx, "deals")) {
    if (!open.has(deal.stageId)) continue;
    const companyId = deal.companyId ?? contactCompany.get(deal.contactId) ?? null;
    if (!companyId) continue;
    byCompany.set(companyId, [...(byCompany.get(companyId) ?? []), deal]);
  }
  return byCompany;
}

/** 409 when another company already has this name (compared case-insensitively). */
function assertUniqueName(ctx: MockContext, name: string, exceptId: string | null) {
  const key = name.trim().toLowerCase();
  const clash = rows(ctx, "companies").find((c) => c.id !== exceptId && c.name.trim().toLowerCase() === key);
  if (clash) {
    throw new ApiError(
      409,
      "DUPLICATE_COMPANY",
      `${clash.name} is already in your companies. Open it instead of adding it again.`,
      { companyId: clash.id, companyName: clash.name },
    );
  }
}

/** Apply the registration fields of a create or edit; a mainland company has no free zone name. */
function applyFields(ctx: MockContext, company: Company, input: Partial<CompanyInput>) {
  if (input.name !== undefined) company.name = input.name.trim();
  if (input.tradeLicenseNo !== undefined) company.tradeLicenseNo = blankToNull(input.tradeLicenseNo);
  if (input.trn !== undefined) company.trn = input.trn ? trnDigits(input.trn) : null;
  if (input.emirate !== undefined) company.emirate = input.emirate ?? null;
  if (input.jurisdiction !== undefined) company.jurisdiction = input.jurisdiction ?? null;
  if (input.freeZoneName !== undefined) company.freeZoneName = blankToNull(input.freeZoneName);
  if (company.jurisdiction !== "free_zone") company.freeZoneName = null;
  if (input.website !== undefined) company.website = blankToNull(input.website);
  if (input.address !== undefined) company.address = blankToNull(input.address);
  if (input.industry !== undefined) company.industry = blankToNull(input.industry);
  if (input.assigneeId !== undefined) company.assigneeId = assigneeOrThrow(ctx, input.assigneeId);
  company.updatedAt = ctx.nowIso;
  ctx.emit({ type: "company.updated", id: company.id });
}

export const companyHandlers: MockHandler[] = [
  handle(api.companies.list, (ctx, { query }) => {
    const filtered = rows(ctx, "companies")
      .filter((c) => !query.emirate || c.emirate === query.emirate)
      .filter((c) => matchesQuery(query.q, c.name, c.trn, c.tradeLicenseNo, c.industry, c.freeZoneName))
      .sort((a, b) => a.name.localeCompare(b.name));
    const contactsCount = new Map<string, number>();
    for (const contact of rows(ctx, "contacts")) {
      if (contact.companyId)
        contactsCount.set(contact.companyId, (contactsCount.get(contact.companyId) ?? 0) + 1);
    }
    const openDeals = openDealsByCompany(ctx);
    return {
      total: filtered.length,
      items: filtered.slice(query.offset, query.offset + query.limit).map((company) => {
        const deals = openDeals.get(company.id) ?? [];
        return {
          ...company,
          assigneeName: userName(ctx, company.assigneeId),
          contactsCount: contactsCount.get(company.id) ?? 0,
          openDealsCount: deals.length,
          openPipelineAed: sumMoney(deals.map((d) => d.valueAed)),
        };
      }),
    };
  }),

  handle(api.companies.get, (ctx, { params }) => {
    const company = findOr404(ctx, "companies", params.companyId, "company");
    const deals = openDealsByCompany(ctx).get(company.id) ?? [];
    return {
      company,
      contacts: rows(ctx, "contacts")
        .filter((c) => c.companyId === company.id)
        .sort((a, b) => contactName(a).localeCompare(contactName(b))),
      assignee: userById(ctx, company.assigneeId),
      openDealsCount: deals.length,
      openPipelineAed: sumMoney(deals.map((d) => d.valueAed)),
    };
  }),

  handle(api.companies.create, (ctx, { body }) => {
    assertUniqueName(ctx, body.name, null);
    const company: Company = {
      id: newId(),
      workspaceId: ctx.workspace.id,
      createdAt: ctx.nowIso,
      updatedAt: ctx.nowIso,
      name: body.name,
      tradeLicenseNo: null,
      trn: null,
      emirate: null,
      jurisdiction: null,
      freeZoneName: null,
      website: null,
      address: null,
      industry: null,
      assigneeId: null,
      deletedAt: null,
    };
    applyFields(ctx, company, body);
    ctx.db.companies.push(company);
    return company;
  }),

  handle(api.companies.update, (ctx, { params, body }) => {
    const company = findOr404(ctx, "companies", params.companyId, "company");
    if (body.name !== undefined) assertUniqueName(ctx, body.name, company.id);
    applyFields(ctx, company, body);
    return company;
  }),

  handle(api.companies.remove, (ctx, { params }) => {
    const company = findOr404(ctx, "companies", params.companyId, "company");
    company.deletedAt = ctx.nowIso;
    company.updatedAt = ctx.nowIso;
    for (const contact of rows(ctx, "contacts").filter((c) => c.companyId === company.id)) {
      contact.companyId = null;
      contact.updatedAt = ctx.nowIso;
    }
    ctx.emit({ type: "company.updated", id: company.id });
    ctx.emit({ type: "contact.updated", id: null });
    return { ok: true as const };
  }),
];
