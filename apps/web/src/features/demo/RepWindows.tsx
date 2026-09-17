import type { DemoStatus } from "@hco/shared/api/demo";
import type { UseQueryResult } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { AppWindow, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { EmptyState, ErrorState } from "@/components/app/States";
import { UserAvatar } from "@/components/app/UserAvatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/lib/session";
import { rememberOpenedRep } from "./demo-session";

type StatusQuery = UseQueryResult<DemoStatus, Error>;
export type DemoRep = DemoStatus["reps"][number];

/**
 * Opens the rep's view in its own window. `noopener` matters: browsers copy sessionStorage (and with it
 * the per-tab session) into windows that keep their opener, which would sign the new window in as you.
 */
export function openRepWindow(rep: Pick<DemoRep, "email">) {
  const url = `/login?demoUser=${encodeURIComponent(rep.email)}&redirect=${encodeURIComponent("/leads")}`;
  window.open(url, "_blank", "noopener,width=1280,height=860");
  rememberOpenedRep(rep.email);
}

function RepRow({ rep, isNext }: { rep: DemoRep; isNext: boolean }) {
  const { t } = useTranslation("demo");
  const counts = [
    rep.newLeads ? t("reps.newLeads", { count: rep.newLeads }) : null,
    rep.unreadConversations ? t("reps.unread", { count: rep.unreadConversations }) : null,
  ].filter(Boolean);
  return (
    <li className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
      <UserAvatar name={rep.name} />
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="truncate text-sm font-medium">{rep.name}</span>
          {isNext ? (
            <span className="rounded-full bg-accent px-2 py-px text-xs font-medium text-accent-foreground">
              {t("reps.next")}
            </span>
          ) : null}
        </p>
        <p className="truncate text-xs text-muted-foreground tabular-nums">
          {counts.length ? counts.join(", ") : t("reps.nothingWaiting")}
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => openRepWindow(rep)}
        aria-label={t("reps.openLabel", { name: rep.name })}
      >
        <AppWindow />
        <span className="hidden sm:inline">{t("reps.open")}</span>
      </Button>
    </li>
  );
}

export function RepWindows({ status }: { status: StatusQuery }) {
  const { t } = useTranslation("demo");
  const { user } = useSession();
  const firstName = user.name.replace(/^Dr\.\s+/, "").split(" ")[0] ?? user.name;

  return (
    <section aria-labelledby="demo-rep-windows" className="rounded-xl border bg-card p-4 sm:p-5">
      <h2 id="demo-rep-windows" className="text-base font-semibold">
        {t("reps.title")}
      </h2>
      <p className="mt-0.5 text-sm text-muted-foreground">{t("reps.description", { name: firstName })}</p>
      <div className="mt-4">
        {status.isPending ? (
          <div className="flex flex-col gap-3" aria-busy="true">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="size-8 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-8 w-24" />
              </div>
            ))}
          </div>
        ) : status.isError ? (
          <ErrorState error={status.error} onRetry={() => void status.refetch()} className="py-6" />
        ) : status.data.reps.length === 0 ? (
          <EmptyState
            icon={Users}
            title={t("reps.emptyTitle")}
            description={t("reps.emptyDescription")}
            className="py-6"
            action={
              <Button asChild variant="outline" size="sm">
                <Link to="/settings/users">{t("reps.emptyAction")}</Link>
              </Button>
            }
          />
        ) : (
          <ul className="divide-y">
            {status.data.reps.map((rep) => (
              <RepRow key={rep.id} rep={rep} isNext={status.data.assignment.nextAssigneeId === rep.id} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
