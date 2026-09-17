import { api, newId, type Company, type Contact } from "@hco/shared";
import { ApiError } from "@hco/shared/api/define";
import { formatPhone, normalizePhone } from "@hco/core";
import { buildImportDrafts, mappingHasName } from "@hco/core/contacts/import";
import { cleanEmails, findPhoneOwner, normalizeContactPhones, type PhoneDraft } from "@hco/core/contacts/phones";
import { handle, type MockContext, type MockHandler } from "../define";
import { findOr404, matchesQuery, rows } from "../scope";
import { addActivity } from "../services";
import { contactName, userById } from "../views";

// ---------------------------------------------------------------------------
// Helpers shared with the companies handlers
// ---------------------------------------------------------------------------

export function blankToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/** An active teammate in this workspace, or null for unassigned. */
export function assigneeOrThrow(ctx: MockContext, assigneeId: string | null | undefined): string | null {
  if (!assigneeId) return null;
  const user = rows(ctx, "users").find((u) => u.id === assigneeId && u.isActive);
  if (!user) throw ctx.error("VALIDATION", "Choose an active teammate as the assignee.");
  return user.id;
}

export function openStageIds(ctx: MockContext): Set<string> {
  return new Set(
    rows(ctx, "stages")
      .filter((s) => s.type === "open")
      .map((s) => s.id),
  );
}

// ---------------------------------------------------------------------------
// Contacts
// ---------------------------------------------------------------------------

function companyIdOrThrow(ctx: MockContext, companyId: string | null | undefined): string | null {
  if (!companyId) return null;
  return findOr404(ctx, "companies", companyId, "company").id;
}

/** Normalised phones, or 422 INVALID_PHONE / 409 DUPLICATE_PHONE naming who already has the number. */
function phonesOrThrow(ctx: MockContext, phones: PhoneDraft[], exceptContactId: string | null) {
  const normalized = ctx.unwrap(normalizeContactPhones(phones));
  const owner = findPhoneOwner(
    rows(ctx, "contacts"),
    normalized.map((p) => p.e164),
    exceptContactId,
  );
  if (owner) {
    const name = contactName(owner.contact);
    throw new ApiError(
      409,
      "DUPLICATE_PHONE",
      `${formatPhone(owner.e164)} already belongs to ${name}. Open their contact instead of adding a new one.`,
      { contactId: owner.contact.id, contactName: name, phoneE164: owner.e164 },
    );
  }
  return normalized;
}

function openDealsByContact(ctx: MockContext): Map<string, number> {
  const open = openStageIds(ctx);
  const counts = new Map<string, number>();
  for (const deal of rows(ctx, "deals")) {
    if (open.has(deal.stageId)) counts.set(deal.contactId, (counts.get(deal.contactId) ?? 0) + 1);
  }
  return counts;
}

function lastActivityByContact(ctx: MockContext): Map<string, string> {
  const dealContact = new Map(rows(ctx, "deals").map((d) => [d.id, d.contactId]));
  const last = new Map<string, string>();
  for (const activity of rows(ctx, "activities")) {
    const contactId = activity.contactId ?? (activity.dealId ? dealContact.get(activity.dealId) : undefined);
    if (!contactId) continue;
    const current = last.get(contactId);
    if (!current || activity.occurredAt > current) last.set(contactId, activity.occurredAt);
  }
  return last;
}

function touch(ctx: MockContext, contact: Contact) {
  contact.updatedAt = ctx.nowIso;
  ctx.emit({ type: "contact.updated", id: contact.id });
}

/** Import: find a company by name (case-insensitive) or create it. */
function companyByNameFinder(ctx: MockContext) {
  const byName = new Map<string, Company>(rows(ctx, "companies").map((c) => [c.name.trim().toLowerCase(), c]));
  return (name: string | null): string | null => {
    const trimmed = name?.trim();
    if (!trimmed) return null;
    const key = trimmed.toLowerCase();
    const found = byName.get(key);
    if (found) return found.id;
    const company: Company = {
      id: newId(),
      workspaceId: ctx.workspace.id,
      createdAt: ctx.nowIso,
      updatedAt: ctx.nowIso,
      name: trimmed,
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
    ctx.db.companies.push(company);
    byName.set(key, company);
    ctx.emit({ type: "company.updated", id: company.id });
    return company.id;
  };
}

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
          c.jobTitle,
          c.emails.join(" "),
          c.phones.map((p) => `${p.e164} ${formatPhone(p.e164)}`).join(" "),
          c.companyId ? companies.get(c.companyId)?.name : null,
        ),
      )
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    const page = filtered.slice(query.offset, query.offset + query.limit);
    const openDeals = openDealsByContact(ctx);
    const lastActivity = lastActivityByContact(ctx);
    return {
      total: filtered.length,
      items: page.map((c) => ({
        ...c,
        companyName: c.companyId ? (companies.get(c.companyId)?.name ?? null) : null,
        assigneeName: userById(ctx, c.assigneeId)?.name ?? null,
        openDealsCount: openDeals.get(c.id) ?? 0,
        lastActivityAt: lastActivity.get(c.id) ?? null,
      })),
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
      openDealsCount: openDealsByContact(ctx).get(contact.id) ?? 0,
    };
  }),

  handle(api.contacts.create, (ctx, { body }) => {
    const phones = phonesOrThrow(ctx, body.phones, null);
    const contact: Contact = {
      id: newId(),
      workspaceId: ctx.workspace.id,
      createdAt: ctx.nowIso,
      updatedAt: ctx.nowIso,
      firstName: body.firstName,
      lastName: blankToNull(body.lastName),
      phones,
      primaryPhoneE164: phones[0]?.e164 ?? null,
      emails: cleanEmails(body.emails),
      whatsappUserId: null,
      jobTitle: blankToNull(body.jobTitle),
      companyId: companyIdOrThrow(ctx, body.companyId),
      source: body.source,
      notes: blankToNull(body.notes),
      assigneeId: assigneeOrThrow(ctx, body.assigneeId),
      deletedAt: null,
    };
    ctx.db.contacts.push(contact);
    addActivity(ctx, {
      type: "system",
      contactId: contact.id,
      body: "Contact created",
      metadata: { kind: "contact_created" },
    });
    ctx.emit({ type: "contact.updated", id: contact.id });
    return contact;
  }),

  handle(api.contacts.update, (ctx, { params, body }) => {
    const contact = findOr404(ctx, "contacts", params.contactId, "contact");
    if (body.firstName !== undefined) contact.firstName = body.firstName;
    if (body.lastName !== undefined) contact.lastName = blankToNull(body.lastName);
    if (body.phones !== undefined) {
      contact.phones = phonesOrThrow(ctx, body.phones, contact.id);
      contact.primaryPhoneE164 = contact.phones[0]?.e164 ?? null;
    }
    if (body.emails !== undefined) contact.emails = cleanEmails(body.emails);
    if (body.jobTitle !== undefined) contact.jobTitle = blankToNull(body.jobTitle);
    if (body.companyId !== undefined) contact.companyId = companyIdOrThrow(ctx, body.companyId);
    if (body.notes !== undefined) contact.notes = blankToNull(body.notes);
    if (body.assigneeId !== undefined) contact.assigneeId = assigneeOrThrow(ctx, body.assigneeId);
    if (body.source !== undefined) contact.source = body.source;
    touch(ctx, contact);
    return contact;
  }),

  handle(api.contacts.remove, (ctx, { params }) => {
    const contact = findOr404(ctx, "contacts", params.contactId, "contact");
    const openDeals = openDealsByContact(ctx).get(contact.id) ?? 0;
    if (openDeals > 0) {
      throw new ApiError(
        409,
        "CONTACT_HAS_OPEN_DEALS",
        `${contactName(contact)} has ${openDeals === 1 ? "an open deal" : `${openDeals} open deals`}. Mark ${
          openDeals === 1 ? "it" : "them"
        } as won or lost before deleting this contact.`,
      );
    }
    contact.deletedAt = ctx.nowIso;
    touch(ctx, contact);
    return { ok: true as const };
  }),

  handle(api.contacts.importPreview, (ctx, { body }) => {
    if (!mappingHasName(body.mapping)) {
      throw ctx.error("VALIDATION", "Match a column to Full name or First name so each contact has a name.");
    }
    const existing = rows(ctx, "contacts").map((c) => ({
      id: c.id,
      name: contactName(c),
      phones: c.phones.map((p) => p.e164),
      emails: c.emails,
    }));
    return { drafts: buildImportDrafts(body.rows, body.mapping, existing) };
  }),

  handle(api.contacts.importCommit, (ctx, { body }) => {
    const assigneeId = assigneeOrThrow(ctx, body.assigneeId);
    const companyIdFor = companyByNameFinder(ctx);
    const origin = body.fileName ? `from ${body.fileName}` : "from a CSV file";
    const counts = { created: 0, updated: 0, skipped: 0 };

    for (const draft of body.drafts) {
      const firstName = blankToNull(draft.firstName);
      // Re-check on commit: the review may be stale, and drafts come from the browser.
      const phone = draft.phoneE164 ? normalizePhone(draft.phoneE164) : null;
      if (draft.errors.length > 0 || !firstName || (draft.phoneE164 && !phone)) {
        counts.skipped += 1;
        continue;
      }
      const email = blankToNull(draft.email)?.toLowerCase() ?? null;
      const contacts = rows(ctx, "contacts");
      const existing =
        (phone ? contacts.find((c) => c.phones.some((p) => p.e164 === phone)) : undefined) ??
        (email ? contacts.find((c) => c.emails.some((e) => e.toLowerCase() === email)) : undefined);

      if (existing) {
        if (body.duplicates === "skip") {
          counts.skipped += 1;
          continue;
        }
        existing.firstName = firstName;
        existing.lastName = blankToNull(draft.lastName) ?? existing.lastName;
        existing.jobTitle = blankToNull(draft.jobTitle) ?? existing.jobTitle;
        existing.companyId = companyIdFor(draft.companyName) ?? existing.companyId;
        if (phone && !existing.phones.some((p) => p.e164 === phone)) {
          existing.phones = [...existing.phones, { e164: phone, label: "mobile", isWhatsapp: true }];
          existing.primaryPhoneE164 = existing.phones[0]?.e164 ?? phone;
        }
        if (email) existing.emails = cleanEmails([...existing.emails, email]);
        const notes = blankToNull(draft.notes);
        if (notes && !existing.notes?.includes(notes)) {
          existing.notes = existing.notes ? `${existing.notes}\n${notes}` : notes;
        }
        touch(ctx, existing);
        addActivity(ctx, {
          type: "system",
          contactId: existing.id,
          body: `Details updated ${origin}`,
          metadata: { kind: "contact_import_update", rowIndex: draft.rowIndex },
        });
        counts.updated += 1;
        continue;
      }

      const contact: Contact = {
        id: newId(),
        workspaceId: ctx.workspace.id,
        createdAt: ctx.nowIso,
        updatedAt: ctx.nowIso,
        firstName,
        lastName: blankToNull(draft.lastName),
        phones: phone ? [{ e164: phone, label: "mobile", isWhatsapp: true }] : [],
        primaryPhoneE164: phone,
        emails: email ? [email] : [],
        whatsappUserId: null,
        jobTitle: blankToNull(draft.jobTitle),
        companyId: companyIdFor(draft.companyName),
        source: "csv",
        notes: blankToNull(draft.notes),
        assigneeId,
        deletedAt: null,
      };
      ctx.db.contacts.push(contact);
      addActivity(ctx, {
        type: "system",
        contactId: contact.id,
        body: `Imported ${origin}`,
        metadata: { kind: "contact_imported", rowIndex: draft.rowIndex },
      });
      counts.created += 1;
    }
    ctx.emit({ type: "contact.updated", id: null });
    return counts;
  }),
];
