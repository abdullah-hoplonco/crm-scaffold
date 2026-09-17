import type { Company } from "@hco/shared";
import { useTranslation } from "react-i18next";

type Place = Pick<Company, "emirate" | "jurisdiction" | "freeZoneName">;

/** Where a company is licensed, for one-line lists: "Dubai, JAFZA", "Sharjah, mainland", "Free zone". */
export function useCompanyMeta() {
  const { t } = useTranslation("contacts");
  const { t: tc } = useTranslation();
  return (company: Place): string => {
    const zone = company.freeZoneName?.trim();
    if (!company.emirate) {
      if (company.jurisdiction === "free_zone" && zone) return zone;
      return company.jurisdiction ? tc(`jurisdiction.${company.jurisdiction}`) : t("companies.noRegistration");
    }
    const emirate = tc(`emirates.${company.emirate}`);
    if (company.jurisdiction === "free_zone") {
      return t("companies.placeMeta", { emirate, where: zone || t("companies.freeZoneLower") });
    }
    if (company.jurisdiction === "mainland") {
      return t("companies.placeMeta", { emirate, where: t("companies.mainlandLower") });
    }
    return emirate;
  };
}
