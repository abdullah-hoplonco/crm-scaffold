import type { Company } from "@hco/shared";
import { formatTrn, missingRegistrationFields } from "@hco/core/contacts/registration";
import { Check, Copy, Landmark } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { NotAdded } from "@/features/contacts/ui";
import { cn } from "@/lib/utils";

type Registration = Pick<Company, "emirate" | "jurisdiction" | "freeZoneName" | "tradeLicenseNo" | "trn">;

function useRegistrationValues(company: Registration) {
  const { t } = useTranslation("contacts");
  const { t: tc } = useTranslation();
  const zone = company.freeZoneName?.trim();
  return {
    emirate: company.emirate ? tc(`emirates.${company.emirate}`) : null,
    jurisdiction: company.jurisdiction ? tc(`jurisdiction.${company.jurisdiction}`) : null,
    zone: company.jurisdiction === "free_zone" ? (zone ?? t("registration.zoneMissing")) : null,
    licence: company.tradeLicenseNo?.trim() || null,
    trn: company.trn ? formatTrn(company.trn) : null,
  };
}

function CopyTrnButton({ trn }: { trn: string }) {
  const { t } = useTranslation("contacts");
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      className="-my-1 text-muted-foreground"
      aria-label={t("registration.copyTrn")}
      onClick={() => {
        navigator.clipboard.writeText(trn.replace(/\D/g, "")).then(
          () => toast.success(t("registration.trnCopied")),
          () => toast.error(t("registration.copyFailed")),
        );
      }}
    >
      <Copy />
    </Button>
  );
}

function Cell({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("grid content-start gap-1 px-4 py-3", className)}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-sm font-medium">{children}</dd>
    </div>
  );
}

/**
 * The company's UAE registration at a glance (emirate, mainland or free zone, trade licence, TRN), with
 * a saffron prompt when details that quotes and invoices need are missing.
 */
export function RegistrationPanel({ company, onEdit }: { company: Registration; onEdit?: () => void }) {
  const { t } = useTranslation("contacts");
  const values = useRegistrationValues(company);
  const missing = missingRegistrationFields(company);
  return (
    <section aria-labelledby="registration-title" className="overflow-hidden rounded-lg border bg-card">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2.5">
        <h2 id="registration-title" className="flex items-center gap-2 text-sm font-semibold">
          <Landmark className="size-4 text-primary" aria-hidden="true" />
          {t("registration.title")}
        </h2>
        {missing.length === 0 ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2 py-0.5 text-xs font-medium text-success">
            <Check className="size-3" aria-hidden="true" />
            {t("registration.complete")}
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-warning-soft px-2 py-0.5 text-xs font-medium text-[#6B4700]">
              <span className="size-1.5 rounded-full bg-attention" aria-hidden="true" />
              {t("registration.missing", { count: missing.length })}
            </span>
            {onEdit ? (
              <Button variant="link" size="xs" className="h-auto px-0" onClick={onEdit}>
                {t("registration.addDetails")}
              </Button>
            ) : null}
          </span>
        )}
      </header>
      <dl className="grid grid-cols-2 md:grid-cols-4">
        <Cell label={t("registration.emirate")} className="border-e border-b md:border-b-0">
          {values.emirate ?? <NotAdded />}
        </Cell>
        <Cell label={t("registration.licensedIn")} className="border-b md:border-e md:border-b-0">
          {values.jurisdiction ? (
            <>
              {values.jurisdiction}
              {values.zone ? (
                <span className="block truncate text-sm font-normal text-muted-foreground">{values.zone}</span>
              ) : null}
            </>
          ) : (
            <NotAdded />
          )}
        </Cell>
        <Cell label={t("registration.tradeLicence")} className="border-e">
          {values.licence ? <span className="break-all tabular-nums">{values.licence}</span> : <NotAdded />}
        </Cell>
        <Cell label={t("registration.trn")}>
          {values.trn ? (
            <span className="flex items-center gap-1">
              <span className="tracking-wide whitespace-nowrap tabular-nums">{values.trn}</span>
              <CopyTrnButton trn={values.trn} />
            </span>
          ) : (
            <NotAdded />
          )}
        </Cell>
      </dl>
    </section>
  );
}

/** Compact, stacked registration details for side panels (e.g. the company card on a contact). */
export function RegistrationList({ company }: { company: Registration }) {
  const { t } = useTranslation("contacts");
  const values = useRegistrationValues(company);
  const rows: Array<[string, ReactNode]> = [
    [t("registration.emirate"), values.emirate],
    [
      t("registration.licensedIn"),
      values.jurisdiction ? (values.zone ? `${values.jurisdiction}, ${values.zone}` : values.jurisdiction) : null,
    ],
    [t("registration.tradeLicence"), values.licence],
    [t("registration.trn"), values.trn],
  ];
  return (
    <dl className="grid gap-2.5">
      {rows.map(([label, value]) => (
        <div key={label} className="flex items-baseline justify-between gap-4 text-sm">
          <dt className="shrink-0 text-muted-foreground">{label}</dt>
          <dd className="min-w-0 text-end font-medium break-words tabular-nums">
            {value ?? <NotAdded />}
          </dd>
        </div>
      ))}
    </dl>
  );
}
