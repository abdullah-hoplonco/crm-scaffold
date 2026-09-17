import { api, Emirate } from "@hco/shared";
import type { CompanyListItem } from "@hco/shared/api/companies";
import { keepPreviousData } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Plus, X } from "lucide-react";
import { useId, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { duplicateCompany } from "@/features/contacts/errors";
import { useDebouncedValue } from "@/features/contacts/hooks";
import { errorMessage } from "@/lib/api/errors";
import { useApiMutation, useApiQuery } from "@/lib/api/hooks";
import { cn } from "@/lib/utils";
import { CompanyMark } from "./CompanyMark";
import { useCompanyMeta } from "./labels";

/** Combobox to choose a company, with search and "create" inline (name and emirate). */
export function CompanyPicker({
  value,
  onChange,
  id,
  className,
}: {
  value: string | null;
  onChange: (companyId: string | null, label: string | null) => void;
  id?: string;
  className?: string;
}) {
  const { t } = useTranslation("contacts");
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"search" | "create">("search");
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<{ id: string; name: string } | null>(null);
  const selected = useApiQuery(
    api.companies.get,
    { params: { companyId: value ?? "" } },
    { enabled: Boolean(value) && picked?.id !== value },
  );
  const label = !value ? null : picked?.id === value ? picked.name : (selected.data?.company.name ?? null);

  const setOpenAndReset = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setMode("search");
      setQ("");
    }
  };
  const choose = (companyId: string | null, name: string | null) => {
    setPicked(companyId && name ? { id: companyId, name } : null);
    onChange(companyId, name);
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
              <CompanyMark name={label} size="xs" />
              <span className="truncate">{label}</span>
            </span>
          ) : (
            <span className="truncate text-muted-foreground">
              {value && selected.isPending ? "…" : t("companyPicker.placeholder")}
            </span>
          )}
          <ChevronsUpDown className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-(--radix-popover-trigger-width) min-w-72 p-0">
        {mode === "search" ? (
          <CompanySearch
            q={q}
            onQueryChange={setQ}
            value={value}
            onPick={(company) => choose(company.id, company.name)}
            onClear={() => choose(null, null)}
            onCreate={() => setMode("create")}
          />
        ) : (
          <CreateCompanyInline
            initialName={q}
            onBack={() => setMode("search")}
            onCreated={(companyId, name) => choose(companyId, name)}
          />
        )}
      </PopoverContent>
    </Popover>
  );
}

function CompanySearch({
  q,
  onQueryChange,
  value,
  onPick,
  onClear,
  onCreate,
}: {
  q: string;
  onQueryChange: (q: string) => void;
  value: string | null;
  onPick: (company: CompanyListItem) => void;
  onClear: () => void;
  onCreate: () => void;
}) {
  const { t } = useTranslation("contacts");
  const meta = useCompanyMeta();
  const debounced = useDebouncedValue(q, 200);
  const list = useApiQuery(
    api.companies.list,
    { query: { q: debounced.trim() || undefined, limit: 8 } },
    { placeholderData: keepPreviousData },
  );
  const items = list.data?.items ?? [];
  return (
    <Command shouldFilter={false}>
      <CommandInput value={q} onValueChange={onQueryChange} placeholder={t("companyPicker.search")} />
      <CommandList>
        {list.isPending ? (
          <p className="px-3 py-5 text-center text-sm text-muted-foreground">{t("shared.searching")}</p>
        ) : list.isError ? (
          <p className="px-3 py-5 text-center text-sm text-destructive">{errorMessage(list.error)}</p>
        ) : items.length === 0 ? (
          <p className="px-3 py-5 text-center text-sm text-muted-foreground">
            {q.trim() ? t("companyPicker.noMatches", { q: q.trim() }) : t("companyPicker.none")}
          </p>
        ) : (
          <CommandGroup>
            {items.map((company) => (
              <CommandItem key={company.id} value={company.id} onSelect={() => onPick(company)}>
                <CompanyMark name={company.name} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{company.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">{meta(company)}</span>
                </span>
                <Check className={cn("size-4 text-primary", value === company.id ? "opacity-100" : "opacity-0")} />
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        <CommandSeparator />
        <CommandGroup>
          {value ? (
            <CommandItem value="__clear" onSelect={onClear}>
              <X />
              {t("companyPicker.clear")}
            </CommandItem>
          ) : null}
          <CommandItem value="__create" onSelect={onCreate} className="text-primary">
            <Plus className="text-primary" />
            {q.trim() ? t("companyPicker.createNamed", { name: q.trim() }) : t("companyPicker.create")}
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  );
}

function CreateCompanyInline({
  initialName,
  onBack,
  onCreated,
}: {
  initialName: string;
  onBack: () => void;
  onCreated: (companyId: string, name: string) => void;
}) {
  const { t } = useTranslation("contacts");
  const { t: tc } = useTranslation();
  const formId = useId();
  const [name, setName] = useState(initialName.trim());
  const [emirate, setEmirate] = useState<Emirate | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const create = useApiMutation(api.companies.create);
  const existing = duplicateCompany(create.error);
  const nameMissing = submitted && !name.trim();

  const submit = (event: FormEvent) => {
    // The popover is portalled, but React still bubbles submit to a form around the picker.
    event.preventDefault();
    event.stopPropagation();
    setSubmitted(true);
    if (!name.trim()) return;
    create.mutate(
      { body: { name: name.trim(), emirate } },
      {
        onSuccess: (company) => {
          toast.success(t("companyPicker.created", { name: company.name }));
          onCreated(company.id, company.name);
        },
      },
    );
  };

  return (
    <form className="grid gap-3 p-3" onSubmit={submit} noValidate>
      <p className="text-sm font-semibold">{t("companyPicker.newTitle")}</p>
      <div className="grid gap-1.5">
        <Label htmlFor={`${formId}-name`}>{t("companyForm.name")}</Label>
        <Input
          id={`${formId}-name`}
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-invalid={nameMissing || undefined}
          autoFocus
          autoComplete="off"
        />
        {nameMissing ? <p className="text-xs text-destructive">{t("companyForm.nameRequired")}</p> : null}
      </div>
      <div className="grid gap-1.5" role="group" aria-labelledby={`${formId}-emirate`}>
        <span id={`${formId}-emirate`} className="text-sm font-medium">
          {t("companyForm.emirate")}
        </span>
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          spacing={1}
          value={emirate ?? ""}
          onValueChange={(next) => setEmirate(next ? Emirate.parse(next) : null)}
          className="flex w-full flex-wrap"
        >
          {Emirate.options.map((option) => (
            <ToggleGroupItem
              key={option}
              value={option}
              className="rounded-full px-2.5 text-xs data-[state=on]:border-primary/40"
            >
              {tc(`emirates.${option}`)}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
      {create.error ? (
        <div role="alert" className="grid gap-1 text-xs text-destructive">
          <p>{errorMessage(create.error)}</p>
          {existing ? (
            <Button
              type="button"
              variant="link"
              size="xs"
              className="h-auto w-fit p-0 text-xs"
              onClick={() => onCreated(existing.companyId, existing.companyName)}
            >
              {t("companyPicker.useExisting", { name: existing.companyName })}
            </Button>
          ) : null}
        </div>
      ) : null}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onBack}>
          {tc("actions.back")}
        </Button>
        <Button type="submit" size="sm" disabled={create.isPending}>
          {create.isPending ? t("form.saving") : t("companyPicker.createSubmit")}
        </Button>
      </div>
    </form>
  );
}
