import type { ImportDraft, ImportField } from "@hco/shared/api/contacts";
import { normalizePhone } from "../phone";

/** First pattern that matches a normalised header wins, so the more specific fields come first. */
const HEADER_HINTS: Array<[Exclude<ImportField, "ignore">, RegExp]> = [
  ["firstName", /^(first ?name|given ?name|first|forename|fname)$/],
  ["lastName", /^(last ?name|surname|family ?name|last|lname)$/],
  ["email", /\be-?mail\b/],
  ["phone", /(phone|mobile|whats ?app|\bcell\b|\btel\b|telephone|contact (no|number)|^number$|^msisdn$)/],
  ["companyName", /(company|organi[sz]ation|employer|business|\bfirm\b)/],
  ["jobTitle", /(job|title|position|designation|occupation|\brole\b)/],
  ["fullName", /^((full|patient|customer|client|contact) ?name|name|patient|customer|client|contact)$/],
  ["notes", /(notes?|comments?|remarks?)$/],
];

function normaliseHeader(header: string): string {
  return header
    .toLowerCase()
    .replace(/[_\-.:/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Best guess for one spreadsheet column, e.g. "Mobile" → phone, "Patient name" → fullName. */
export function guessImportField(header: string): ImportField {
  const h = normaliseHeader(header);
  return HEADER_HINTS.find(([, pattern]) => pattern.test(h))?.[0] ?? "ignore";
}

/** Guess every column; a field already taken by an earlier column is not reused. */
export function guessImportMapping(headers: readonly string[]): Record<string, ImportField> {
  const taken = new Set<ImportField>();
  const mapping: Record<string, ImportField> = {};
  for (const header of headers) {
    const field = guessImportField(header);
    mapping[header] = field !== "ignore" && taken.has(field) ? "ignore" : field;
    taken.add(mapping[header]);
  }
  return mapping;
}

/** A mapping can import only when some column gives each row a name. */
export function mappingHasName(mapping: Record<string, ImportField>): boolean {
  return Object.values(mapping).some((f) => f === "fullName" || f === "firstName");
}

const HONORIFIC = /^(dr|mr|mrs|ms|miss|mx|prof|sheikh|sheikha)\.?\s+/i;

/** "Dr. Layla Haddad" → Layla / Haddad; "Mohammed Al Hashimi" → Mohammed / Al Hashimi. */
export function splitFullName(fullName: string): { firstName: string | null; lastName: string | null } {
  const parts = fullName.replace(HONORIFIC, "").trim().split(/\s+/).filter(Boolean);
  const [first, ...rest] = parts;
  return { firstName: first ?? null, lastName: rest.length ? rest.join(" ") : null };
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface ExistingContactRef {
  id: string;
  name: string;
  phones: readonly string[];
  emails: readonly string[];
}

/** Spreadsheet row number of a data row: the header is row 1, so the first data row is row 2. */
export function sheetRowNumber(rowIndex: number): number {
  return rowIndex + 2;
}

/**
 * Turn spreadsheet rows into contact drafts: apply the column mapping, split full names, normalise
 * phones (UAE by default) and flag problems. A row is a duplicate when its phone (or, without a
 * phone match, its email) belongs to an existing contact; the same phone twice in the file is an error
 * on the later row. Rows with nothing mapped in them are left out.
 */
export function buildImportDrafts(
  rows: ReadonlyArray<Record<string, string>>,
  mapping: Record<string, ImportField>,
  existing: readonly ExistingContactRef[],
): ImportDraft[] {
  const byPhone = new Map<string, ExistingContactRef>();
  const byEmail = new Map<string, ExistingContactRef>();
  for (const contact of existing) {
    for (const phone of contact.phones) if (!byPhone.has(phone)) byPhone.set(phone, contact);
    for (const email of contact.emails) {
      const key = email.trim().toLowerCase();
      if (key && !byEmail.has(key)) byEmail.set(key, contact);
    }
  }
  const phoneSeenAt = new Map<string, number>();
  const emailSeenAt = new Map<string, number>();
  const drafts: ImportDraft[] = [];

  rows.forEach((row, rowIndex) => {
    const values: Partial<Record<ImportField, string>> = {};
    for (const [column, field] of Object.entries(mapping)) {
      if (field === "ignore") continue;
      const value = (row[column] ?? "").trim();
      if (!value) continue;
      values[field] = field === "notes" && values.notes ? `${values.notes}\n${value}` : (values[field] ?? value);
    }
    if (Object.keys(values).length === 0) return;

    const split = values.fullName ? splitFullName(values.fullName) : { firstName: null, lastName: null };
    const firstName = values.firstName ?? split.firstName;
    const lastName = values.lastName ?? (values.firstName ? null : split.lastName);
    const errors: string[] = [];
    if (!firstName) errors.push("Name is missing");

    let phoneE164: string | null = null;
    if (values.phone) {
      phoneE164 = normalizePhone(values.phone);
      if (!phoneE164) errors.push(`"${values.phone}" isn't a valid phone number.`);
    }
    let email: string | null = null;
    if (values.email) {
      if (EMAIL.test(values.email)) email = values.email.toLowerCase();
      else errors.push(`"${values.email}" isn't a valid email address.`);
    }

    const earlierRow =
      (phoneE164 ? phoneSeenAt.get(phoneE164) : undefined) ??
      (!phoneE164 && email ? emailSeenAt.get(email) : undefined);
    if (earlierRow !== undefined) {
      errors.push(
        `Same ${phoneE164 ? "phone" : "email"} as row ${sheetRowNumber(earlierRow)} of this file.`,
      );
    } else {
      if (phoneE164) phoneSeenAt.set(phoneE164, rowIndex);
      if (email && !emailSeenAt.has(email)) emailSeenAt.set(email, rowIndex);
    }

    const duplicate = (phoneE164 ? byPhone.get(phoneE164) : undefined) ?? (email ? byEmail.get(email) : undefined);

    drafts.push({
      rowIndex,
      firstName,
      lastName,
      phoneE164,
      email,
      jobTitle: values.jobTitle ?? null,
      companyName: values.companyName ?? null,
      notes: values.notes ?? null,
      duplicateOfContactId: duplicate?.id ?? null,
      duplicateOfContactName: duplicate?.name ?? null,
      errors,
    });
  });
  return drafts;
}

export type ImportDraftStatus = "new" | "duplicate" | "error";

/** How a reviewed draft will be treated: errors are skipped, duplicates follow the skip/update choice. */
export function importDraftStatus(draft: Pick<ImportDraft, "errors" | "duplicateOfContactId">): ImportDraftStatus {
  if (draft.errors.length > 0) return "error";
  return draft.duplicateOfContactId ? "duplicate" : "new";
}
