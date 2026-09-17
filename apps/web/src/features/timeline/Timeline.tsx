import { api } from "@hco/shared";
import type { TimelineItem } from "@hco/shared/api/timeline";
import { History } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { EmptyState, ErrorState, LoadingRows } from "@/components/app/States";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useApiQuery } from "@/lib/api/hooks";
import { dayHeading, dayKey } from "./timeline-format";
import { TimelineComposer } from "./TimelineComposer";
import { TimelineEntry, type StageInfo } from "./TimelineEntry";

export interface TimelineSubject {
  leadId?: string;
  contactId?: string;
  dealId?: string;
}

type Filter = "all" | "conversations" | "notes" | "changes";

const FILTERS: Record<Exclude<Filter, "all">, ReadonlySet<TimelineItem["type"]>> = {
  conversations: new Set(["message_in", "message_out", "email_in", "email_out"]),
  notes: new Set(["note", "call", "meeting", "task_done"]),
  changes: new Set(["stage_change", "quote_sent", "system"]),
};

/**
 * Everything that happened with a lead, contact or deal, newest first and grouped by day in Dubai
 * time. A deal's timeline includes its contact's and originating lead's entries (see the API).
 */
export function Timeline({
  subject,
  allowCompose = false,
}: {
  subject: TimelineSubject;
  allowCompose?: boolean;
}) {
  const { t } = useTranslation("pipeline");
  const [filter, setFilter] = useState<Filter>("all");
  const query = useApiQuery(api.timeline.list, { query: subject });
  const pipeline = useApiQuery(api.pipeline.getDefault, {}, { staleTime: 5 * 60_000 });

  const stages = useMemo(
    () =>
      new Map<string, StageInfo>(
        (pipeline.data?.stages ?? []).map((s) => [s.id, { name: s.name, type: s.type }]),
      ),
    [pipeline.data],
  );

  const groups = useMemo(() => {
    const items = (query.data?.items ?? []).filter(
      (item) => filter === "all" || FILTERS[filter].has(item.type),
    );
    const byDay: Array<{ key: string; items: TimelineItem[] }> = [];
    for (const item of items) {
      const key = dayKey(item.occurredAt);
      const last = byDay[byDay.length - 1];
      if (last?.key === key) last.items.push(item);
      else byDay.push({ key, items: [item] });
    }
    return byDay;
  }, [query.data, filter]);

  return (
    <div className="flex flex-col gap-4">
      {allowCompose ? <TimelineComposer subject={subject} /> : null}

      <ToggleGroup
        type="single"
        size="sm"
        value={filter}
        onValueChange={(value) => {
          if (value) setFilter(value as Filter);
        }}
        aria-label={t("timeline.filterLabel")}
        className="flex-wrap justify-start gap-1"
      >
        {(["all", "conversations", "notes", "changes"] as const).map((f) => (
          <ToggleGroupItem
            key={f}
            value={f}
            className="h-7 rounded-full border border-transparent px-3 text-xs text-muted-foreground data-[state=on]:border-border data-[state=on]:bg-card data-[state=on]:text-foreground"
          >
            {t(`timeline.filters.${f}`)}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      {query.isPending ? (
        <LoadingRows rows={4} className="p-0" />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : groups.length === 0 ? (
        <EmptyState
          icon={History}
          title={filter === "all" ? t("timeline.emptyTitle") : t("timeline.emptyFilteredTitle")}
          description={filter === "all" ? t("timeline.emptyDescription") : undefined}
          className="py-8"
        />
      ) : (
        <div className="flex flex-col gap-2">
          {groups.map((group) => (
            <section
              key={group.key}
              aria-label={dayHeading(group.items[0]?.occurredAt ?? group.key, labels(t))}
            >
              <h3 className="mb-3 text-xs font-medium text-muted-foreground">
                {dayHeading(group.items[0]?.occurredAt ?? group.key, labels(t))}
              </h3>
              <ol>
                {group.items.map((item, index) => (
                  <TimelineEntry
                    key={item.id}
                    item={item}
                    stages={stages}
                    isLast={index === group.items.length - 1}
                    showLeadTag={Boolean(
                      (subject.dealId || subject.contactId) && item.leadId && !item.dealId && !item.contactId,
                    )}
                  />
                ))}
              </ol>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function labels(t: (key: string) => string) {
  return { today: t("timeline.today"), yesterday: t("timeline.yesterday") };
}
