/** UAE Tax Registration Number helpers. A TRN is 15 digits, shown as 100-4583-9270-0003. */

export const TRN_LENGTH = 15;

export function trnDigits(input: string): string {
  return input.replace(/\D/g, "").slice(0, TRN_LENGTH);
}

/** Groups digits 3-4-4-4 as they are typed, e.g. "1004583" → "100-4583". */
export function formatTrn(input: string | null | undefined): string {
  const digits = trnDigits(input ?? "");
  return [digits.slice(0, 3), digits.slice(3, 7), digits.slice(7, 11), digits.slice(11, 15)]
    .filter(Boolean)
    .join("-");
}

export function isValidTrn(input: string): boolean {
  return trnDigits(input).length === TRN_LENGTH && /^[\d\s-]+$/.test(input.trim());
}
