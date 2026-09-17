import { api } from "@hco/shared";
import type { ContactListItem } from "@hco/shared/api/contacts";
import { keepPreviousData } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { useId, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { UserAvatar } from "@/components/app/UserAvatar";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { errorMessage } from "@/lib/api/errors";
import { useApiMutation, useApiQuery } from "@/lib/api/hooks";
import { formatPhone } from "@/lib/format";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import { duplicatePhoneOwner } from "./errors";
import { useDebouncedValue } from "./hooks";
import { fullName } from "./names";
import { isValidPhone, PhonePreview } from "./PhonePreview";

/** Combobox to choose a contact, with search and "create new contact" inline. */
export function ContactPicker({
  value,
  onChange,
  id,
  className,
}: {
  value: string | null;
  onChange: (contactId: string | null, label: string | null) => void;
  id?: string;
  className?: string;
}) {
  const { t } = useTranslation("contacts");
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"search" | "create">("search");
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<{ id: string; name: string } | null>(null);
  const selected = useApiQuery(
    api.contacts.get,
    { params: { contactId: value ?? "" } },
    { enabled: Boolean(value) && picked?.id !== value },
  );
  const label = !value
    ? null
    : picked?.id === value
      ? picked.name
      : selected.data
        ? fullName(selected.data.contact)
        : null;

  const setOpenAndReset = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setMode("search");
      setQ("");
    }
  };
  const choose = (contactId: string, name: string) => {
    setPicked({ id: contactId, name });
    onChange(contactId, name);
    setOpenAndReset(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpenAndReset} modal>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between px-3 font-normal shadow-xs", className)}
        >
          {label ? (
            <span className="flex min-w-0 items-center gap-2">
              <UserAvatar name={label} size="sm" className="size-5 text-xs" />
              <span className="truncate">{label}</span>
            </span>
          ) : (
            <span className="truncate text-muted-foreground">
              {value && selected.isPending ? "…" : t("contactPicker.placeholder")}
            </span>
          )}
          <ChevronsUpDown className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-(--radix-popover-trigger-width) min-w-72 p-0">
        {mode === "search" ? (
          <ContactSearch
            q={q}
            onQueryChange={setQ}
            value={value}
            onPick={(contact) => choose(contact.id, fullName(contact))}
            onCreate={() => setMode("create")}
          />
        ) : (
          <CreateContactInline initialQuery={q} onBack={() => setMode("search")} onCreated={choose} />
        )}
      </PopoverContent>
    </Popover>
  );
}

function ContactSearch({
  q,
  onQueryChange,
  value,
  onPick,
  onCreate,
}: {
  q: string;
  onQueryChange: (q: string) => void;
  value: string | null;
  onPick: (contact: ContactListItem) => void;
  onCreate: () => void;
}) {
  const { t } = useTranslation("contacts");
  const debounced = useDebouncedValue(q, 200);
  const list = useApiQuery(
    api.contacts.list,
    { query: { q: debounced.trim() || undefined, limit: 8 } },
    { placeholderData: keepPreviousData },
  );
  const items = list.data?.items ?? [];
  return (
    <Command shouldFilter={false}>
      <CommandInput value={q} onValueChange={onQueryChange} placeholder={t("contactPicker.search")} />
      <CommandList>
        {list.isPending ? (
          <p className="px-3 py-5 text-center text-sm text-muted-foreground">{t("shared.searching")}</p>
        ) : list.isError ? (
          <p className="px-3 py-5 text-center text-sm text-destructive">{errorMessage(list.error)}</p>
        ) : items.length === 0 ? (
          <p className="px-3 py-5 text-center text-sm text-muted-foreground">
            {q.trim() ? t("contactPicker.noMatches", { q: q.trim() }) : t("contactPicker.none")}
          </p>
        ) : (
          <CommandGroup>
            {items.map((contact) => {
              const name = fullName(contact);
              const meta = [contact.companyName, formatPhone(contact.primaryPhoneE164)].filter(Boolean);
              return (
                <CommandItem key={contact.id} value={contact.id} onSelect={() => onPick(contact)}>
                  <UserAvatar name={name} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{name}</span>
                    {meta.length ? (
                      <span className="block truncate text-xs text-muted-foreground tabular-nums">
                        {meta.join(", ")}
                      </span>
                    ) : null}
                  </span>
                  <Check
                    className={cn("size-4 text-primary", value === contact.id ? "opacity-100" : "opacity-0")}
                  />
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}
        <CommandSeparator />
        <CommandGroup>
          <CommandItem value="__create" onSelect={onCreate} className="text-primary">
            <Plus className="text-primary" />
            {t("contactPicker.create")}
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  );
}

function CreateContactInline({
  initialQuery,
  onBack,
  onCreated,
}: {
  initialQuery: string;
  onBack: () => void;
  onCreated: (contactId: string, name: string) => void;
}) {
  const { t } = useTranslation("contacts");
  const { t: tc } = useTranslation();
  const { user } = useSession();
  const formId = useId();
  // Typing a number in the search box prefills the phone; typing a name prefills the name.
  const query = initialQuery.trim();
  const queryIsPhone = /^[+\d][\d\s()-]{5,}$/.test(query);
  const [first, ...rest] = queryIsPhone ? [] : query.split(/\s+/);
  const [firstName, setFirstName] = useState(first ?? "");
  const [lastName, setLastName] = useState(rest.join(" "));
  const [phone, setPhone] = useState(queryIsPhone ? query : "");
  const [submitted, setSubmitted] = useState(false);
  const [phoneTouched, setPhoneTouched] = useState(false);
  const create = useApiMutation(api.contacts.create);
  const owner = duplicatePhoneOwner(create.error);
  const nameMissing = submitted && !firstName.trim();
  const phoneInvalid = phone.trim() !== "" && !isValidPhone(phone);

  const submit = (event: FormEvent) => {
    // The popover is portalled, but React still bubbles submit to a form around the picker.
    event.preventDefault();
    event.stopPropagation();
    setSubmitted(true);
    setPhoneTouched(true);
    if (!firstName.trim() || phoneInvalid) return;
    create.mutate(
      {
        body: {
          firstName: firstName.trim(),
          lastName: lastName.trim() || null,
          phones: phone.trim() ? [{ number: phone, label: "mobile", isWhatsapp: true }] : [],
          assigneeId: user.id,
        },
      },
      {
        onSuccess: (contact) => {
          const name = fullName(contact);
          toast.success(t("form.created", { name: contact.firstName }));
          onCreated(contact.id, name);
        },
      },
    );
  };

  return (
    <form className="grid gap-3 p-3" onSubmit={submit} noValidate>
      <p className="text-sm font-semibold">{t("contactPicker.newTitle")}</p>
      <div className="grid grid-cols-2 gap-2">
        <div className="grid gap-1.5">
          <Label htmlFor={`${formId}-first`}>{t("form.firstName")}</Label>
          <Input
            id={`${formId}-first`}
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            aria-invalid={nameMissing || undefined}
            autoFocus
            autoComplete="off"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`${formId}-last`}>{t("form.lastName")}</Label>
          <Input
            id={`${formId}-last`}
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            autoComplete="off"
          />
        </div>
      </div>
      {nameMissing ? <p className="-mt-1 text-xs text-destructive">{t("form.firstNameRequired")}</p> : null}
      <div className="grid gap-1.5">
        <Label htmlFor={`${formId}-phone`}>{t("contactPicker.phone")}</Label>
        <Input
          id={`${formId}-phone`}
          type="tel"
          inputMode="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          onBlur={() => setPhoneTouched(true)}
          placeholder={t("phone.placeholder")}
          aria-invalid={(phoneTouched && phoneInvalid) || undefined}
          aria-describedby={`${formId}-phone-hint`}
          className="tabular-nums"
        />
        <PhonePreview id={`${formId}-phone-hint`} value={phone} showInvalid={phoneTouched} />
      </div>
      {create.error ? (
        <div role="alert" className="grid gap-1 text-xs text-destructive">
          <p>{errorMessage(create.error)}</p>
          {owner ? (
            <Button
              type="button"
              variant="link"
              size="xs"
              className="h-auto w-fit p-0 text-xs"
              onClick={() => onCreated(owner.contactId, owner.contactName)}
            >
              {t("contactPicker.useExisting", { name: owner.contactName })}
            </Button>
          ) : null}
        </div>
      ) : null}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onBack}>
          {tc("actions.back")}
        </Button>
        <Button type="submit" size="sm" disabled={create.isPending}>
          {create.isPending ? t("form.saving") : t("form.create")}
        </Button>
      </div>
    </form>
  );
}
