import { api, PhoneLabel, type Contact } from "@hco/shared";
import { Link } from "@tanstack/react-router";
import { AlertCircle, MessageCircle, Plus, Trash2 } from "lucide-react";
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
import { Toggle } from "@/components/ui/toggle";
import { CompanyPicker } from "@/features/companies/CompanyPicker";
import { errorMessage } from "@/lib/api/errors";
import { useApiMutation } from "@/lib/api/hooks";
import { formatPhone } from "@/lib/format";
import { useSession } from "@/lib/session";
import { duplicatePhoneOwner } from "./errors";
import { isValidPhone, PhonePreview } from "./PhonePreview";

interface PhoneRow {
  key: string;
  number: string;
  label: PhoneLabel;
  isWhatsapp: boolean;
  touched: boolean;
}

interface EmailRow {
  key: string;
  value: string;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
let rowSeq = 0;
const rowKey = () => `row-${++rowSeq}`;

const emptyPhone = (): PhoneRow => ({
  key: rowKey(),
  number: "",
  label: "mobile",
  isWhatsapp: true,
  touched: false,
});

/** New contact, or edit when `contact` is given. The form starts fresh every time the dialog opens. */
export function ContactFormDialog({
  open,
  onOpenChange,
  contact,
  defaults,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact?: Contact | null;
  defaults?: { companyId?: string | null };
  onSaved?: (contact: Contact) => void;
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
        <ContactForm
          key={session}
          contact={contact ?? null}
          defaults={defaults}
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

function ContactForm({
  contact,
  defaults,
  onCancel,
  onSaved,
}: {
  contact: Contact | null;
  defaults?: { companyId?: string | null };
  onCancel: () => void;
  onSaved: (contact: Contact) => void;
}) {
  const { t } = useTranslation("contacts");
  const { t: tc } = useTranslation();
  const { user } = useSession();
  const formId = useId();
  const isEdit = contact !== null;

  const [firstName, setFirstName] = useState(contact?.firstName ?? "");
  const [lastName, setLastName] = useState(contact?.lastName ?? "");
  const [phones, setPhones] = useState<PhoneRow[]>(() =>
    contact?.phones.length
      ? contact.phones.map((p) => ({
          key: rowKey(),
          number: formatPhone(p.e164),
          label: p.label,
          isWhatsapp: p.isWhatsapp,
          touched: false,
        }))
      : [emptyPhone()],
  );
  const [emails, setEmails] = useState<EmailRow[]>(() =>
    contact?.emails.length
      ? contact.emails.map((value) => ({ key: rowKey(), value }))
      : [{ key: rowKey(), value: "" }],
  );
  const [jobTitle, setJobTitle] = useState(contact?.jobTitle ?? "");
  const [companyId, setCompanyId] = useState<string | null>(
    contact ? contact.companyId : (defaults?.companyId ?? null),
  );
  const [assigneeId, setAssigneeId] = useState<string | null>(contact ? contact.assigneeId : user.id);
  const [notes, setNotes] = useState(contact?.notes ?? "");
  const [submitted, setSubmitted] = useState(false);

  const create = useApiMutation(api.contacts.create);
  const update = useApiMutation(api.contacts.update);
  const mutation = isEdit ? update : create;
  const serverError = mutation.error;
  const duplicate = duplicatePhoneOwner(serverError);

  const firstNameError = submitted && !firstName.trim();
  const phoneInvalid = (row: PhoneRow) => row.number.trim() !== "" && !isValidPhone(row.number);
  const emailInvalid = (row: EmailRow) => row.value.trim() !== "" && !EMAIL.test(row.value.trim());

  const setPhone = (key: string, patch: Partial<PhoneRow>) =>
    setPhones((rows) => rows.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  const setEmail = (key: string, value: string) =>
    setEmails((rows) => rows.map((row) => (row.key === key ? { ...row, value } : row)));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    setPhones((rows) => rows.map((row) => ({ ...row, touched: true })));
    if (!firstName.trim() || phones.some(phoneInvalid) || emails.some(emailInvalid)) return;

    const body = {
      firstName: firstName.trim(),
      lastName: lastName.trim() || null,
      phones: phones
        .filter((row) => row.number.trim())
        .map(({ number, label, isWhatsapp }) => ({ number, label, isWhatsapp })),
      emails: emails.map((row) => row.value.trim()).filter(Boolean),
      jobTitle: jobTitle.trim() || null,
      companyId,
      assigneeId,
      notes: notes.trim() || null,
    };
    const done = (saved: Contact) => {
      toast.success(isEdit ? t("form.saved") : t("form.created", { name: saved.firstName }));
      onSaved(saved);
    };
    if (contact) update.mutate({ params: { contactId: contact.id }, body }, { onSuccess: done });
    else create.mutate({ body }, { onSuccess: done });
  };

  return (
    <form onSubmit={submit} noValidate aria-labelledby={`${formId}-title`}>
      <DialogHeader className="border-b px-5 pt-5 pb-4 text-start sm:px-6">
        <DialogTitle id={`${formId}-title`}>{isEdit ? t("form.editTitle") : t("form.newTitle")}</DialogTitle>
        <DialogDescription>{t("form.description")}</DialogDescription>
      </DialogHeader>

      <div className="grid gap-5 px-5 py-5 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid content-start gap-1.5">
            <Label htmlFor={`${formId}-first`}>{t("form.firstName")}</Label>
            <Input
              id={`${formId}-first`}
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              autoComplete="off"
              aria-invalid={firstNameError || undefined}
              aria-describedby={firstNameError ? `${formId}-first-error` : undefined}
              autoFocus={!isEdit}
            />
            {firstNameError ? (
              <p id={`${formId}-first-error`} className="text-xs text-destructive">
                {t("form.firstNameRequired")}
              </p>
            ) : null}
          </div>
          <div className="grid content-start gap-1.5">
            <Label htmlFor={`${formId}-last`}>{t("form.lastName")}</Label>
            <Input
              id={`${formId}-last`}
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              autoComplete="off"
            />
          </div>
        </div>

        <fieldset className="grid gap-2">
          <legend className="mb-2 text-sm font-medium">{t("form.phones")}</legend>
          {phones.map((row, index) => {
            const inputId = `${formId}-phone-${row.key}`;
            const invalid = row.touched && phoneInvalid(row);
            return (
              <div key={row.key} className="grid content-start gap-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    id={inputId}
                    type="tel"
                    inputMode="tel"
                    value={row.number}
                    onChange={(e) => setPhone(row.key, { number: e.target.value })}
                    onBlur={() => setPhone(row.key, { touched: true })}
                    placeholder={t("phone.placeholder")}
                    aria-label={t("form.phoneNumber", { index: index + 1 })}
                    aria-invalid={invalid || undefined}
                    aria-describedby={`${inputId}-hint`}
                    className="min-w-0 flex-1 basis-40 tabular-nums"
                  />
                  <div className="flex items-center gap-2">
                    <Select
                      value={row.label}
                      onValueChange={(label) => setPhone(row.key, { label: PhoneLabel.parse(label) })}
                    >
                      <SelectTrigger className="w-26" aria-label={t("form.phoneLabel", { index: index + 1 })}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PhoneLabel.options.map((label) => (
                          <SelectItem key={label} value={label}>
                            {t(`phoneLabels.${label}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Toggle
                      variant="outline"
                      pressed={row.isWhatsapp}
                      onPressedChange={(isWhatsapp) => setPhone(row.key, { isWhatsapp })}
                      aria-label={t("form.onWhatsapp")}
                      className="gap-1.5 px-2.5 data-[state=on]:border-channel-whatsapp/40 data-[state=on]:bg-success-soft data-[state=on]:text-channel-whatsapp"
                    >
                      <MessageCircle />
                      <span className="text-xs">{t("shared.whatsapp")}</span>
                    </Toggle>
                    {phones.length > 1 ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setPhones((rows) => rows.filter((r) => r.key !== row.key))}
                        aria-label={t("form.removePhone", { index: index + 1 })}
                      >
                        <Trash2 className="text-muted-foreground" />
                      </Button>
                    ) : null}
                  </div>
                </div>
                <PhonePreview id={`${inputId}-hint`} value={row.number} showInvalid={invalid} />
              </div>
            );
          })}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="-ms-2.5 w-fit text-primary"
            onClick={() => setPhones((rows) => [...rows, { ...emptyPhone(), isWhatsapp: false }])}
          >
            <Plus />
            {t("form.addPhone")}
          </Button>
        </fieldset>

        <fieldset className="grid gap-2">
          <legend className="mb-2 text-sm font-medium">{t("form.emails")}</legend>
          {emails.map((row, index) => {
            const inputId = `${formId}-email-${row.key}`;
            const invalid = submitted && emailInvalid(row);
            return (
              <div key={row.key} className="grid content-start gap-1.5">
                <div className="flex items-center gap-2">
                  <Input
                    id={inputId}
                    type="email"
                    inputMode="email"
                    value={row.value}
                    onChange={(e) => setEmail(row.key, e.target.value)}
                    placeholder={t("form.emailPlaceholder")}
                    aria-label={t("form.emailAddress", { index: index + 1 })}
                    aria-invalid={invalid || undefined}
                    autoComplete="off"
                  />
                  {emails.length > 1 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setEmails((rows) => rows.filter((r) => r.key !== row.key))}
                      aria-label={t("form.removeEmail", { index: index + 1 })}
                    >
                      <Trash2 className="text-muted-foreground" />
                    </Button>
                  ) : null}
                </div>
                {invalid ? <p className="text-xs text-destructive">{t("form.emailInvalid")}</p> : null}
              </div>
            );
          })}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="-ms-2.5 w-fit text-primary"
            onClick={() => setEmails((rows) => [...rows, { key: rowKey(), value: "" }])}
          >
            <Plus />
            {t("form.addEmail")}
          </Button>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid content-start gap-1.5">
            <Label htmlFor={`${formId}-job`}>{t("form.jobTitle")}</Label>
            <Input
              id={`${formId}-job`}
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              autoComplete="off"
            />
          </div>
          <div className="grid content-start gap-1.5">
            <Label htmlFor={`${formId}-company`}>{t("form.company")}</Label>
            <CompanyPicker
              id={`${formId}-company`}
              value={companyId}
              onChange={(id) => setCompanyId(id)}
            />
          </div>
        </div>

        <div className="grid content-start gap-1.5">
          <Label htmlFor={`${formId}-assignee`}>{t("form.assignee")}</Label>
          <AssigneeSelect id={`${formId}-assignee`} value={assigneeId} onChange={setAssigneeId} className="w-full" />
        </div>

        <div className="grid content-start gap-1.5">
          <Label htmlFor={`${formId}-notes`}>{t("form.notes")}</Label>
          <Textarea
            id={`${formId}-notes`}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t("form.notesPlaceholder")}
            rows={3}
          />
        </div>

        {serverError ? (
          <div
            role="alert"
            className="flex gap-2.5 rounded-md border border-destructive/30 bg-danger-soft px-3 py-2.5 text-sm"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
            <div className="grid gap-1">
              <p>{errorMessage(serverError)}</p>
              {duplicate ? (
                <Link
                  to="/contacts/$contactId"
                  params={{ contactId: duplicate.contactId }}
                  className="w-fit font-medium text-primary underline-offset-4 hover:underline"
                >
                  {t("form.openExisting", { name: duplicate.contactName })}
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
          {mutation.isPending ? t("form.saving") : isEdit ? tc("actions.saveChanges") : t("form.create")}
        </Button>
      </DialogFooter>
    </form>
  );
}
