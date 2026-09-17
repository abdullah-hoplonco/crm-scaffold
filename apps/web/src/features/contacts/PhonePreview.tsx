import { formatPhone, normalizePhone } from "@hco/core";
import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";

export function isValidPhone(value: string): boolean {
  return normalizePhone(value) !== null;
}

/**
 * Live feedback under a phone input: how the number will be saved ("+971 50 123 4567") or, once the
 * person has left the field, that it isn't a valid number.
 */
export function PhonePreview({ id, value, showInvalid }: { id: string; value: string; showInvalid: boolean }) {
  const { t } = useTranslation("contacts");
  const trimmed = value.trim();
  if (!trimmed) return null;
  const e164 = normalizePhone(trimmed);
  if (e164) {
    const formatted = formatPhone(e164);
    if (formatted === trimmed) return null;
    return (
      <p id={id} className="flex items-center gap-1 text-xs text-muted-foreground">
        <Check className="size-3 text-success" aria-hidden="true" />
        {t("phone.savedAs", { phone: formatted })}
      </p>
    );
  }
  if (!showInvalid) return null;
  return (
    <p id={id} className="text-xs text-destructive">
      {t("phone.invalid")}
    </p>
  );
}
