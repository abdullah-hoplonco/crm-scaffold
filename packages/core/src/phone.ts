import { parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js/max";

/**
 * Normalise any written phone number to E.164. Numbers without a country code are read
 * as UAE numbers; numbers with one keep it. Returns null when the number is not valid.
 */
export function normalizePhone(
  input: string | null | undefined,
  defaultRegion: CountryCode = "AE",
): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  const candidate = trimmed.startsWith("00") ? `+${trimmed.slice(2)}` : trimmed;
  const parsed = parsePhoneNumberFromString(candidate, defaultRegion);
  if (!parsed || !parsed.isValid()) return null;
  return parsed.number;
}

/** Human display, e.g. +971 50 123 4567. Falls back to the input. */
export function formatPhone(e164: string | null | undefined): string {
  if (!e164) return "";
  const parsed = parsePhoneNumberFromString(e164);
  return parsed ? parsed.formatInternational() : e164;
}

export function isMobile(e164: string): boolean {
  const type = parsePhoneNumberFromString(e164)?.getType();
  return type === "MOBILE" || type === "FIXED_LINE_OR_MOBILE";
}
