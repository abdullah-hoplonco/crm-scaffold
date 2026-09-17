import { api } from "@hco/shared";
import { useNavigate } from "@tanstack/react-router";
import { Building2, X } from "lucide-react";
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
import { CompanyPicker } from "@/features/companies/CompanyPicker";
import { ContactPicker } from "@/features/contacts/ContactPicker";
import { errorMessage } from "@/lib/api/errors";
import { useApiMutation, useApiQuery } from "@/lib/api/hooks";
import { useSession } from "@/lib/session";
import { DatePickerButton } from "./DatePickerButton";
import { MoneyInput, parseAedInput } from "./MoneyInput";

/** Create a deal, optionally for a known contact or company. Opens the new deal unless `onCreated` is given. */
export function NewDealDialog({
  open,
  onOpenChange,
  defaults,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaults?: { contactId?: string; companyId?: string };
  onCreated?: (dealId: string) => void;
}) {
  const { t } = useTranslation("pipeline");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-xl">
        <DialogHeader className="text-start">
          <DialogTitle>{t("newDealDialog.title")}</DialogTitle>
          <DialogDescription>{t("newDealDialog.description")}</DialogDescription>
        </DialogHeader>
        <NewDealForm defaults={defaults} onCreated={onCreated} onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

type Errors = Partial<Record<"title" | "contact" | "value", string>>;

function NewDealForm({
  defaults,
  onCreated,
  onClose,
}: {
  defaults?: { contactId?: string; companyId?: string };
  onCreated?: (dealId: string) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation("pipeline");
  const { user } = useSession();
  const navigate = useNavigate();
  const ids = {
    title: useId(),
    contact: useId(),
    company: useId(),
    value: useId(),
    stage: useId(),
    close: useId(),
    assignee: useId(),
  };

  const [title, setTitle] = useState("");
  const [contactId, setContactId] = useState<string | null>(defaults?.contactId ?? null);
  const [contactLabel, setContactLabel] = useState<string | null>(null);
  const [company, setCompany] = useState<{ id: string | null; label: string | null; touched: boolean }>({
    id: defaults?.companyId ?? null,
    label: null,
    touched: Boolean(defaults?.companyId),
  });
  const [value, setValue] = useState("");
  const [stageId, setStageId] = useState<string | null>(null);
  const [closeDate, setCloseDate] = useState<string | null>(null);
  const [assigneeId, setAssigneeId] = useState<string | null>(user.id);
  const [errors, setErrors] = useState<Errors>({});

  const pipeline = useApiQuery(api.pipeline.getDefault, {});
  const openStages = (pipeline.data?.stages ?? []).filter((s) => s.type === "open");
  const effectiveStageId = stageId ?? openStages[0]?.id ?? null;

  // A contact who works somewhere brings their company along, unless someone picked one by hand.
  const contact = useApiQuery(
    api.contacts.get,
    { params: { contactId: contactId ?? "" } },
    { enabled: Boolean(contactId) },
  );
  const companyFromContact = contactId ? contact.data?.company : null;
  const companyId = company.touched ? company.id : (companyFromContact?.id ?? null);
  const companyLabel = company.touched ? company.label : (companyFromContact?.name ?? null);
  const selectedContactLabel =
    contactLabel ??
    (contact.data
      ? [contact.data.contact.firstName, contact.data.contact.lastName].filter(Boolean).join(" ")
      : null);

  const create = useApiMutation(api.pipeline.create, {
    onSuccess: (detail) => {
      toast.success(t("newDealDialog.created"), { description: detail.deal.title });
      onClose();
      if (onCreated) onCreated(detail.deal.id);
      else void navigate({ to: "/deals/$dealId", params: { dealId: detail.deal.id } });
    },
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const amount = parseAedInput(value);
    const next: Errors = {};
    if (!title.trim()) next.title = t("newDealDialog.titleRequired");
    if (!contactId) next.contact = t("newDealDialog.contactRequired");
    if (amount === null) next.value = t("newDealDialog.valueInvalid");
    setErrors(next);
    if (Object.keys(next).length > 0 || !contactId || amount === null) return;
    create.mutate({
      body: {
        title: title.trim(),
        contactId,
        companyId,
        stageId: effectiveStageId ?? undefined,
        valueAed: amount,
        expectedCloseDate: closeDate,
        assigneeId,
      },
    });
  };

  return (
    <form className="grid gap-4" onSubmit={submit} noValidate>
      <div className="grid gap-2">
        <Label htmlFor={ids.title}>{t("newDealDialog.titleLabel")}</Label>
        <Input
          id={ids.title}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t("newDealDialog.titlePlaceholder")}
          aria-invalid={Boolean(errors.title)}
          aria-describedby={errors.title ? `${ids.title}-error` : undefined}
          autoFocus
        />
        <FieldError id={`${ids.title}-error`} message={errors.title} />
      </div>

      <div className="grid gap-2">
        <Label htmlFor={ids.contact}>{t("newDealDialog.contactLabel")}</Label>
        {selectedContactLabel ? (
          <p className="text-sm">
            <span className="text-muted-foreground">{t("newDealDialog.selected")}</span>{" "}
            <span className="font-medium">{selectedContactLabel}</span>
          </p>
        ) : null}
        <ContactPicker
          id={ids.contact}
          value={contactId}
          onChange={(id, label) => {
            setContactId(id);
            setContactLabel(label);
            setErrors((prev) => ({ ...prev, contact: undefined }));
          }}
        />
        <FieldError message={errors.contact} />
      </div>

      <div className="grid gap-2">
        <Label htmlFor={ids.company}>
          {t("newDealDialog.companyLabel")}
          <span className="font-normal text-muted-foreground">{t("optional")}</span>
        </Label>
        {companyId && companyLabel ? (
          <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm">
            <Building2 className="size-4 text-muted-foreground" aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate font-medium">{companyLabel}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label={t("newDealDialog.removeCompany")}
              onClick={() => setCompany({ id: null, label: null, touched: true })}
            >
              <X />
            </Button>
          </div>
        ) : (
          <CompanyPicker
            id={ids.company}
            value={companyId}
            onChange={(id, label) => setCompany({ id, label, touched: true })}
          />
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor={ids.value}>{t("newDealDialog.valueLabel")}</Label>
          <MoneyInput
            id={ids.value}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="18,500"
            aria-invalid={Boolean(errors.value)}
            aria-describedby={errors.value ? `${ids.value}-error` : undefined}
          />
          <FieldError id={`${ids.value}-error`} message={errors.value} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor={ids.stage}>{t("newDealDialog.stageLabel")}</Label>
          <Select value={effectiveStageId ?? undefined} onValueChange={setStageId}>
            <SelectTrigger id={ids.stage} className="w-full">
              <SelectValue placeholder={t("common:states.loading")} />
            </SelectTrigger>
            <SelectContent>
              {openStages.map((stage) => (
                <SelectItem key={stage.id} value={stage.id}>
                  {stage.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor={ids.close}>
            {t("newDealDialog.closeLabel")}
            <span className="font-normal text-muted-foreground">{t("optional")}</span>
          </Label>
          <DatePickerButton
            id={ids.close}
            value={closeDate}
            onChange={setCloseDate}
            placeholder={t("newDealDialog.closePlaceholder")}
            className="w-full"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor={ids.assignee}>{t("newDealDialog.assigneeLabel")}</Label>
          <AssigneeSelect id={ids.assignee} value={assigneeId} onChange={setAssigneeId} className="w-full" />
        </div>
      </div>

      {create.isError ? (
        <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-destructive">
          {errorMessage(create.error)}
        </p>
      ) : null}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          {t("common:actions.cancel")}
        </Button>
        <Button type="submit" disabled={create.isPending}>
          {create.isPending ? t("newDealDialog.creating") : t("newDealDialog.submit")}
        </Button>
      </DialogFooter>
    </form>
  );
}

function FieldError({ id, message }: { id?: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="text-sm text-destructive">
      {message}
    </p>
  );
}
