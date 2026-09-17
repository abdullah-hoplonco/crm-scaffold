import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { UserAvatar } from "@/components/app/UserAvatar";
import { Button } from "@/components/ui/button";
import { formatTrn } from "@/features/settings/trn";
import { isBlankInvite, type OnboardingDraft } from "./draft";

export function ReviewStep({ draft, onEdit }: { draft: OnboardingDraft; onEdit: (step: number) => void }) {
  const { t } = useTranslation("settings");
  const { t: tc } = useTranslation();
  const invites = draft.invites.filter((i) => !isBlankInvite(i));

  return (
    <div className="divide-y rounded-xl border">
      <ReviewBlock title={t("onboarding.steps.business")} onEdit={() => onEdit(0)}>
        <dl className="grid gap-1.5 text-sm">
          <Row label={t("onboarding.business.name")} value={draft.workspaceName.trim()} />
          <Row
            label={t("onboarding.business.trn")}
            value={draft.trn.trim() ? formatTrn(draft.trn) : t("onboarding.review.notAdded")}
            muted={!draft.trn.trim()}
          />
          <Row
            label={t("onboarding.business.emirate")}
            value={draft.emirate ? tc(`emirates.${draft.emirate}`) : t("onboarding.review.notAdded")}
            muted={!draft.emirate}
          />
        </dl>
      </ReviewBlock>

      <ReviewBlock title={t("onboarding.steps.owner")} onEdit={() => onEdit(1)}>
        <div className="flex items-center gap-3">
          <UserAvatar name={draft.ownerName.trim()} />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{draft.ownerName.trim()}</p>
            <p className="truncate text-xs text-muted-foreground">
              {draft.ownerEmail.trim()}, {tc("roles.owner").toLowerCase()}
            </p>
          </div>
        </div>
      </ReviewBlock>

      <ReviewBlock title={t("onboarding.steps.team")} onEdit={() => onEdit(2)}>
        {invites.length ? (
          <ul className="grid gap-2.5">
            {invites.map((invite) => (
              <li key={invite.key} className="flex items-center gap-3">
                <UserAvatar name={invite.name.trim()} size="sm" />
                <span className="min-w-0 flex-1 text-sm sm:truncate">
                  <span className="block truncate font-medium sm:inline">{invite.name.trim()}</span>
                  <span className="block truncate text-xs text-muted-foreground sm:ms-1.5 sm:inline sm:text-sm">
                    {invite.email.trim()}
                  </span>
                </span>
                <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs">
                  {tc(`roles.${invite.role}`)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">{t("onboarding.review.justYou")}</p>
        )}
      </ReviewBlock>

      <ReviewBlock title={t("onboarding.steps.pipeline")} onEdit={() => onEdit(3)}>
        <ol className="flex flex-wrap items-center gap-1.5 text-sm">
          {[
            ...draft.stages.map((s) => s.name.trim()),
            t("onboarding.pipeline.won"),
            t("onboarding.pipeline.lost"),
          ].map((name, i, all) => (
            <li
              key={`${name}-${i}`}
              className={
                i === all.length - 2
                  ? "rounded-full bg-success-soft px-2.5 py-0.5 text-success"
                  : i === all.length - 1
                    ? "rounded-full bg-muted px-2.5 py-0.5 text-muted-foreground"
                    : "rounded-full border bg-card px-2.5 py-0.5"
              }
            >
              {name}
            </li>
          ))}
        </ol>
      </ReviewBlock>
    </div>
  );
}

function ReviewBlock({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit: () => void;
  children: ReactNode;
}) {
  const { t } = useTranslation("settings");
  return (
    <section className="grid grid-cols-[minmax(0,1fr)] gap-3 px-4 py-4 sm:px-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">{title}</h3>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="-me-2 h-7 text-primary"
          onClick={onEdit}
          aria-label={t("onboarding.review.editSection", { section: title })}
        >
          {t("onboarding.review.edit")}
        </Button>
      </div>
      {children}
    </section>
  );
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="grid grid-cols-[7rem_minmax(0,1fr)] gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={muted ? "text-muted-foreground" : "font-medium tabular-nums"}>{value}</dd>
    </div>
  );
}
