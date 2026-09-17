import { api } from "@hco/shared";
import { sumMoney } from "@hco/core";
import { handle, type MockHandler } from "../define";
import { matchesQuery, rows } from "../scope";
import { openDealsOfContact, userName } from "../views";

/** Companies. Starter list so pickers work; the contacts workstream owns and completes this file. */
export const companyHandlers: MockHandler[] = [
  handle(api.companies.list, (ctx, { query }) => {
    const filtered = rows(ctx, "companies")
      .filter((c) => !query.emirate || c.emirate === query.emirate)
      .filter((c) => matchesQuery(query.q, c.name, c.trn, c.tradeLicenseNo))
      .sort((a, b) => a.name.localeCompare(b.name));
    return {
      total: filtered.length,
      items: filtered.slice(query.offset, query.offset + query.limit).map((company) => {
        const contacts = rows(ctx, "contacts").filter((c) => c.companyId === company.id);
        const openDeals = contacts.flatMap((c) => openDealsOfContact(ctx, c.id));
        return {
          ...company,
          assigneeName: userName(ctx, company.assigneeId),
          contactsCount: contacts.length,
          openDealsCount: openDeals.length,
          openPipelineAed: sumMoney(openDeals.map((d) => d.valueAed)),
        };
      }),
    };
  }),
];
