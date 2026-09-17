import type { PhoneLabel } from "@hco/shared";
import { normalizePhone } from "../phone";
import { fail, ok, type Result } from "../result";

export interface PhoneDraft {
  number: string;
  label: PhoneLabel;
  isWhatsapp: boolean;
}

export interface NormalizedPhone {
  e164: string;
  label: PhoneLabel;
  isWhatsapp: boolean;
}

/** Why a written number was rejected, phrased so the person can fix it. */
export function invalidPhoneMessage(input: string): string {
  return `"${input.trim()}" isn't a valid phone number. Use a UAE number like 050 123 4567, or add the country code for other countries.`;
}

/**
 * Normalise every phone of a contact to E.164 (numbers without a country code are UAE numbers).
 * Blank entries are dropped, and so are repeats of a number already in the list.
 */
export function normalizeContactPhones(phones: PhoneDraft[]): Result<NormalizedPhone[]> {
  const out: NormalizedPhone[] = [];
  const seen = new Set<string>();
  for (const phone of phones) {
    if (!phone.number.trim()) continue;
    const e164 = normalizePhone(phone.number);
    if (!e164) return fail("INVALID_PHONE", invalidPhoneMessage(phone.number));
    if (seen.has(e164)) continue;
    seen.add(e164);
    out.push({ e164, label: phone.label, isWhatsapp: phone.isWhatsapp });
  }
  return ok(out);
}

/** The first other contact already using one of these numbers (identity is by phone). */
export function findPhoneOwner<T extends { id: string; phones: Array<{ e164: string }> }>(
  contacts: readonly T[],
  e164s: readonly string[],
  exceptContactId?: string | null,
): { contact: T; e164: string } | null {
  for (const e164 of e164s) {
    const contact = contacts.find(
      (c) => c.id !== exceptContactId && c.phones.some((phone) => phone.e164 === e164),
    );
    if (contact) return { contact, e164 };
  }
  return null;
}

/** Trimmed emails without repeats (compared case-insensitively), in the order given. */
export function cleanEmails(emails: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const email of emails) {
    const trimmed = email.trim();
    const key = trimmed.toLowerCase();
    if (!trimmed || seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}
