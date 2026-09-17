import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

/** Label, control, then help or the error that replaces it. */
export function Field({
  id,
  label,
  optional,
  help,
  error,
  children,
}: {
  id: string;
  label: string;
  optional?: boolean;
  help?: string;
  error?: string;
  children: ReactNode;
}) {
  const { t } = useTranslation("settings");
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="flex items-baseline gap-2 text-sm font-medium">
        {label}
        {optional ? (
          <span className="text-xs font-normal text-muted-foreground">{t("onboarding.optional")}</span>
        ) : null}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-sm text-destructive">
          {t(error)}
        </p>
      ) : help ? (
        <p id={`${id}-help`} className="text-sm text-muted-foreground">
          {help}
        </p>
      ) : null}
    </div>
  );
}

/** aria props that connect an input to its Field's error or help text. */
export function describedBy(id: string, error: string | undefined, hasHelp = false) {
  return {
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error ? `${id}-error` : hasHelp ? `${id}-help` : undefined,
  } as const;
}
