import type { Emirate } from "@hco/shared";

/** Digits only, e.g. "100-4583-9270-0003" → "100458392700003". */
export function trnDigits(input: string): string {
  return input.replace(/\D/g, "");
}

export function isValidTrn(input: string): boolean {
  return /^\d{15}$/.test(trnDigits(input));
}

/** A UAE TRN grouped the way tax certificates print it: 100-4583-9270-0003. Other input is returned as is. */
export function formatTrn(trn: string | null | undefined): string {
  if (!trn) return "";
  const digits = trnDigits(trn);
  if (digits.length !== 15) return trn;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}-${digits.slice(11)}`;
}

/** Common free zones per emirate, offered as suggestions (any name is accepted). */
export const UAE_FREE_ZONES: Record<Emirate, string[]> = {
  dubai: [
    "DMCC",
    "JAFZA",
    "DIFC",
    "DAFZA",
    "Dubai South",
    "Dubai Silicon Oasis",
    "Dubai Internet City",
    "Dubai Media City",
    "Dubai Healthcare City",
    "Meydan Free Zone",
    "IFZA",
  ],
  abu_dhabi: ["ADGM", "KEZAD", "Masdar City Free Zone", "twofour54", "Abu Dhabi Airport Free Zone"],
  sharjah: ["SAIF Zone", "Hamriyah Free Zone", "SHAMS", "SRTI Park"],
  ajman: ["Ajman Free Zone", "Ajman Media City Free Zone"],
  umm_al_quwain: ["UAQ Free Trade Zone"],
  ras_al_khaimah: ["RAKEZ", "RAK Maritime City"],
  fujairah: ["Fujairah Free Zone", "Creative City Fujairah"],
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
