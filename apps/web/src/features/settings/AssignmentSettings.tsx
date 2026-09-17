import { nextAssignee } from "@hco/core";
import { AssignmentStrategy, api, type AssignmentRule, type User } from "@hco/shared";
import { Hand, Repeat, UserX } from "lucide-react";
import { useId, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ErrorState, LoadingRows } from "@/components/app/States";
import { UserAvatar } from "@/components/app/UserAvatar";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useApiMutation, useApiQuery } from "@/lib/api/hooks";
import { errorMessage } from "@/lib/api/errors";
import { cn } from "@/lib/utils";
import { useSettingsAccess } from "./access";
import { ReadOnlyNote, SettingsPanel, SettingsSection, UnsavedChangesBar } from "./SettingsSection";

const FORM_ID = "assignment-settings";

export function AssignmentSettings() {
  const { t } = useTranslation("settings");
  const rule = useApiQuery(api.workspace.getAssignmentRule, {});
  const users = useApiQuery(api.workspace.listUsers, {});
  const error = rule.error ?? users.error;

  return (
    <SettingsSection title={t("assignment.title")} description={t("assignment.description")}>
      {rule.isPending || users.isPending ? (
        <div className="rounded-xl border bg-card">
          <LoadingRows rows={4} />
        </div>
      ) : error || !rule.data || !users.data ? (
        <ErrorState
          error={error}
          onRetry={() => {
            void rule.refetch();
            void users.refetch();
          }}
          className="rounded-xl border bg-card"
        />
      ) : (
        <AssignmentForm key={rule.data.updatedAt} rule={rule.data} users={users.data.items} />
      )}
    </SettingsSection>
  );
}

function AssignmentForm({ rule, users }: { rule: AssignmentRule; users: User[] }) {
  const { t } = useTranslation("settings");
  const { t: tc } = useTranslation();
  const { canEditTeamRules } = useSettingsAccess();
  const id = useId();
  const active = users.filter((u) => u.isActive);
  const activeIds = new Set(active.map((u) => u.id));
  const initialEligible = rule.eligibleUserIds.filter((uid) => activeIds.has(uid));
  const [strategy, setStrategy] = useState<AssignmentStrategy>(rule.strategy);
  const [eligible, setEligible] = useState<string[]>(initialEligible);
  const disabled = !canEditTeamRules;
  const dirty = strategy !== rule.strategy || eligible.join() !== initialEligible.join();

  const save = useApiMutation(api.workspace.updateAssignmentRule, {
    onSuccess: () => toast.success(t("assignment.saved")),
    onError: (e) => toast.error(errorMessage(e)),
  });

  // Keep the rotation order stable: people already in the rule first, newly ticked people after.
  const toggle = (userId: string, checked: boolean) =>
    setEligible((current) =>
      checked ? [...current.filter((x) => x !== userId), userId] : current.filter((x) => x !== userId),
    );

  const byId = new Map(users.map((u) => [u.id, u]));
  const rotationOrder = active
    .filter((u) => eligible.includes(u.id))
    .sort((a, b) => eligible.indexOf(a.id) - eligible.indexOf(b.id));
  const next = nextAssignee(
    {
      strategy,
      eligibleUserIds: rotationOrder.map((u) => u.id),
      lastAssignedUserId: rule.lastAssignedUserId,
    },
    activeIds,
  );
  const nextUser = next ? byId.get(next) : undefined;
  const queue = nextUser
    ? [
        ...rotationOrder.slice(rotationOrder.indexOf(nextUser)),
        ...rotationOrder.slice(0, rotationOrder.indexOf(nextUser)),
      ]
    : [];

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (strategy === "round_robin" && eligible.length === 0) {
      toast.error(t("assignment.errors.noneEligible"));
      return;
    }
    save.mutate({ body: { strategy, eligibleUserIds: rotationOrder.map((u) => u.id) } });
  };

  return (
    <form id={FORM_ID} onSubmit={onSubmit} className="flex flex-col gap-6">
      {disabled ? <ReadOnlyNote>{t("readOnly.assignment")}</ReadOnlyNote> : null}

      <NextLeadBanner strategy={strategy} queue={queue} />

      <fieldset disabled={disabled} className="contents">
        <SettingsPanel title={t("assignment.strategy.title")}>
          <RadioGroup
            value={strategy}
            onValueChange={(v) => setStrategy(AssignmentStrategy.parse(v))}
            className="grid gap-0 divide-y md:grid-cols-2 md:divide-x md:divide-y-0 rtl:md:divide-x-reverse"
            aria-label={t("assignment.strategy.title")}
          >
            {(
              [
                { value: "round_robin", icon: Repeat },
                { value: "manual", icon: Hand },
              ] as const
            ).map(({ value, icon: Icon }) => (
              <label
                key={value}
                htmlFor={`${id}-${value}`}
                className={cn(
                  "flex cursor-pointer items-start gap-3 px-4 py-4 transition-colors sm:px-5",
                  strategy === value ? "bg-accent/50" : "hover:bg-muted/40",
                  disabled && "cursor-default",
                )}
              >
                <RadioGroupItem id={`${id}-${value}`} value={value} className="mt-1" />
                <span className="min-w-0">
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
                    {t(`assignment.strategy.${value}.label`)}
                  </span>
                  <span className="mt-1 block text-sm leading-snug text-muted-foreground">
                    {t(`assignment.strategy.${value}.help`)}
                  </span>
                </span>
              </label>
            ))}
          </RadioGroup>
        </SettingsPanel>

        <SettingsPanel
          title={t("assignment.eligible.title")}
          description={
            strategy === "manual" ? t("assignment.eligible.manualNote") : t("assignment.eligible.description")
          }
          className={cn(strategy === "manual" && "opacity-70")}
        >
          {active.map((user) => {
            const checked = eligible.includes(user.id);
            const position = rotationOrder.findIndex((u) => u.id === user.id);
            return (
              <label
                key={user.id}
                htmlFor={`${id}-u-${user.id}`}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 sm:px-5",
                  !disabled && "cursor-pointer hover:bg-muted/40",
                )}
              >
                <Checkbox
                  id={`${id}-u-${user.id}`}
                  checked={checked}
                  onCheckedChange={(v) => toggle(user.id, v === true)}
                />
                <UserAvatar name={user.name} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{user.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {tc(`roles.${user.role}`)}
                    {user.jobTitle ? `, ${user.jobTitle.toLowerCase()}` : ""}
                  </span>
                </span>
                {checked && strategy === "round_robin" ? (
                  <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                    {t("assignment.eligible.position", { position: position + 1 })}
                  </span>
                ) : null}
              </label>
            );
          })}
        </SettingsPanel>
      </fieldset>

      <p className="text-sm text-muted-foreground">{t("assignment.returningNote")}</p>

      <UnsavedChangesBar
        visible={dirty && canEditTeamRules}
        pending={save.isPending}
        formId={FORM_ID}
        onDiscard={() => {
          setStrategy(rule.strategy);
          setEligible(initialEligible);
        }}
      />
    </form>
  );
}

/** The answer people want from this page: who gets the next lead. */
function NextLeadBanner({ strategy, queue }: { strategy: AssignmentStrategy; queue: User[] }) {
  const { t } = useTranslation("settings");
  const [nextUser, ...after] = queue;

  if (strategy === "manual" || !nextUser) {
    const Icon = strategy === "manual" ? Hand : UserX;
    return (
      <div className="flex items-center gap-4 rounded-xl border bg-accent px-4 py-4 text-accent-foreground sm:px-5">
        <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-card text-primary">
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-base font-semibold text-accent-foreground" aria-live="polite">
            {strategy === "manual" ? t("assignment.next.manual") : t("assignment.next.nobody")}
          </p>
          <p className="text-sm text-muted-foreground">
            {strategy === "manual" ? t("assignment.next.manualHelp") : t("assignment.next.nobodyHelp")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border bg-accent px-4 py-4 text-accent-foreground sm:flex-row sm:items-center sm:px-5">
      <div className="flex min-w-0 flex-1 items-center gap-3.5">
        <UserAvatar name={nextUser.name} size="lg" className="ring-2 ring-card" />
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{t("assignment.next.label")}</p>
          <p className="truncate text-lg font-semibold text-accent-foreground" aria-live="polite">
            {nextUser.name}
          </p>
        </div>
      </div>
      {after.length ? (
        <div className="min-w-0 sm:text-end">
          <p className="text-xs text-muted-foreground">{t("assignment.next.then")}</p>
          <ol className="mt-1.5 flex flex-wrap items-center gap-1.5 sm:justify-end">
            {after.map((u) => (
              <li
                key={u.id}
                className="flex items-center gap-1.5 rounded-full bg-card py-0.5 ps-0.5 pe-2.5 text-xs text-accent-foreground"
              >
                <UserAvatar name={u.name} size="sm" />
                {firstName(u.name)}
              </li>
            ))}
          </ol>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{t("assignment.next.onlyOne")}</p>
      )}
    </div>
  );
}

function firstName(name: string) {
  return name.replace(/^Dr\.\s+/i, "").split(" ")[0] ?? name;
}
