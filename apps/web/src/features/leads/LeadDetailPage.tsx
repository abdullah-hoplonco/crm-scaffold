import { api, type LeadStatus } from "@hco/shared";
import type { LeadDetail } from "@hco/shared/api/leads";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRightLeft,
  Ban,
  BadgeCheck,
  CalendarClock,
  CircleCheckBig,
  KanbanSquare,
  Mail,
  MessageSquareQuote,
  Phone,
  PhoneOutgoing,
  SearchX,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { AssigneeSelect } from "@/components/app/AssigneeSelect";
import { Money } from "@/components/app/Money";
import { SourceBadge } from "@/components/app/SourceBadge";
import { EmptyState, ErrorState } from "@/components/app/States";
import { UserAvatar } from "@/components/app/UserAvatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useNow } from "@/features/inbox/hooks";
import { OpenChatButton } from "@/features/inbox/OpenChatButton";
import { TaskList } from "@/features/timeline/TaskList";
import { Timeline } from "@/features/timeline/Timeline";
import { errorMessage, isApiError } from "@/lib/api/errors";
import { useApiMutation, useApiQuery } from "@/lib/api/hooks";
import { formatDateTime, formatPhone, latenessOf } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ConvertLeadDialog } from "./ConvertLeadDialog";
import { DisqualifyDialog } from "./DisqualifyDialog";
import { LeadStatusPill, SpeedChip, useReceivedLabel } from "./LeadBits";

const OPEN: ReadonlySet<LeadStatus> = new Set(["new", "contacted", "qualified"]);

export function LeadDetailPage({ leadId }: { leadId: string }) {
  const { t } = useTranslation("leads");
  const query = useApiQuery(api.leads.get, { params: { leadId } });

  if (query.isPending) return <DetailSkeleton />;
  if (query.isError) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 lg:px-8">
        <BackLink />
        {isApiError(query.error, "NOT_FOUND") || isApiError(query.error, "FORBIDDEN") ? (
          <EmptyState
            icon={SearchX}
            title={t("detail.unavailable")}
            description={errorMessage(query.error)}
            action={
              <Button asChild variant="outline" size="sm">
                <Link to="/leads">{t("detail.backToLeads")}</Link>
              </Button>
            }
          />
        ) : (
          <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        )}
      </div>
    );
  }
  return <LeadDetailView detail={query.data} />;
}

function LeadDetailView({ detail }: { detail: LeadDetail }) {
  const { t } = useTranslation("leads");
  const { lead } = detail;
  const now = useNow(15_000);
  const received = useReceivedLabel();
  const [converting, setConverting] = useState(false);
  const [disqualifying, setDisqualifying] = useState(false);
  const isOpen = OPEN.has(lead.status);
  const users = useApiQuery(api.workspace.listUsers, {});

  const setStatus = useApiMutation(api.leads.setStatus, {
    onSuccess: (updated) => toast.success(t(`actions.done.${updated.status}`)),
    onError: (e) => toast.error(t("actions.failed"), { description: errorMessage(e) }),
  });
  const assign = useApiMutation(api.leads.assign, {
    onSuccess: (updated) => {
      const name = users.data?.items.find((u) => u.id === updated.assigneeId)?.name;
      toast.success(name ? t("actions.assigned", { name }) : t("actions.unassigned"));
    },
    onError: (e) => toast.error(t("actions.assignFailed"), { description: errorMessage(e) }),
  });
  const mark = (status: "contacted" | "qualified") => setStatus.mutate({ params: { leadId: lead.id }, body: { status } });

  const statusActions = isOpen ? (
    <>
      {lead.status === "new" ? (
        <Button variant="outline" onClick={() => mark("contacted")} disabled={setStatus.isPending}>
          <PhoneOutgoing className="size-4" />
          {t("actions.markContacted")}
        </Button>
      ) : null}
      {lead.status !== "qualified" ? (
        <Button variant="outline" onClick={() => mark("qualified")} disabled={setStatus.isPending}>
          <BadgeCheck className="size-4" />
          {t("actions.qualify")}
        </Button>
      ) : null}
      <Button variant="ghost" className="text-muted-foreground hover:text-destructive" onClick={() => setDisqualifying(true)}>
        <Ban className="size-4" />
        {t("actions.disqualify")}
      </Button>
    </>
  ) : null;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pt-4 pb-12 sm:px-6 lg:px-8">
      <BackLink />

      {/* Header */}
      <header className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <UserAvatar name={lead.name} size="lg" className="mt-0.5" />
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight break-words sm:text-2xl">{lead.name}</h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <LeadStatusPill status={lead.status} />
              <SourceBadge source={lead.source} />
              <SpeedChip lead={lead} now={now} />
              <span className="text-sm text-muted-foreground">
                <time dateTime={lead.receivedAt} title={formatDateTime(lead.receivedAt)}>
                  {t("detail.received", { when: received(lead.receivedAt, now) })}
                </time>
              </span>
            </div>
          </div>
        </div>
        {isOpen ? (
          <div className="flex flex-col gap-2 sm:flex-row-reverse sm:flex-wrap sm:items-center lg:shrink-0">
            <Button onClick={() => setConverting(true)} className="w-full sm:w-auto">
              <ArrowRightLeft className="size-4" />
              {t("actions.convert")}
            </Button>
            <div className="flex flex-wrap gap-2">{statusActions}</div>
          </div>
        ) : null}
      </header>

      {/* Banners */}
      <div className="mt-5 flex flex-col gap-3 empty:hidden">
        {lead.status === "converted" ? <ConvertedBanner detail={detail} /> : null}
        {lead.status === "disqualified" ? (
          <Banner icon={Ban} tone="muted">
            <p className="font-medium">
              {t("detail.disqualified", {
                reason: lead.disqualifyReason ? t(`common:disqualifyReasons.${lead.disqualifyReason}`) : t("detail.noReason"),
              })}
            </p>
            {lead.disqualifyNote ? <p className="text-muted-foreground">{lead.disqualifyNote}</p> : null}
          </Banner>
        ) : null}
        {detail.matchedContact ? (
          <Banner icon={UserRound} tone="info">
            <p>
              {t("detail.returning")}{" "}
              <Link
                to="/contacts/$contactId"
                params={{ contactId: detail.matchedContact.id }}
                className="font-semibold underline-offset-4 hover:underline"
              >
                {[detail.matchedContact.firstName, detail.matchedContact.lastName].filter(Boolean).join(" ")}
              </Link>
            </p>
            <p className="text-muted-foreground">{t("detail.returningHint")}</p>
          </Banner>
        ) : null}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:grid-rows-[auto_auto_1fr] lg:items-start">
        {/* On a phone the way to reach them comes first; on desktop it heads the side column. */}
        <ReachPanel detail={detail} className="lg:hidden" />
        <Enquiry detail={detail} className="lg:col-start-1 lg:row-start-1" />

        <aside className="flex flex-col gap-4 lg:col-start-2 lg:row-span-3 lg:row-start-1">
          <ReachPanel detail={detail} className="hidden lg:block" />

          <Panel title={t("detail.owner")}>
            <label htmlFor="lead-assignee" className="sr-only">
              {t("detail.owner")}
            </label>
            <AssigneeSelect
              id="lead-assignee"
              value={lead.assigneeId}
              onChange={(assigneeId) => assign.mutate({ params: { leadId: lead.id }, body: { assigneeId } })}
              disabled={!isOpen || assign.isPending}
              className="w-full"
            />
            <NextTask detail={detail} now={now} />
          </Panel>

          <Panel title={t("detail.details")}>
            <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted-foreground">{t("detail.receivedAt")}</dt>
              <dd className="tabular-nums">{formatDateTime(lead.receivedAt)}</dd>
              <dt className="text-muted-foreground">{t("detail.source")}</dt>
              <dd>
                <SourceBadge source={lead.source} />
              </dd>
              {lead.campaignName ? (
                <>
                  <dt className="text-muted-foreground">{t("detail.campaign")}</dt>
                  <dd>{lead.campaignName}</dd>
                </>
              ) : null}
              {lead.companyName ? (
                <>
                  <dt className="text-muted-foreground">{t("detail.company")}</dt>
                  <dd>{lead.companyName}</dd>
                </>
              ) : null}
              {lead.firstContactedAt ? (
                <>
                  <dt className="text-muted-foreground">{t("detail.firstContacted")}</dt>
                  <dd className="tabular-nums">{formatDateTime(lead.firstContactedAt)}</dd>
                </>
              ) : null}
              {lead.isSimulated ? (
                <>
                  <dt className="text-muted-foreground">{t("detail.origin")}</dt>
                  <dd className="text-muted-foreground">{t("detail.simulated")}</dd>
                </>
              ) : null}
            </dl>
          </Panel>
        </aside>

        <section className="lg:col-start-1 lg:row-start-2" aria-labelledby="lead-timeline">
          <h2 id="lead-timeline" className="mb-3 text-base font-semibold">
            {t("detail.timeline")}
          </h2>
          <Timeline subject={{ leadId: lead.id }} allowCompose={isOpen} />
        </section>

        <section className="lg:col-start-1 lg:row-start-3" aria-labelledby="lead-tasks">
          <h2 id="lead-tasks" className="mb-3 text-base font-semibold">
            {t("detail.tasks")}
          </h2>
          <TaskList subject={{ leadId: lead.id }} />
        </section>
      </div>

      {isOpen ? (
        <>
          <ConvertLeadDialog key={`convert-${lead.id}`} detail={detail} open={converting} onOpenChange={setConverting} />
          <DisqualifyDialog
            leadId={lead.id}
            leadName={lead.name}
            open={disqualifying}
            onOpenChange={setDisqualifying}
          />
        </>
      ) : null}
    </div>
  );
}

function ReachPanel({ detail, className }: { detail: LeadDetail; className?: string }) {
  const { t } = useTranslation("leads");
  const { lead } = detail;
  return (
    <Panel title={t("detail.reach")} className={className}>
      <dl className="grid gap-2.5 text-sm">
        <ContactLine icon={Phone} label={t("detail.phone")}>
          {lead.phoneE164 ? (
            <a href={`tel:${lead.phoneE164}`} className="tabular-nums hover:underline">
              {formatPhone(lead.phoneE164)}
            </a>
          ) : (
            <span className="text-muted-foreground">{t("detail.noPhone")}</span>
          )}
        </ContactLine>
        <ContactLine icon={Mail} label={t("detail.email")}>
          {lead.email ? (
            <a href={`mailto:${lead.email}`} className="break-all hover:underline">
              {lead.email}
            </a>
          ) : (
            <span className="text-muted-foreground">{t("detail.noEmail")}</span>
          )}
        </ContactLine>
      </dl>
      {lead.phoneE164 || lead.whatsappUserId ? <OpenChatButton leadId={lead.id} className="mt-3 w-full" /> : null}
    </Panel>
  );
}

function Enquiry({ detail, className }: { detail: LeadDetail; className?: string }) {
  const { t } = useTranslation("leads");
  const { lead } = detail;
  const answers = Object.entries(lead.formFields);
  return (
    <section className={cn("rounded-xl border bg-card p-4 sm:p-5", className)} aria-labelledby="lead-enquiry">
      <h2 id="lead-enquiry" className="flex items-center gap-2 text-base font-semibold">
        <MessageSquareQuote aria-hidden="true" className="size-4 text-primary" />
        {t("detail.enquiry")}
      </h2>
      {lead.message ? (
        <blockquote className="mt-3 rounded-lg bg-accent/50 px-4 py-3 text-sm leading-relaxed whitespace-pre-line">
          {lead.message}
        </blockquote>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">{t("detail.noMessage")}</p>
      )}
      {answers.length ? (
        <>
          <h3 className="mt-5 mb-2 text-sm font-medium text-muted-foreground">{t("detail.formAnswers")}</h3>
          <dl className="grid grid-cols-[minmax(6.5rem,auto)_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm sm:grid-cols-[minmax(9rem,auto)_minmax(0,1fr)] sm:gap-x-6">
            {answers.map(([label, value]) => (
              <div key={label} className="contents">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="font-medium break-words">{value}</dd>
              </div>
            ))}
          </dl>
        </>
      ) : null}
    </section>
  );
}

function ConvertedBanner({ detail }: { detail: LeadDetail }) {
  const { t } = useTranslation("leads");
  const { convertedDeal, convertedContact } = detail;
  return (
    <Banner icon={CircleCheckBig} tone="success">
      <p className="font-medium">{t("detail.converted")}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {convertedDeal ? (
          <Button asChild size="sm">
            <Link to="/deals/$dealId" params={{ dealId: convertedDeal.id }}>
              <KanbanSquare className="size-4" />
              <span className="max-w-[16rem] truncate">{convertedDeal.title}</span>
              <Money value={convertedDeal.valueAed} compact className="opacity-80" />
            </Link>
          </Button>
        ) : null}
        {convertedContact ? (
          <Button asChild size="sm" variant="outline">
            <Link to="/contacts/$contactId" params={{ contactId: convertedContact.id }}>
              <UserRound className="size-4" />
              {[convertedContact.firstName, convertedContact.lastName].filter(Boolean).join(" ")}
            </Link>
          </Button>
        ) : null}
      </div>
    </Banner>
  );
}

function NextTask({ detail, now }: { detail: LeadDetail; now: Date }) {
  const { t } = useTranslation("leads");
  const next = detail.tasks
    .filter((task) => task.status === "open" && !task.deletedAt)
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt))[0];
  if (!next) return null;
  const late = latenessOf(next.dueAt, now);
  const overdue = late !== "on_time";
  return (
    <div className="mt-3 flex gap-2.5 rounded-lg bg-muted/60 px-3 py-2.5 text-sm">
      <CalendarClock
        aria-hidden="true"
        className={cn("mt-0.5 size-4 shrink-0", late === "alert" ? "text-destructive" : "text-warning")}
      />
      <div className="min-w-0">
        <p className="font-medium">{next.title}</p>
        <p
          className={cn(
            "text-xs tabular-nums",
            late === "alert" && "text-destructive",
            late === "nudge" && "text-warning",
            late === "on_time" && "text-muted-foreground",
          )}
        >
          {t(overdue ? "detail.taskOverdue" : "detail.taskDue", { when: formatDateTime(next.dueAt) })}
        </p>
      </div>
    </div>
  );
}

function Banner({
  icon: Icon,
  tone,
  children,
}: {
  icon: LucideIcon;
  tone: "info" | "success" | "muted";
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex gap-3 rounded-xl px-4 py-3 text-sm",
        tone === "info" && "bg-info-soft",
        tone === "success" && "bg-success-soft",
        tone === "muted" && "border bg-card",
      )}
    >
      <Icon
        aria-hidden="true"
        className={cn(
          "mt-0.5 size-4 shrink-0",
          tone === "info" && "text-info",
          tone === "success" && "text-success",
          tone === "muted" && "text-muted-foreground",
        )}
      />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

function Panel({ title, className, children }: { title: string; className?: string; children: ReactNode }) {
  return (
    <section className={cn("rounded-xl border bg-card p-4", className)}>
      <h2 className="mb-3 text-sm font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function ContactLine({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2.5">
      <dt>
        <Icon aria-hidden="true" className="size-4 text-muted-foreground" />
        <span className="sr-only">{label}</span>
      </dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}

function BackLink() {
  const { t } = useTranslation("leads");
  return (
    <Button asChild variant="ghost" size="sm" className="-ms-2 text-muted-foreground">
      <Link to="/leads">
        <ArrowLeft className="size-4 rtl:rotate-180" />
        {t("title")}
      </Link>
    </Button>
  );
}

function DetailSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 pt-4 pb-12 sm:px-6 lg:px-8" aria-busy="true">
      <Skeleton className="h-8 w-20" />
      <div className="mt-4 flex items-center gap-3">
        <Skeleton className="size-11 rounded-full" />
        <div className="grid gap-2">
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-4 w-40" />
        </div>
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </div>
  );
}
