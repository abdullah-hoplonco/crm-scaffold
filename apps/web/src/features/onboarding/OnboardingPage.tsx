import { api } from "@hco/shared";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Check } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { BrandMark } from "@/components/app/BrandMark";
import { Button } from "@/components/ui/button";
import { useApiMutation } from "@/lib/api/hooks";
import { errorMessage } from "@/lib/api/errors";
import { sessionQuery } from "@/lib/session";
import { cn } from "@/lib/utils";
import { STEP_VALIDATORS, emptyInvite, stagesFrom, toOnboardingInput, type OnboardingDraft } from "./draft";
import { usePresets } from "./presets";
import { ReviewStep } from "./ReviewStep";
import { BusinessStep, OwnerStep, PipelineStep, TeamStep } from "./steps";
import { WorkspacePreview } from "./WorkspacePreview";

const STEP_KEYS = ["business", "owner", "team", "pipeline", "review"] as const;
const LAST = STEP_KEYS.length - 1;

/** New-workspace wizard: business, you, team, pipeline, review. Creating signs in as the owner. */
export function OnboardingPage() {
  const { t } = useTranslation("settings");
  const presets = usePresets();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [draft, setDraft] = useState<OnboardingDraft>(() => ({
    workspaceName: "",
    trn: "",
    emirate: null,
    ownerName: "",
    ownerEmail: "",
    invites: [emptyInvite()],
    preset: presets[0]?.key ?? null,
    stages: stagesFrom(presets[0]?.stages ?? []),
  }));
  const [step, setStep] = useState(0);
  const [furthest, setFurthest] = useState(0);
  const [showErrors, setShowErrors] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const firstRender = useRef(true);

  const errors = showErrors ? (STEP_VALIDATORS[step]?.(draft) ?? {}) : {};

  const create = useApiMutation(api.workspace.createWorkspace, {
    onSuccess: async (session) => {
      queryClient.clear();
      queryClient.setQueryData(sessionQuery.queryKey, session);
      toast.success(t("onboarding.created", { name: session.workspace.name }));
      await navigate({ to: "/dashboard" });
    },
    onError: (error) => setSubmitError(errorMessage(error)),
  });

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  const isValid = (index: number) => Object.keys(STEP_VALIDATORS[index]?.(draft) ?? {}).length === 0;

  const goTo = (target: number) => {
    for (let index = step; index < target; index++) {
      if (!isValid(index)) {
        setStep(index);
        setShowErrors(true);
        return;
      }
    }
    setShowErrors(false);
    setSubmitError(null);
    setStep(target);
    setFurthest((f) => Math.max(f, target));
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (step < LAST) {
      if (!isValid(step)) {
        setShowErrors(true);
        return;
      }
      goTo(step + 1);
      return;
    }
    setSubmitError(null);
    create.mutate({ body: toOnboardingInput(draft) });
  };

  const onChange = (patch: Partial<OnboardingDraft>) => setDraft((d) => ({ ...d, ...patch }));
  const stepKey = STEP_KEYS[step] ?? "business";
  const stepProps = { draft, errors, onChange };

  return (
    <div className="min-h-dvh bg-background">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6 sm:py-5">
        <Link
          to="/login"
          className="flex items-center gap-2.5 rounded-md focus-visible:ring-2 focus-visible:ring-ring"
        >
          <BrandMark className="size-8" />
          <span className="font-semibold">{t("onboarding.appName")}</span>
        </Link>
        <p className="text-sm text-muted-foreground">
          <span className="hidden sm:inline">{t("onboarding.haveWorkspace")} </span>
          <Link to="/login" className="font-medium text-primary underline-offset-4 hover:underline">
            {t("onboarding.signIn")}
          </Link>
        </p>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 pb-16 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-10 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="min-w-0">
            <div className="mb-6 sm:mb-8">
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t("onboarding.title")}</h1>
              <p className="mt-1.5 text-muted-foreground">{t("onboarding.subtitle")}</p>
            </div>

            <Stepper current={step} furthest={furthest} onJump={goTo} />

            <form
              onSubmit={onSubmit}
              noValidate
              className="mt-5 rounded-2xl border bg-card p-5 shadow-sm sm:p-7"
              aria-labelledby="onboarding-step-title"
            >
              <div className="mb-6">
                <h2
                  id="onboarding-step-title"
                  ref={headingRef}
                  tabIndex={-1}
                  className="text-lg font-semibold tracking-tight outline-none"
                >
                  {t(`onboarding.${stepKey}.title`)}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">{t(`onboarding.${stepKey}.description`)}</p>
              </div>

              {step === 0 ? <BusinessStep {...stepProps} /> : null}
              {step === 1 ? <OwnerStep {...stepProps} /> : null}
              {step === 2 ? <TeamStep {...stepProps} /> : null}
              {step === 3 ? <PipelineStep {...stepProps} /> : null}
              {step === 4 ? <ReviewStep draft={draft} onEdit={(target) => goTo(target)} /> : null}

              {submitError ? (
                <p
                  role="alert"
                  className="mt-5 rounded-lg bg-danger-soft px-3.5 py-2.5 text-sm text-destructive"
                >
                  {submitError}
                </p>
              ) : null}

              <div className="mt-8 flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
                {step > 0 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => goTo(step - 1)}
                    disabled={create.isPending}
                  >
                    <ArrowLeft className="rtl:rotate-180" />
                    {t("onboarding.back")}
                  </Button>
                ) : (
                  <span className="hidden sm:block" />
                )}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  {step === 4 ? (
                    <p className="text-center text-sm text-muted-foreground sm:me-2 sm:text-end">
                      {t("onboarding.review.signInNote", { name: draft.ownerName.trim() })}
                    </p>
                  ) : null}
                  <Button type="submit" size="lg" disabled={create.isPending} className="sm:min-w-40">
                    {step === LAST
                      ? create.isPending
                        ? t("onboarding.creating")
                        : t("onboarding.create")
                      : step === 2 && draft.invites.every((i) => !i.name.trim() && !i.email.trim())
                        ? t("onboarding.skipTeam")
                        : t("onboarding.continue")}
                  </Button>
                </div>
              </div>
            </form>
          </div>

          <aside className="hidden lg:block" aria-label={t("onboarding.preview.label")}>
            <div className="sticky top-6">
              <WorkspacePreview draft={draft} />
              <p className="mt-3 px-1 text-xs text-muted-foreground">{t("onboarding.preview.hint")}</p>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

function Stepper({
  current,
  furthest,
  onJump,
}: {
  current: number;
  furthest: number;
  onJump: (step: number) => void;
}) {
  const { t } = useTranslation("settings");
  return (
    <nav aria-label={t("onboarding.progress")}>
      <ol className="flex items-center gap-1.5 sm:gap-2">
        {STEP_KEYS.map((key, index) => {
          const done = index < furthest && index !== current;
          const reachable = index <= furthest;
          const isCurrent = index === current;
          return (
            <li key={key} className={cn("flex items-center gap-1.5 sm:gap-2", index < LAST && "flex-1")}>
              <button
                type="button"
                onClick={() => onJump(index)}
                disabled={!reachable || isCurrent}
                aria-current={isCurrent ? "step" : undefined}
                className={cn(
                  "group flex shrink-0 items-center gap-2 rounded-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-default",
                )}
              >
                <span
                  className={cn(
                    "inline-flex size-7 items-center justify-center rounded-full border text-xs font-semibold tabular-nums transition-colors",
                    isCurrent && "border-primary bg-primary text-primary-foreground",
                    done && "border-primary/40 bg-accent text-accent-foreground group-hover:border-primary",
                    !isCurrent && !done && "bg-card text-muted-foreground",
                  )}
                >
                  {done ? <Check className="size-3.5" aria-hidden="true" /> : index + 1}
                </span>
                <span
                  className={cn(
                    "hidden text-sm md:inline",
                    isCurrent ? "font-medium text-foreground" : "text-muted-foreground",
                  )}
                >
                  {t(`onboarding.steps.${key}`)}
                </span>
                <span className="sr-only md:hidden">{t(`onboarding.steps.${key}`)}</span>
              </button>
              {index < LAST ? (
                <span
                  aria-hidden="true"
                  className={cn("h-px min-w-3 flex-1", index < furthest ? "bg-primary/40" : "bg-border")}
                />
              ) : null}
            </li>
          );
        })}
      </ol>
      <p className="mt-3 text-sm text-muted-foreground md:hidden">
        {t("onboarding.stepOf", {
          current: current + 1,
          total: STEP_KEYS.length,
          label: t(`onboarding.steps.${STEP_KEYS[current] ?? "business"}`),
        })}
      </p>
    </nav>
  );
}
