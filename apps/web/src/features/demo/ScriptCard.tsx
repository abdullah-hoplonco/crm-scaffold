import type { DemoStatus } from "@hco/shared/api/demo";
import { AppWindow, Check, ClipboardList } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useDemoSession } from "./demo-session";
import { openRepWindow } from "./RepWindows";
import type { DemoActionKey } from "./useSimulate";

function firstNameOf(name: string) {
  return name.split(" ")[0] ?? name;
}

function Step({
  number,
  done,
  children,
  action,
}: {
  number: number;
  done: boolean;
  children: ReactNode;
  action?: ReactNode;
}) {
  const { t } = useTranslation("demo");
  return (
    <li className="flex gap-3">
      <span
        className={cn(
          "mt-px inline-flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums transition-colors",
          done ? "bg-primary text-primary-foreground" : "border border-input bg-card text-foreground",
        )}
      >
        {done ? <Check className="size-3.5" aria-label={t("script.done")} /> : number}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className={cn("min-w-0 pt-0.5 text-sm", done && "text-muted-foreground")}>{children}</div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </li>
  );
}

/** The three-step story from the brief, with live ticks as the presenter follows it. */
export function ScriptCard({
  status,
  isLoading,
  pending,
  onRun,
}: {
  status: DemoStatus | undefined;
  /** While true the rep names aren't known yet, so the steps show placeholders. */
  isLoading: boolean;
  pending: DemoActionKey | null;
  onRun: (key: DemoActionKey) => void;
}) {
  const { t } = useTranslation("demo");
  const session = useDemoSession();
  const reps = status?.reps ?? [];
  const assignment = status?.assignment;
  const instagramLeads = session.entries.filter((e) => e.source === "instagram" && e.outcome === "created");
  const opened = reps.find((r) => r.email === session.openedRepEmail);
  // Keep the story on one rep: the window you opened, else whoever got the first Instagram lead, else next in line.
  const firstInstagramLead = instagramLeads[instagramLeads.length - 1];
  const receivedFirst = reps.find((r) => r.id === firstInstagramLead?.assigneeId);
  const next = reps.find((r) => r.id === assignment?.nextAssigneeId);
  const rep = opened ?? receivedFirst ?? next ?? reps[0];
  const repFirst = rep ? firstNameOf(rep.name) : t("script.fallbackRep");

  const step1Done = Boolean(opened);
  const step2Done = instagramLeads.length > 0;
  const step3Done = Boolean(rep) && instagramLeads.some((e) => e.assigneeId === rep?.id);
  const isManual = assignment?.strategy === "manual";
  const nextIsSomeoneElse =
    !isManual && !step3Done && rep && assignment?.nextAssigneeId && assignment.nextAssigneeId !== rep.id;

  return (
    <section aria-labelledby="demo-script" className="rounded-xl border bg-card p-4 sm:p-5">
      <h2 id="demo-script" className="text-base font-semibold">
        {t("script.title")}
      </h2>
      {isLoading ? (
        <div className="mt-4 flex flex-col gap-4" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="size-6 rounded-full" />
              <Skeleton className="h-4 w-full max-w-sm" />
            </div>
          ))}
        </div>
      ) : (
        <ol className="mt-4 flex flex-col gap-4">
          <Step
            number={1}
            done={step1Done}
            action={
              rep ? (
                <Button variant="outline" size="sm" onClick={() => openRepWindow(rep)}>
                  <AppWindow />
                  {t("script.step1Action", { name: repFirst })}
                </Button>
              ) : null
            }
          >
            {t("script.step1", { name: repFirst })}
          </Step>
          <Step
            number={2}
            done={step2Done}
            action={
              <Button size="sm" onClick={() => onRun("instagram")} disabled={pending !== null}>
                <ClipboardList />
                {t("actions.instagram.label")}
              </Button>
            }
          >
            {t("script.step2")}
            {nextIsSomeoneElse && assignment?.nextAssigneeName ? (
              <p className="mt-1.5 rounded-md bg-warning-soft px-2.5 py-1.5 text-xs leading-relaxed text-[#6B4700]">
                {t("script.nextIsSomeoneElse", {
                  next: assignment.nextAssigneeName,
                  nextFirst: firstNameOf(assignment.nextAssigneeName),
                })}
              </p>
            ) : null}
            {isManual ? (
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{t("script.manual")}</p>
            ) : null}
          </Step>
          <Step number={3} done={step3Done}>
            {t("script.step3", { name: repFirst })}
          </Step>
        </ol>
      )}
    </section>
  );
}
