import type { Emirate } from "@hco/shared";

/** Digits only, e.g. "4213785-6" → "42137856". The `trn` name is kept from the UAE build; the value is a Pakistani NTN. */
export function trnDigits(input: string): string {
  return input.replace(/\D/g, "");
}

/** A Pakistani NTN: seven digits and a check digit. */
export function isValidTrn(input: string): boolean {
  return /^\d{8}$/.test(trnDigits(input));
}

/** An NTN grouped the way FBR prints it: 4213785-6. Other input is returned as is. */
export function formatTrn(trn: string | null | undefined): string {
  if (!trn) return "";
  const digits = trnDigits(trn);
  if (digits.length !== 8) return trn;
  return `${digits.slice(0, 7)}-${digits.slice(7)}`;
}

/** Special economic zones and export processing zones per province, offered as suggestions (any name is accepted). */
export const UAE_FREE_ZONES: Record<Emirate, string[]> = {
  punjab: [
    "Quaid-e-Azam Business Park",
    "Sundar Industrial Estate",
    "Allama Iqbal Industrial City (M-3)",
    "Sialkot Export Processing Zone",
    "Vehari Industrial Estate",
  ],
  sindh: ["Karachi Export Processing Zone", "Dhabeji SEZ", "Bin Qasim Industrial Park"],
  khyber_pakhtunkhwa: ["Rashakai SEZ", "Hattar SEZ", "Risalpur Export Processing Zone"],
  balochistan: ["Gwadar Free Zone", "Bostan SEZ", "Hub Industrial Estate"],
  islamabad: ["ICT Model Industrial Zone"],
  gilgit_baltistan: ["Moqpondass SEZ"],
  azad_kashmir: ["Bhimber SEZ", "Mirpur Industrial Estate"],
};

export interface RegistrationLike {
  tradeLicenseNo: string | null;
  trn: string | null;
  emirate: Emirate | null;
  jurisdiction: "mainland" | "free_zone" | null;
  freeZoneName: string | null;
}

/** Registration details still missing, in the order they are shown. A free zone company also needs its zone. */
export function missingRegistrationFields(
  company: RegistrationLike,
): Array<"emirate" | "jurisdiction" | "freeZoneName" | "tradeLicenseNo" | "trn"> {
  const missing: Array<"emirate" | "jurisdiction" | "freeZoneName" | "tradeLicenseNo" | "trn"> = [];
  if (!company.emirate) missing.push("emirate");
  if (!company.jurisdiction) missing.push("jurisdiction");
  if (company.jurisdiction === "free_zone" && !company.freeZoneName?.trim()) missing.push("freeZoneName");
  if (!company.tradeLicenseNo?.trim()) missing.push("tradeLicenseNo");
  if (!company.trn?.trim()) missing.push("trn");
  return missing;
}
