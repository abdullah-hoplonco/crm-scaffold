import { z } from "zod";
import { isApiError } from "@/lib/api/errors";

const DuplicatePhoneDetails = z.object({ contactId: z.string(), contactName: z.string() });
const DuplicateCompanyDetails = z.object({ companyId: z.string(), companyName: z.string() });

/** The existing contact named by a 409 DUPLICATE_PHONE, if that is what the error is. */
export function duplicatePhoneOwner(error: unknown): { contactId: string; contactName: string } | null {
  if (!isApiError(error, "DUPLICATE_PHONE")) return null;
  const parsed = DuplicatePhoneDetails.safeParse(error.details);
  return parsed.success ? parsed.data : null;
}

/** The existing company named by a 409 DUPLICATE_COMPANY, if that is what the error is. */
export function duplicateCompany(error: unknown): { companyId: string; companyName: string } | null {
  if (!isApiError(error, "DUPLICATE_COMPANY")) return null;
  const parsed = DuplicateCompanyDetails.safeParse(error.details);
  return parsed.success ? parsed.data : null;
}
