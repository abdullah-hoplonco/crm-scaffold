import { interestFromFormFields } from "@hco/core/leads/views";
import { api, Emirate, MoneyAed } from "@hco/shared";
import type { LeadDetail } from "@hco/shared/api/leads";
import { useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { CompanyPicker } from "@/features/companies/CompanyPicker";
import { ContactPicker } from "@/features/contacts/ContactPicker";
import { errorMessage, isApiError } from "@/lib/api/errors";
import { useApiMutation, useApiQuery } from "@/lib/api/hooks";
import { formatPhone } from "@/lib/format";

type ContactMode = "new" | "existing";
type CompanyMode = "none" | "new" | "existing";
const NO_EMIRATE = "__none__";

function splitName(name: string): { first: string; last: string } {
  const parts = name.trim().split(/\s+/);
  return { first: parts[0] ?? "", last: parts.slice(1).join(" ") };
}

/** Lead → contact (+ company) + deal in one step. */
export function ConvertLeadDialog({
  detail,
  open,
  onOpenChange,
}: {
  detail: LeadDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation("leads");
  const navigate = useNavigate();
  const { lead, matchedContact } = detail;
  const pipeline = useApiQuery(api.pipeline.getDefault, {}, { enabled: open });
  const openStages = (pipeline.data?.stages ?? []).filter((s) => s.type === "open");
  const interest = interestFromFormFields(lead.formFields);
  const name = splitName(lead.name);

  const [contactMode, setContactMode] = useState<ContactMode>(matchedContact ? "existing" : "new");
  const [firstName, setFirstName] = useState(name.first);
  const [lastName, setLastName] = useState(name.last);
  const [phone, setPhone] = useState(lead.phoneE164 ? formatPhone(lead.phoneE164) : "");
  const [email, setEmail] = useState(lead.email ?? "");
  const [contactId, setContactId] = useState<string | null>(matchedContact?.id ?? null);
  const [contactLabel, setContactLabel] = useState<string | null>(
    matchedContact ? [matchedContact.firstName, matchedContact.lastName].filter(Boolean).join(" ") : null,
  );

  const [companyMode, setCompanyMode] = useState<CompanyMode>(lead.companyName ? "new" : "none");
  const [companyName, setCompanyName] = useState(lead.companyName ?? "");
  const [emirate, setEmirate] = useState<string>(NO_EMIRATE);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [companyLabel, setCompanyLabel] = useState<string | null>(null);

  const [title, setTitle] = useState(interest ? `${interest} — ${lead.name}` : lead.name);
  const [value, setValue] = useState("");
  const [stageId, setStageId] = useState<string>("");
  const [closeDate, setCloseDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [duplicate, setDuplicate] = useState(false);

  const convert = useApiMutation(api.leads.convert, {
    onSuccess: ({ dealId }) => {
      const openDeal = () => void navigate({ to: "/deals/$dealId", params: { dealId } });
      toast.success(t("convert.done"), { action: { label: t("convert.openDeal"), onClick: openDeal } });
      onOpenChange(false);
      openDeal();
    },
    onError: (e) => {
      setError(errorMessage(e));
      setDuplicate(isApiError(e, "DUPLICATE_PHONE"));
    },
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setDuplicate(false);
    const amount = value.replace(/[,\s]/g, "").replace(/^AED/i, "");
    if (contactMode === "new" && !firstName.trim()) return setError(t("convert.errors.firstName"));
    if (contactMode === "existing" && !contactId) return setError(t("convert.errors.contact"));
    if (companyMode === "new" && !companyName.trim()) return setError(t("convert.errors.companyName"));
    if (companyMode === "existing" && !companyId) return setError(t("convert.errors.company"));
    if (!title.trim()) return setError(t("convert.errors.title"));
    if (!MoneyAed.safeParse(amount).success) return setError(t("convert.errors.value"));

    convert.mutate({
      params: { leadId: lead.id },
      body: {
        contact:
          contactMode === "existing" && contactId
            ? { mode: "existing", contactId }
            : {
                mode: "new",
                firstName: firstName.trim(),
                lastName: lastName.trim() || null,
                phone: phone.trim() || null,
                email: email.trim() || null,
              },
        company:
          companyMode === "existing" && companyId
            ? { mode: "existing", companyId }
            : companyMode === "new"
              ? {
                  mode: "new",
                  name: companyName.trim(),
                  emirate: emirate === NO_EMIRATE ? null : (emirate as Emirate),
                }
              : null,
        deal: {
          title: title.trim(),
          valueAed: amount,
          stageId: stageId || undefined,
          expectedCloseDate: closeDate || null,
        },
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
        <DialogHeader className="border-b px-5 pt-5 pb-4 text-start sm:px-6">
          <DialogTitle>{t("convert.title", { name: lead.name })}</DialogTitle>
          <DialogDescription>{t("convert.description")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col" noValidate>
          <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)] gap-6 overflow-y-auto px-5 py-5 sm:px-6">
            <Section title={t("convert.contact")}>
              <Segmented
                label={t("convert.contact")}
                value={contactMode}
                onChange={(v) => setContactMode(v as ContactMode)}
                options={[
                  { value: "new", label: t("convert.newContact") },
                  { value: "existing", label: t("convert.existingContact") },
                ]}
              />
              {contactMode === "new" ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field id="cv-first" label={t("convert.firstName")}>
                    <Input id="cv-first" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                  </Field>
                  <Field id="cv-last" label={t("convert.lastName")}>
                    <Input id="cv-last" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                  </Field>
                  <Field id="cv-phone" label={t("convert.phone")}>
                    <Input
                      id="cv-phone"
                      type="tel"
                      inputMode="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </Field>
                  <Field id="cv-email" label={t("convert.email")}>
                    <Input id="cv-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                  </Field>
                </div>
              ) : (
                <div className="grid gap-2">
                  {contactLabel ? (
                    <p className="text-sm">
                      {t("convert.linkingTo")} <span className="font-medium">{contactLabel}</span>
                    </p>
                  ) : null}
                  <Label htmlFor="cv-contact" className="sr-only">
                    {t("convert.findContact")}
                  </Label>
                  <ContactPicker
                    id="cv-contact"
                    value={contactId}
                    onChange={(id, label) => {
                      setContactId(id);
                      setContactLabel(label);
                    }}
                  />
                </div>
              )}
            </Section>

            <Section title={t("convert.company")} hint={t("add.optional")}>
              <Segmented
                label={t("convert.company")}
                value={companyMode}
                onChange={(v) => setCompanyMode(v as CompanyMode)}
                options={[
                  { value: "none", label: t("convert.noCompany") },
                  { value: "new", label: t("convert.newCompany") },
                  { value: "existing", label: t("convert.existingCompany") },
                ]}
              />
              {companyMode === "new" ? (
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_11rem]">
                  <Field id="cv-company" label={t("convert.companyName")}>
                    <Input id="cv-company" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
                  </Field>
                  <Field id="cv-emirate" label={t("convert.emirate")}>
                    <Select value={emirate} onValueChange={setEmirate}>
                      <SelectTrigger id="cv-emirate" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NO_EMIRATE}>{t("common:states.none")}</SelectItem>
                        {Emirate.options.map((e) => (
                          <SelectItem key={e} value={e}>
                            {t(`common:emirates.${e}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
              ) : companyMode === "existing" ? (
                <div className="grid gap-2">
                  {companyLabel ? (
                    <p className="text-sm">
                      {t("convert.linkingTo")} <span className="font-medium">{companyLabel}</span>
                    </p>
                  ) : null}
                  <Label htmlFor="cv-company-pick" className="sr-only">
                    {t("convert.findCompany")}
                  </Label>
                  <CompanyPicker
                    id="cv-company-pick"
                    value={companyId}
                    onChange={(id, label) => {
                      setCompanyId(id);
                      setCompanyLabel(label);
                    }}
                  />
                </div>
              ) : null}
            </Section>

            <Section title={t("convert.deal")}>
              <Field id="cv-title" label={t("convert.dealTitle")}>
                <Input id="cv-title" value={title} onChange={(e) => setTitle(e.target.value)} />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field id="cv-value" label={t("convert.value")}>
                  <div className="relative">
                    <span className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      AED
                    </span>
                    <Input
                      id="cv-value"
                      inputMode="decimal"
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                      placeholder="0"
                      className="ps-12 tabular-nums"
                    />
                  </div>
                </Field>
                <Field id="cv-stage" label={t("convert.stage")}>
                  <Select value={stageId || openStages[0]?.id || ""} onValueChange={setStageId}>
                    <SelectTrigger id="cv-stage" className="w-full" disabled={!openStages.length}>
                      <SelectValue placeholder={t("common:states.loading")} />
                    </SelectTrigger>
                    <SelectContent>
                      {openStages.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field id="cv-close" label={t("convert.closeDate")} hint={t("add.optional")}>
                  <Input id="cv-close" type="date" value={closeDate} onChange={(e) => setCloseDate(e.target.value)} />
                </Field>
              </div>
            </Section>

            {error ? (
              <div role="alert" className="flex flex-col items-start gap-2 rounded-md bg-danger-soft px-3 py-2 text-sm text-destructive">
                <p>{error}</p>
                {duplicate && contactMode === "new" ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setContactMode("existing");
                      setError(null);
                      setDuplicate(false);
                    }}
                  >
                    {t("convert.useExisting")}
                  </Button>
                ) : null}
              </div>
            ) : null}
          </div>
          <DialogFooter className="border-t px-5 py-4 sm:px-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("common:actions.cancel")}
            </Button>
            <Button type="submit" disabled={convert.isPending}>
              {convert.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              {t("convert.submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="grid gap-3">
      <h3 className="text-sm font-semibold">
        {title} {hint ? <span className="font-normal text-muted-foreground">{hint}</span> : null}
      </h3>
      {children}
    </section>
  );
}

function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>
        {label} {hint ? <span className="font-normal text-muted-foreground">{hint}</span> : null}
      </Label>
      {children}
    </div>
  );
}

function Segmented({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      value={value}
      onValueChange={(v) => {
        if (v) onChange(v);
      }}
      aria-label={label}
      className="w-full sm:w-fit"
    >
      {options.map((o) => (
        <ToggleGroupItem
          key={o.value}
          value={o.value}
          className="min-w-0 flex-1 shrink data-[state=on]:border-primary/50 data-[state=on]:font-semibold sm:flex-none sm:px-4"
        >
          {o.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
