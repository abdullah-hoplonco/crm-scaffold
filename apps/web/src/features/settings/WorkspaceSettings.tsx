import { Emirate, api, type Workspace } from "@hco/shared";
import { Clock3, Coins, Lock, Minus, Percent, Plus, Snowflake } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ErrorState } from "@/components/app/States";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useApiMutation, useApiQuery } from "@/lib/api/hooks";
import { errorMessage } from "@/lib/api/errors";
import { useSettingsAccess } from "./access";
import {
  ReadOnlyNote,
  SettingsPanel,
  SettingsRow,
  SettingsSection,
  UnsavedChangesBar,
} from "./SettingsSection";
import { formatTrn, isValidTrn, trnDigits } from "./trn";

const FORM_ID = "workspace-settings";
const STALE_MIN = 1;
const STALE_MAX = 30;

interface Draft {
  name: string;
  trn: string;
  addressLine: string;
  emirate: Emirate | null;
  staleAfterDays: number;
}

function toDraft(ws: Workspace): Draft {
  return {
    name: ws.name,
    trn: formatTrn(ws.trn),
    addressLine: ws.addressLine ?? "",
    emirate: ws.emirate,
    staleAfterDays: ws.staleAfterDays,
  };
}

function sameDraft(a: Draft, b: Draft) {
  return (
    a.name.trim() === b.name.trim() &&
    trnDigits(a.trn) === trnDigits(b.trn) &&
    a.addressLine.trim() === b.addressLine.trim() &&
    a.emirate === b.emirate &&
    a.staleAfterDays === b.staleAfterDays
  );
}

export function WorkspaceSettings() {
  const { t } = useTranslation("settings");
  const workspace = useApiQuery(api.workspace.get, {});

  return (
    <SettingsSection title={t("workspace.title")} description={t("workspace.description")}>
      {workspace.isPending ? (
        <WorkspaceSkeleton />
      ) : workspace.isError ? (
        <ErrorState
          error={workspace.error}
          onRetry={() => void workspace.refetch()}
          className="rounded-xl border bg-card"
        />
      ) : (
        <WorkspaceForm key={workspace.data.updatedAt} workspace={workspace.data} />
      )}
    </SettingsSection>
  );
}

function WorkspaceSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true">
      {[4, 3, 1].map((rows, i) => (
        <div key={i} className="rounded-xl border bg-card p-5">
          <Skeleton className="mb-5 h-4 w-40" />
          {Array.from({ length: rows }, (_, r) => (
            <div key={r} className="grid gap-3 py-3 md:grid-cols-[2fr_3fr] md:gap-8">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-9 w-full" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function WorkspaceForm({ workspace }: { workspace: Workspace }) {
  const { t } = useTranslation("settings");
  const { t: tc } = useTranslation();
  const { canEditWorkspace } = useSettingsAccess();
  const initial = toDraft(workspace);
  const [draft, setDraft] = useState<Draft>(initial);
  const [errors, setErrors] = useState<Partial<Record<"name" | "trn", string>>>({});
  const dirty = !sameDraft(draft, initial);
  const disabled = !canEditWorkspace;

  const save = useApiMutation(api.workspace.update, {
    onSuccess: () => toast.success(t("workspace.saved")),
    onError: (error) => toast.error(errorMessage(error)),
  });

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    if (key === "name" || key === "trn") setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const next: typeof errors = {};
    if (!draft.name.trim()) next.name = t("workspace.errors.name");
    if (draft.trn.trim() && !isValidTrn(draft.trn)) next.trn = t("workspace.errors.trn");
    setErrors(next);
    if (Object.keys(next).length) return;
    save.mutate({
      body: {
        name: draft.name.trim(),
        trn: draft.trn.trim() ? trnDigits(draft.trn) : null,
        addressLine: draft.addressLine.trim() || null,
        emirate: draft.emirate,
        staleAfterDays: draft.staleAfterDays,
      },
    });
  };

  return (
    <form id={FORM_ID} onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      {disabled ? <ReadOnlyNote>{t("readOnly.owner")}</ReadOnlyNote> : null}

      <SettingsPanel title={t("workspace.business.title")} description={t("workspace.business.description")}>
        <SettingsRow label={t("workspace.fields.name")} htmlFor="ws-name">
          <Input
            id="ws-name"
            value={draft.name}
            onChange={(e) => set("name", e.target.value)}
            disabled={disabled}
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={errors.name ? "ws-name-error" : undefined}
            autoComplete="organization"
          />
          <FieldError id="ws-name-error" message={errors.name} />
        </SettingsRow>
        <SettingsRow label={t("workspace.fields.trn")} htmlFor="ws-trn" help={t("workspace.fields.trnHelp")}>
          <Input
            id="ws-trn"
            value={draft.trn}
            onChange={(e) => set("trn", formatTrn(e.target.value))}
            disabled={disabled}
            inputMode="numeric"
            placeholder="100-0000-0000-0003"
            className="font-medium tracking-wide tabular-nums"
            aria-invalid={errors.trn ? true : undefined}
            aria-describedby={errors.trn ? "ws-trn-error" : "ws-trn-count"}
          />
          {errors.trn ? (
            <FieldError id="ws-trn-error" message={errors.trn} />
          ) : (
            <p id="ws-trn-count" className="mt-1.5 text-xs text-muted-foreground tabular-nums">
              {t("workspace.fields.trnCount", { count: trnDigits(draft.trn).length })}
            </p>
          )}
        </SettingsRow>
        <SettingsRow label={t("workspace.fields.address")} htmlFor="ws-address">
          <Input
            id="ws-address"
            value={draft.addressLine}
            onChange={(e) => set("addressLine", e.target.value)}
            disabled={disabled}
            placeholder={t("workspace.fields.addressPlaceholder")}
            autoComplete="street-address"
          />
        </SettingsRow>
        <SettingsRow label={t("workspace.fields.emirate")} htmlFor="ws-emirate">
          <Select
            value={draft.emirate ?? undefined}
            onValueChange={(v) => set("emirate", Emirate.parse(v))}
            disabled={disabled}
          >
            <SelectTrigger id="ws-emirate" className="w-full sm:w-64">
              <SelectValue placeholder={t("workspace.fields.emiratePlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              {Emirate.options.map((e) => (
                <SelectItem key={e} value={e}>
                  {tc(`emirates.${e}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingsRow>
      </SettingsPanel>

      <SettingsPanel title={t("workspace.tax.title")} description={t("workspace.tax.description")}>
        <LockedRow
          icon={Percent}
          label={t("workspace.tax.vat")}
          value={`${Number(workspace.vatRate)}%`}
          note={t("workspace.tax.vatNote")}
        />
        <LockedRow
          icon={Coins}
          label={t("workspace.tax.currency")}
          value={t("workspace.tax.currencyValue")}
          note={t("workspace.tax.currencyNote")}
        />
        <LockedRow
          icon={Clock3}
          label={t("workspace.tax.timezone")}
          value={workspace.timezone}
          note={t("workspace.tax.timezoneNote")}
        />
      </SettingsPanel>

      <SettingsPanel title={t("workspace.followUp.title")} description={t("workspace.followUp.description")}>
        <SettingsRow
          label={t("workspace.followUp.label")}
          htmlFor="ws-stale"
          help={t("workspace.followUp.help")}
        >
          <StaleDaysStepper
            value={draft.staleAfterDays}
            onChange={(v) => set("staleAfterDays", v)}
            disabled={disabled}
          />
          <p className="mt-3 inline-flex max-w-full items-center gap-1.5 rounded-md bg-warning-soft px-2 py-1 text-xs font-medium text-[#6B4700]">
            <Snowflake className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">
              {t("workspace.followUp.preview", { count: draft.staleAfterDays })}
            </span>
          </p>
        </SettingsRow>
      </SettingsPanel>

      <UnsavedChangesBar
        visible={dirty && canEditWorkspace}
        pending={save.isPending}
        formId={FORM_ID}
        onDiscard={() => {
          setDraft(initial);
          setErrors({});
        }}
      />
    </form>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1.5 text-sm text-destructive">
      {message}
    </p>
  );
}

function LockedRow({
  icon: Icon,
  label,
  value,
  note,
}: {
  icon: typeof Lock;
  label: string;
  value: string;
  note: string;
}) {
  const { t } = useTranslation("settings");
  return (
    <div className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
      <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-[13px] text-muted-foreground">{note}</p>
      </div>
      <p className="flex shrink-0 items-center gap-1.5 text-sm font-medium tabular-nums">
        {value}
        <Lock className="size-3.5 text-muted-foreground" aria-label={t("workspace.tax.locked")} />
      </p>
    </div>
  );
}

function StaleDaysStepper({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (value: number) => void;
  disabled: boolean;
}) {
  const { t } = useTranslation("settings");
  const clamp = (n: number) => Math.min(STALE_MAX, Math.max(STALE_MIN, Math.round(n)));
  return (
    <div className="flex items-center gap-2">
      <div className="inline-flex items-center rounded-md border border-input shadow-xs">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="rounded-e-none"
          onClick={() => onChange(clamp(value - 1))}
          disabled={disabled || value <= STALE_MIN}
          aria-label={t("workspace.followUp.fewer")}
        >
          <Minus />
        </Button>
        <input
          id="ws-stale"
          type="number"
          inputMode="numeric"
          min={STALE_MIN}
          max={STALE_MAX}
          value={value}
          disabled={disabled}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (Number.isFinite(n) && e.target.value !== "") onChange(clamp(n));
          }}
          className="h-9 w-14 border-x border-input bg-transparent text-center text-sm font-semibold tabular-nums outline-none [appearance:textfield] focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50 [&::-webkit-inner-spin-button]:appearance-none"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="rounded-s-none"
          onClick={() => onChange(clamp(value + 1))}
          disabled={disabled || value >= STALE_MAX}
          aria-label={t("workspace.followUp.more")}
        >
          <Plus />
        </Button>
      </div>
      <span className="text-sm text-muted-foreground">{t("workspace.followUp.days", { count: value })}</span>
    </div>
  );
}
