import { Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { History } from "lucide-react";
import { useTranslation } from "react-i18next";
import { EmptyState } from "@/components/app/States";
import { SourceBadge } from "@/components/app/SourceBadge";
import { Button } from "@/components/ui/button";
import { inWorkspaceTz } from "@/lib/format";
import { cn } from "@/lib/utils";
import { clearDemoLog, isFreshEntry, useDemoSession, type DemoLogEntry } from "./demo-session";

function EntryLink({ entry }: { entry: DemoLogEntry }) {
  const { t } = useTranslation("demo");
  const linkClass = "shrink-0 text-xs font-medium text-primary underline-offset-4 hover:underline";
  if (entry.leadId && entry.outcome !== "message") {
    return (
      <Link to="/leads/$leadId" params={{ leadId: entry.leadId }} className={linkClass}>
        {t("log.openLead")}
      </Link>
    );
  }
  if (entry.conversationId) {
    return (
      <Link
        to="/inbox/$conversationId"
        params={{ conversationId: entry.conversationId }}
        className={linkClass}
      >
        {t("log.openConversation")}
      </Link>
    );
  }
  return null;
}

function Entry({ entry }: { entry: DemoLogEntry }) {
  const { t } = useTranslation("demo");
  const { t: tc } = useTranslation();
  // Only entries logged a moment ago slide in; older ones (e.g. after navigating back) render still.
  const isArriving = isFreshEntry(entry.id);
  return (
    <li
      className={cn(
        "grid grid-cols-[3.5rem_minmax(0,1fr)] gap-x-3 py-2.5 first:pt-0 last:pb-0",
        isArriving && "animate-in duration-500 fade-in-0 slide-in-from-top-1",
      )}
    >
      <time dateTime={entry.at} className="pt-1 text-xs text-muted-foreground tabular-nums">
        {format(inWorkspaceTz(entry.at), "HH:mm:ss")}
      </time>
      <div className="min-w-0">
        <div className="flex items-center justify-between gap-3">
          <p className="flex min-w-0 items-center gap-2">
            <SourceBadge source={entry.source} compact />
            <span className="truncate text-sm font-medium">
              {t(`log.kind.${entry.outcome}`, { source: tc(`sources.${entry.source}`) })}
            </span>
          </p>
          <EntryLink entry={entry} />
        </div>
        <p className="mt-0.5 truncate text-sm">
          {entry.name}{" "}
          <span className="text-muted-foreground">
            {entry.assigneeName ? t("log.assignedTo", { name: entry.assigneeName }) : t("log.unassigned")}
          </span>
        </p>
        {entry.text ? (
          <p className="mt-0.5 truncate text-xs text-muted-foreground" title={entry.text}>
            “{entry.text}”
          </p>
        ) : null}
      </div>
    </li>
  );
}

export function EventLog() {
  const { t } = useTranslation("demo");
  const { entries } = useDemoSession();
  return (
    <section aria-labelledby="demo-log" className="rounded-xl border bg-card p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="demo-log" className="text-base font-semibold">
            {t("log.title")}
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">{t("log.description")}</p>
        </div>
        {entries.length ? (
          <Button variant="ghost" size="sm" onClick={clearDemoLog} className="-me-2">
            {t("log.clear")}
          </Button>
        ) : null}
      </div>
      {entries.length === 0 ? (
        <EmptyState
          icon={History}
          title={t("log.emptyTitle")}
          description={t("log.emptyDescription")}
          className="py-8"
        />
      ) : (
        <ol aria-live="polite" className="mt-4 divide-y">
          {entries.map((entry) => (
            <Entry key={entry.id} entry={entry} />
          ))}
        </ol>
      )}
    </section>
  );
}
