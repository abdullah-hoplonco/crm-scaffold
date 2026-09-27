import type { Company } from "@hco/shared";
import { useTranslation } from "react-i18next";

type Place = Pick<Company, "emirate" | "jurisdiction" | "freeZoneName">;

/** Where a company is registered, for one-line lists: "Sindh, Dhabeji SEZ", "Punjab", "SEZ / EPZ". */
export function useCompanyMeta() {
  const { t } = useTranslation("contacts");
  const { t: tc } = useTranslation();
  return (company: Place): string => {
    const zone = company.freeZoneName?.trim();
    if (!company.emirate) {
      if (company.jurisdiction === "free_zone" && zone) return zone;
      return company.jurisdiction
        ? tc(`jurisdiction.${company.jurisdiction}`)
        : t("companies.noRegistration");
    }
    const emirate = tc(`emirates.${company.emirate}`);
    if (company.jurisdiction === "free_zone") {
      return t("companies.placeMeta", { emirate, where: zone || t("companies.freeZoneLower") });
    }
    // A standard (non-zone) registration is the norm in Pakistan, so the province alone says it.
    return emirate;
  };
}
