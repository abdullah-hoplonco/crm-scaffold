import { api, Emirate, Jurisdiction, type Company } from "@hco/shared";
import { formatTrn, isValidTrn, trnDigits, UAE_FREE_ZONES } from "@hco/core/contacts/registration";
import { Link } from "@tanstack/react-router";
import { AlertCircle } from "lucide-react";
import { useId, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { AssigneeSelect } from "@/components/app/AssigneeSelect";
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
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { duplicateCompany } from "@/features/contacts/errors";
import { errorMessage } from "@/lib/api/errors";
import { useApiMutation } from "@/lib/api/hooks";

const NO_EMIRATE = "__none__";
const INDUSTRIES = [
  "Construction",
  "Education",
  "Events",
  "Financial services",
  "Healthcare",
  "Hospitality",
  "Logistics",
  "Manufacturing",
  "Marine services",
  "Real estate",
  "Retail",
  "Technology",
  "Trading",
];

/** New company, or edit when `company` is given. The form starts fresh every time the dialog opens. */
export function CompanyFormDialog({
  open,
  onOpenChange,
  company,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company?: Company | null;
  onSaved?: (company: Company) => void;
}) {
  const [session, setSession] = useState(0);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setSession((s) => s + 1);
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto p-0 sm:max-w-xl">
        <CompanyForm
          key={session}
          company={company ?? null}
          onCancel={() => onOpenChange(false)}
          onSaved={(saved) => {
            onOpenChange(false);
            onSaved?.(saved);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

function CompanyForm({
  company,
  onCancel,
  onSaved,
}: {
  company: Company | null;
  onCancel: () => void;
  onSaved: (company: Company) => void;
}) {
  const { t } = useTranslation("contacts");
  const { t: tc } = useTranslation();
  const formId = useId();
  const isEdit = company !== null;

  const [name, setName] = useState(company?.name ?? "");
  const [industry, setIndustry] = useState(company?.industry ?? "");
  const [emirate, setEmirate] = useState<Emirate | null>(company?.emirate ?? null);
  const [jurisdiction, setJurisdiction] = useState<Jurisdiction | null>(company?.jurisdiction ?? null);
  const [freeZoneName, setFreeZoneName] = useState(company?.freeZoneName ?? "");
  const [tradeLicenseNo, setTradeLicenseNo] = useState(company?.tradeLicenseNo ?? "");
  const [trn, setTrn] = useState(company?.trn ? formatTrn(company.trn) : "");
  const [website, setWebsite] = useState(company?.website ?? "");
  const [address, setAddress] = useState(company?.address ?? "");
  const [assigneeId, setAssigneeId] = useState<string | null>(company?.assigneeId ?? null);
  const [submitted, setSubmitted] = useState(false);
  const [trnTouched, setTrnTouched] = useState(false);

  const create = useApiMutation(api.companies.create);
  const update = useApiMutation(api.companies.update);
  const mutation = isEdit ? update : create;
  const existing = duplicateCompany(mutation.error);

  const nameMissing = submitted && !name.trim();
  const trnInvalid = trn.trim() !== "" && !isValidTrn(trn);
  const showTrnError = (trnTouched || submitted) && trnInvalid;
  const zones = emirate ? UAE_FREE_ZONES[emirate] : Object.values(UAE_FREE_ZONES).flat();

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (!name.trim() || trnInvalid) return;
    const body = {
      name: name.trim(),
      industry: industry.trim() || null,
      emirate,
      jurisdiction,
      freeZoneName: jurisdiction === "free_zone" ? freeZoneName.trim() || null : null,
      tradeLicenseNo: tradeLicenseNo.trim() || null,
      trn: trn.trim() ? trnDigits(trn) : null,
      website: website.trim() || null,
      address: address.trim() || null,
      assigneeId,
    };
    const done = (saved: Company) => {
      toast.success(isEdit ? t("companyForm.saved") : t("companyForm.created", { name: saved.name }));
      onSaved(saved);
    };
    if (company) update.mutate({ params: { companyId: company.id }, body }, { onSuccess: done });
    else create.mutate({ body }, { onSuccess: done });
  };

  return (
    <form onSubmit={submit} noValidate>
      <DialogHeader className="border-b px-5 pt-5 pb-4 text-start sm:px-6">
        <DialogTitle>{isEdit ? t("companyForm.editTitle") : t("companyForm.newTitle")}</DialogTitle>
        <DialogDescription>{t("companyForm.description")}</DialogDescription>
      </DialogHeader>

      <div className="grid gap-5 px-5 py-5 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-[3fr_2fr]">
          <div className="grid content-start gap-1.5">
            <Label htmlFor={`${formId}-name`}>{t("companyForm.name")}</Label>
            <Input
              id={`${formId}-name`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("companyForm.namePlaceholder")}
              aria-invalid={nameMissing || undefined}
              autoComplete="off"
              autoFocus={!isEdit}
            />
            {nameMissing ? <p className="text-xs text-destructive">{t("companyForm.nameRequired")}</p> : null}
          </div>
          <div className="grid content-start gap-1.5">
            <Label htmlFor={`${formId}-industry`}>{t("companyForm.industry")}</Label>
            <Input
              id={`${formId}-industry`}
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              list={`${formId}-industries`}
              autoComplete="off"
            />
            <datalist id={`${formId}-industries`}>
              {INDUSTRIES.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
          </div>
        </div>

        <fieldset className="grid gap-4 rounded-lg border bg-muted/30 p-4">
          <legend className="px-1 text-sm font-semibold">{t("registration.title")}</legend>
          <p className="-mt-2 text-xs text-muted-foreground">{t("companyForm.registrationHint")}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid content-start gap-1.5">
              <Label htmlFor={`${formId}-emirate`}>{t("companyForm.emirate")}</Label>
              <Select
                value={emirate ?? NO_EMIRATE}
                onValueChange={(value) => setEmirate(value === NO_EMIRATE ? null : Emirate.parse(value))}
              >
                <SelectTrigger id={`${formId}-emirate`} className="w-full bg-card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_EMIRATE}>{t("companyForm.chooseEmirate")}</SelectItem>
                  {Emirate.options.map((option) => (
                    <SelectItem key={option} value={option}>
                      {tc(`emirates.${option}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid content-start gap-1.5" role="group" aria-labelledby={`${formId}-jurisdiction`}>
              <span id={`${formId}-jurisdiction`} className="text-sm leading-none font-medium">
                {t("companyForm.licensedIn")}
              </span>
              <ToggleGroup
                type="single"
                variant="outline"
                value={jurisdiction ?? ""}
                onValueChange={(value) => setJurisdiction(value ? Jurisdiction.parse(value) : null)}
                className="w-full bg-card"
              >
                {Jurisdiction.options.map((option) => (
                  <ToggleGroupItem
                    key={option}
                    value={option}
                    className="flex-1 data-[state=on]:bg-accent data-[state=on]:font-semibold"
                  >
                    {tc(`jurisdiction.${option}`)}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>
          </div>
          {jurisdiction === "free_zone" ? (
            <div className="grid content-start gap-1.5">
              <Label htmlFor={`${formId}-zone`}>{t("companyForm.freeZoneName")}</Label>
              <Input
                id={`${formId}-zone`}
                value={freeZoneName}
                onChange={(e) => setFreeZoneName(e.target.value)}
                list={`${formId}-zones`}
                placeholder={zones[0] ? t("companyForm.freeZonePlaceholder", { example: zones[0] }) : undefined}
                className="bg-card"
                autoComplete="off"
              />
              <datalist id={`${formId}-zones`}>
                {zones.map((zone) => (
                  <option key={zone} value={zone} />
                ))}
              </datalist>
            </div>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid content-start gap-1.5">
              <Label htmlFor={`${formId}-licence`}>{t("companyForm.tradeLicence")}</Label>
              <Input
                id={`${formId}-licence`}
                value={tradeLicenseNo}
                onChange={(e) => setTradeLicenseNo(e.target.value)}
                className="bg-card tabular-nums"
                autoComplete="off"
              />
            </div>
            <div className="grid content-start gap-1.5">
              <Label htmlFor={`${formId}-trn`}>{t("companyForm.trn")}</Label>
              <Input
                id={`${formId}-trn`}
                value={trn}
                inputMode="numeric"
                onChange={(e) => setTrn(e.target.value)}
                onBlur={() => {
                  setTrnTouched(true);
                  if (isValidTrn(trn)) setTrn(formatTrn(trnDigits(trn)));
                }}
                placeholder="100-1234-5678-9003"
                aria-invalid={showTrnError || undefined}
                aria-describedby={`${formId}-trn-hint`}
                className="bg-card tabular-nums"
                autoComplete="off"
              />
              <p
                id={`${formId}-trn-hint`}
                className={showTrnError ? "text-xs text-destructive" : "text-xs text-muted-foreground"}
              >
                {showTrnError
                  ? t("companyForm.trnInvalid", { count: trnDigits(trn).length })
                  : t("companyForm.trnHint")}
              </p>
            </div>
          </div>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid content-start gap-1.5">
            <Label htmlFor={`${formId}-website`}>{t("companyForm.website")}</Label>
            <Input
              id={`${formId}-website`}
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="example.ae"
              inputMode="url"
              autoComplete="off"
            />
          </div>
          <div className="grid content-start gap-1.5">
            <Label htmlFor={`${formId}-assignee`}>{t("companyForm.assignee")}</Label>
            <AssigneeSelect id={`${formId}-assignee`} value={assigneeId} onChange={setAssigneeId} className="w-full" />
          </div>
        </div>
        <div className="grid content-start gap-1.5">
          <Label htmlFor={`${formId}-address`}>{t("companyForm.address")}</Label>
          <Textarea
            id={`${formId}-address`}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder={t("companyForm.addressPlaceholder")}
            rows={2}
          />
        </div>

        {mutation.error ? (
          <div
            role="alert"
            className="flex gap-2.5 rounded-md border border-destructive/30 bg-danger-soft px-3 py-2.5 text-sm"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
            <div className="grid gap-1">
              <p>{errorMessage(mutation.error)}</p>
              {existing ? (
                <Link
                  to="/companies/$companyId"
                  params={{ companyId: existing.companyId }}
                  className="w-fit font-medium text-primary underline-offset-4 hover:underline"
                >
                  {t("companyForm.openExisting", { name: existing.companyName })}
                </Link>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      <DialogFooter className="sticky bottom-0 border-t bg-background px-5 py-4 sm:px-6">
        <Button type="button" variant="outline" onClick={onCancel}>
          {tc("actions.cancel")}
        </Button>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? t("form.saving") : isEdit ? tc("actions.saveChanges") : t("companyForm.create")}
        </Button>
      </DialogFooter>
    </form>
  );
}
