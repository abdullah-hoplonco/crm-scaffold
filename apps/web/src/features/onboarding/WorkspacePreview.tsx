import { Building2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { UserAvatar } from "@/components/app/UserAvatar";
import { formatTrn } from "@/features/settings/trn";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";
import { isBlankInvite, type OnboardingDraft } from "./draft";

const MAX_AVATARS = 6;

/** The workspace taking shape as the owner types: name, team and the pipeline they will land on. */
export function WorkspacePreview({ draft, className }: { draft: OnboardingDraft; className?: string }) {
  const { t } = useTranslation("settings");
  const { t: tc } = useTranslation();
  const name = draft.workspaceName.trim();
  const details = [
    draft.emirate ? tc(`emirates.${draft.emirate}`) : null,
    draft.trn.trim() ? `TRN ${formatTrn(draft.trn)}` : null,
  ].filter(Boolean);
  const people = [
    draft.ownerName.trim() || t("onboarding.preview.you"),
    ...draft.invites.filter((i) => !isBlankInvite(i)).map((i) => i.name.trim() || i.email.trim()),
  ];
  const stages = draft.stages.map((s) => s.name.trim());

  return (
    <div
      className={cn("rounded-2xl border bg-card p-5", className)}
      aria-label={t("onboarding.preview.label")}
      role="region"
    >
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent text-sm font-semibold text-accent-foreground"
        >
          {name ? initials(name) : <Building2 className="size-5" />}
        </span>
        <div className="min-w-0">
          <p
            className={cn(
              "truncate font-semibold",
              name ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {name || t("onboarding.preview.namePlaceholder")}
          </p>
          <p className="truncate text-xs text-muted-foreground tabular-nums">
            {details.length ? details.join(", ") : t("onboarding.preview.detailsPlaceholder")}
          </p>
        </div>
      </div>

      <div className="mt-5 border-t border-border pt-4">
        <p className="text-xs text-muted-foreground">{t("onboarding.preview.team")}</p>
        <div className="mt-2.5 flex items-center gap-3">
          <ul className="flex -space-x-1.5 rtl:space-x-reverse">
            {people.slice(0, MAX_AVATARS).map((person, i) => (
              <li key={`${person}-${i}`}>
                <UserAvatar name={person} className="ring-2 ring-card" />
              </li>
            ))}
          </ul>
          <p className="text-sm text-foreground">
            {people.length > MAX_AVATARS
              ? t("onboarding.preview.more", { count: people.length - MAX_AVATARS })
              : t("onboarding.preview.people", { count: people.length })}
          </p>
        </div>
      </div>

      <div className="mt-4 border-t border-border pt-4">
        <p className="text-xs text-muted-foreground">{t("onboarding.preview.pipeline")}</p>
        <ol className="mt-2.5 grid gap-1.5">
          {stages.map((stage, i) => (
            <li key={i} className="flex items-center gap-2.5 text-sm">
              <span
                className="h-1.5 w-14 shrink-0 overflow-hidden rounded-full bg-muted"
                aria-hidden="true"
              >
                <span
                  className="block h-full rounded-full bg-primary"
                  style={{ width: `${Math.round(((i + 1) / (stages.length + 1)) * 100)}%` }}
                />
              </span>
              <span
                className={cn("truncate", stage ? "text-foreground" : "text-muted-foreground")}
              >
                {stage || t("onboarding.preview.unnamedStage")}
              </span>
            </li>
          ))}
          <li className="flex items-center gap-2.5 text-sm">
            <span className="h-1.5 w-14 shrink-0 rounded-full bg-success" aria-hidden="true" />
            <span className="text-foreground">{t("onboarding.pipeline.won")}</span>
          </li>
          <li className="flex items-center gap-2.5 text-sm">
            <span className="h-1.5 w-14 shrink-0 rounded-full bg-muted" aria-hidden="true" />
            <span className="text-muted-foreground">{t("onboarding.pipeline.lost")}</span>
          </li>
        </ol>
      </div>
    </div>
  );
}
