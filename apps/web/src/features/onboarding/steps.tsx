import { Emirate, Role } from "@hco/shared";
import { ArrowDown, ArrowUp, Briefcase, House, Lock, Plus, Stethoscope, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { formatTrn } from "@/features/settings/trn";
import { cn } from "@/lib/utils";
import {
  MAX_INVITES,
  MAX_OPEN_STAGES,
  draftKey,
  emptyInvite,
  stagesFrom,
  type DraftErrors,
  type OnboardingDraft,
  type PresetKey,
} from "./draft";
import { Field, describedBy } from "./Field";
import { usePresets } from "./presets";

export interface StepProps {
  draft: OnboardingDraft;
  errors: DraftErrors;
  onChange: (patch: Partial<OnboardingDraft>) => void;
}

// ---------------------------------------------------------------------------
// 1. Business
// ---------------------------------------------------------------------------

export function BusinessStep({ draft, errors, onChange }: StepProps) {
  const { t } = useTranslation("settings");
  const { t: tc } = useTranslation();
  return (
    <div className="grid gap-5">
      <Field id="ob-name" label={t("onboarding.business.name")} error={errors.workspaceName}>
        <Input
          id="ob-name"
          value={draft.workspaceName}
          onChange={(e) => onChange({ workspaceName: e.target.value })}
          placeholder={t("onboarding.business.namePlaceholder")}
          autoComplete="organization"
          autoFocus
          {...describedBy("ob-name", errors.workspaceName)}
        />
      </Field>
      <Field
        id="ob-trn"
        label={t("onboarding.business.trn")}
        optional
        help={t("onboarding.business.trnHelp")}
        error={errors.trn}
      >
        <Input
          id="ob-trn"
          value={draft.trn}
          onChange={(e) => onChange({ trn: formatTrn(e.target.value) })}
          inputMode="numeric"
          placeholder="100-0000-0000-0003"
          className="font-medium tracking-wide tabular-nums sm:max-w-64"
          {...describedBy("ob-trn", errors.trn, true)}
        />
      </Field>
      <fieldset className="grid gap-2">
        <legend className="mb-2 flex items-baseline gap-2 text-sm font-medium">
          {t("onboarding.business.emirate")}
          <span className="text-xs font-normal text-muted-foreground">{t("onboarding.optional")}</span>
        </legend>
        <ToggleGroup
          type="single"
          variant="outline"
          spacing={2}
          value={draft.emirate ?? ""}
          onValueChange={(value) => onChange({ emirate: value ? Emirate.parse(value) : null })}
          className="w-full flex-wrap"
        >
          {Emirate.options.map((emirate) => (
            <ToggleGroupItem
              key={emirate}
              value={emirate}
              className="rounded-full px-3.5 data-[state=on]:border-primary/50 data-[state=on]:bg-accent"
            >
              {tc(`emirates.${emirate}`)}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </fieldset>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 2. You
// ---------------------------------------------------------------------------

export function OwnerStep({ draft, errors, onChange }: StepProps) {
  const { t } = useTranslation("settings");
  return (
    <div className="grid gap-5">
      <Field id="ob-owner-name" label={t("onboarding.owner.name")} error={errors.ownerName}>
        <Input
          id="ob-owner-name"
          value={draft.ownerName}
          onChange={(e) => onChange({ ownerName: e.target.value })}
          placeholder={t("onboarding.owner.namePlaceholder")}
          autoComplete="name"
          autoFocus
          {...describedBy("ob-owner-name", errors.ownerName)}
        />
      </Field>
      <Field
        id="ob-owner-email"
        label={t("onboarding.owner.email")}
        help={t("onboarding.owner.emailHelp")}
        error={errors.ownerEmail}
      >
        <Input
          id="ob-owner-email"
          type="email"
          value={draft.ownerEmail}
          onChange={(e) => onChange({ ownerEmail: e.target.value })}
          placeholder={t("onboarding.owner.emailPlaceholder")}
          autoComplete="email"
          {...describedBy("ob-owner-email", errors.ownerEmail, true)}
        />
      </Field>
      <p className="rounded-lg bg-accent/50 px-3.5 py-3 text-sm text-accent-foreground">
        {t("onboarding.owner.roleNote")}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 3. Team
// ---------------------------------------------------------------------------

export function TeamStep({ draft, errors, onChange }: StepProps) {
  const { t } = useTranslation("settings");
  const { t: tc } = useTranslation();
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const setInvite = (key: string, patch: Partial<OnboardingDraft["invites"][number]>) =>
    onChange({ invites: draft.invites.map((i) => (i.key === key ? { ...i, ...patch } : i)) });

  const add = () => {
    const invite = emptyInvite();
    setFocusKey(invite.key);
    onChange({ invites: [...draft.invites, invite] });
  };

  return (
    <div className="grid gap-4">
      <div className="hidden grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)_8.5rem_2.25rem] gap-2 text-xs font-medium text-muted-foreground sm:grid">
        <span>{t("onboarding.team.name")}</span>
        <span>{t("onboarding.team.email")}</span>
        <span>{t("onboarding.team.role")}</span>
      </div>
      <ol className="grid gap-3 sm:gap-2">
        {draft.invites.map((invite, index) => {
          const nameError = errors[`invites.${invite.key}.name`];
          const emailError = errors[`invites.${invite.key}.email`];
          const label = t("onboarding.team.rowLabel", { n: index + 1 });
          return (
            <li key={invite.key} className="rounded-lg border p-3 sm:border-0 sm:p-0">
              <fieldset className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)_8.5rem_2.25rem] sm:items-start">
                <legend className="mb-2 text-xs font-medium text-muted-foreground sm:sr-only">{label}</legend>
                <div>
                  <Input
                    value={invite.name}
                    onChange={(e) => setInvite(invite.key, { name: e.target.value })}
                    placeholder={t("onboarding.team.namePlaceholder")}
                    aria-label={`${label}: ${t("onboarding.team.name")}`}
                    autoFocus={focusKey === invite.key}
                    aria-invalid={nameError ? true : undefined}
                  />
                  {nameError ? <p className="mt-1 text-[13px] text-destructive">{t(nameError)}</p> : null}
                </div>
                <div>
                  <Input
                    type="email"
                    value={invite.email}
                    onChange={(e) => setInvite(invite.key, { email: e.target.value })}
                    placeholder={t("onboarding.team.emailPlaceholder")}
                    aria-label={`${label}: ${t("onboarding.team.email")}`}
                    aria-invalid={emailError ? true : undefined}
                  />
                  {emailError ? <p className="mt-1 text-[13px] text-destructive">{t(emailError)}</p> : null}
                </div>
                <div className="flex gap-2">
                  <Select
                    value={invite.role}
                    onValueChange={(v) => setInvite(invite.key, { role: Role.parse(v) })}
                  >
                    <SelectTrigger className="w-full" aria-label={`${label}: ${t("onboarding.team.role")}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Role.options.map((role) => (
                        <SelectItem key={role} value={role}>
                          {tc(`roles.${role}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-muted-foreground sm:hidden"
                    onClick={() => onChange({ invites: draft.invites.filter((i) => i.key !== invite.key) })}
                    aria-label={t("onboarding.team.remove", { n: index + 1 })}
                  >
                    <Trash2 />
                  </Button>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="hidden text-muted-foreground sm:inline-flex"
                  onClick={() => onChange({ invites: draft.invites.filter((i) => i.key !== invite.key) })}
                  aria-label={t("onboarding.team.remove", { n: index + 1 })}
                >
                  <X />
                </Button>
              </fieldset>
            </li>
          );
        })}
      </ol>
      {draft.invites.length === 0 ? (
        <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
          {t("onboarding.team.empty")}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button type="button" variant="outline" onClick={add} disabled={draft.invites.length >= MAX_INVITES}>
          <Plus />
          {draft.invites.length === 0 ? t("onboarding.team.addFirst") : t("onboarding.team.add")}
        </Button>
        <p className="text-[13px] text-muted-foreground">{t("onboarding.team.later")}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 4. Pipeline
// ---------------------------------------------------------------------------

const PRESET_ICON: Record<PresetKey, typeof House> = {
  clinic: Stethoscope,
  realEstate: House,
  b2b: Briefcase,
};

export function PipelineStep({ draft, errors, onChange }: StepProps) {
  const { t } = useTranslation("settings");
  const presets = usePresets();
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const inputs = useRef(new Map<string, HTMLInputElement>());

  useEffect(() => {
    if (focusKey) inputs.current.get(focusKey)?.focus();
  }, [focusKey]);

  const stages = draft.stages;
  const edit = (next: OnboardingDraft["stages"]) => onChange({ stages: next, preset: null });
  const move = (index: number, delta: -1 | 1) => {
    const target = index + delta;
    const current = stages[index];
    const other = stages[target];
    if (!current || !other) return;
    const next = [...stages];
    next[index] = other;
    next[target] = current;
    edit(next);
  };
  const add = () => {
    const stage = { key: draftKey(), name: "" };
    edit([...stages, stage]);
    setFocusKey(stage.key);
  };

  return (
    <div className="grid gap-6">
      <fieldset className="grid gap-2">
        <legend className="mb-2 text-sm font-medium">{t("onboarding.pipeline.startFrom")}</legend>
        <ToggleGroup
          type="single"
          variant="outline"
          spacing={2}
          value={draft.preset ?? ""}
          onValueChange={(value) => {
            const preset = presets.find((p) => p.key === value);
            if (preset) onChange({ preset: preset.key, stages: stagesFrom(preset.stages) });
          }}
          className="grid w-full grid-cols-1 gap-2 sm:grid-cols-3"
        >
          {presets.map((preset) => {
            const Icon = PRESET_ICON[preset.key];
            return (
              <ToggleGroupItem
                key={preset.key}
                value={preset.key}
                className="h-auto justify-start gap-3 rounded-lg px-3 py-2.5 text-start whitespace-normal data-[state=on]:border-primary/50 data-[state=on]:bg-accent"
              >
                <Icon className="size-4 text-primary" />
                <span className="min-w-0">
                  <span className="block text-sm leading-snug font-medium">{preset.label}</span>
                  <span className="block text-xs font-normal text-muted-foreground">
                    {t("onboarding.pipeline.stageCount", { count: preset.stages.length })}
                  </span>
                </span>
              </ToggleGroupItem>
            );
          })}
        </ToggleGroup>
        {draft.preset === null ? (
          <p className="text-[13px] text-muted-foreground">{t("onboarding.pipeline.customised")}</p>
        ) : null}
      </fieldset>

      <div className="grid gap-2">
        <p className="text-sm font-medium" id="ob-stages-label">
          {t("onboarding.pipeline.stages")}
        </p>
        <ol className="grid gap-2" aria-labelledby="ob-stages-label">
          {stages.map((stage, index) => {
            const error = errors[`stages.${stage.key}`];
            const label = t("onboarding.pipeline.stageLabel", { n: index + 1 });
            return (
              <li key={stage.key}>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span
                    aria-hidden="true"
                    className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground tabular-nums"
                  >
                    {index + 1}
                  </span>
                  <Input
                    ref={(el) => {
                      if (el) inputs.current.set(stage.key, el);
                      else inputs.current.delete(stage.key);
                    }}
                    value={stage.name}
                    onChange={(e) =>
                      edit(stages.map((s) => (s.key === stage.key ? { ...s, name: e.target.value } : s)))
                    }
                    placeholder={t("onboarding.pipeline.stagePlaceholder")}
                    aria-label={label}
                    aria-invalid={error ? true : undefined}
                    className="min-w-0 flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    aria-label={t("onboarding.pipeline.moveUp", {
                      name: stage.name || t("onboarding.pipeline.stageN", { n: index + 1 }),
                    })}
                  >
                    <ArrowUp />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => move(index, 1)}
                    disabled={index === stages.length - 1}
                    aria-label={t("onboarding.pipeline.moveDown", {
                      name: stage.name || t("onboarding.pipeline.stageN", { n: index + 1 }),
                    })}
                  >
                    <ArrowDown />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="text-muted-foreground"
                    onClick={() => edit(stages.filter((s) => s.key !== stage.key))}
                    disabled={stages.length === 1}
                    aria-label={t("onboarding.pipeline.remove", {
                      name: stage.name || t("onboarding.pipeline.stageN", { n: index + 1 }),
                    })}
                  >
                    <X />
                  </Button>
                </div>
                {error ? <p className="mt-1 ms-9 text-[13px] text-destructive">{t(error)}</p> : null}
              </li>
            );
          })}
          {(["won", "lost"] as const).map((type, i) => (
            <li key={type} className="flex items-center gap-1.5 sm:gap-2">
              <span
                aria-hidden="true"
                className={cn(
                  "inline-flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums",
                  type === "won" ? "bg-success-soft text-success" : "bg-muted text-muted-foreground",
                )}
              >
                {stages.length + i + 1}
              </span>
              <span className="flex h-9 min-w-0 flex-1 items-center justify-between gap-2 rounded-md border border-dashed bg-muted/40 px-3 text-sm">
                <span className="font-medium">{t(`onboarding.pipeline.${type}`)}</span>
                <span className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                  <Lock className="size-3 shrink-0" aria-hidden="true" />
                  <span className="truncate">{t("onboarding.pipeline.alwaysLast")}</span>
                </span>
              </span>
              <span className="w-[6.75rem] shrink-0 sm:w-[7rem]" aria-hidden="true" />
            </li>
          ))}
        </ol>
        {errors.stages ? <p className="text-sm text-destructive">{t(errors.stages)}</p> : null}
        <div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-1"
            onClick={add}
            disabled={stages.length >= MAX_OPEN_STAGES}
          >
            <Plus />
            {t("onboarding.pipeline.add")}
          </Button>
        </div>
      </div>
    </div>
  );
}
