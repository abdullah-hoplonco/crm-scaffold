import { api } from "@hco/shared";
import { formatPhone } from "@hco/core";
import { handle, type MockHandler } from "../define";
import { findOr404, matchesQuery, rows } from "../scope";
import { contactName, openDealsOfContact, userById } from "../views";

/** Contacts. Starter list/get so pickers work; the contacts workstream owns and completes this file. */
export const contactHandlers: MockHandler[] = [
  handle(api.contacts.list, (ctx, { query }) => {
    const companies = new Map(rows(ctx, "companies").map((c) => [c.id, c]));
    const filtered = rows(ctx, "contacts")
      .filter((c) => !query.companyId || c.companyId === query.companyId)
      .filter((c) => !query.assigneeId || c.assigneeId === query.assigneeId)
      .filter((c) =>
        matchesQuery(
          query.q,
          contactName(c),
          c.emails.join(" "),
          c.phones.map((p) => `${p.e164} ${formatPhone(p.e164)}`).join(" "),
          c.companyId ? companies.get(c.companyId)?.name : null,
        ),
      )
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    const page = filtered.slice(query.offset, query.offset + query.limit);
    return {
      total: filtered.length,
      items: page.map((c) => {
        const last = rows(ctx, "activities")
          .filter((a) => a.contactId === c.id)
          .reduce<string | null>((max, a) => (max === null || a.occurredAt > max ? a.occurredAt : max), null);
        return {
          ...c,
          companyName: c.companyId ? (companies.get(c.companyId)?.name ?? null) : null,
          assigneeName: userById(ctx, c.assigneeId)?.name ?? null,
          openDealsCount: openDealsOfContact(ctx, c.id).length,
          lastActivityAt: last,
        };
      }),
    };
  }),
  handle(api.contacts.get, (ctx, { params }) => {
    const contact = findOr404(ctx, "contacts", params.contactId, "contact");
    return {
      contact,
      company: contact.companyId
        ? (rows(ctx, "companies").find((c) => c.id === contact.companyId) ?? null)
        : null,
      assignee: userById(ctx, contact.assigneeId),
    };
  }),
];
