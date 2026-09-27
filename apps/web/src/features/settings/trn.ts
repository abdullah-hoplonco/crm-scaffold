/**
 * Pakistani National Tax Number (NTN) helpers. The `trn` names are kept from the UAE build.
 * An NTN is seven digits and a check digit, shown as 4213785-6.
 */

export const TRN_LENGTH = 8;

export function trnDigits(input: string): string {
  return input.replace(/\D/g, "").slice(0, TRN_LENGTH);
}

/** Adds the check-digit dash as the number is typed, e.g. "42137856" → "4213785-6". */
export function formatTrn(input: string | null | undefined): string {
  const digits = trnDigits(input ?? "");
  return [digits.slice(0, 7), digits.slice(7, 8)].filter(Boolean).join("-");
}

export function isValidTrn(input: string): boolean {
  return trnDigits(input).length === TRN_LENGTH && /^[\d\s-]+$/.test(input.trim());
}
