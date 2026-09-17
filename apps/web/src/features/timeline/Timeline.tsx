import { api } from "@hco/shared";
import { EmptyState, ErrorState, LoadingRows } from "@/components/app/States";
import { useApiQuery } from "@/lib/api/hooks";
import { formatDateTime } from "@/lib/format";

export interface TimelineSubject {
  leadId?: string;
  contactId?: string;
  dealId?: string;
}

/**
 * Starter timeline. Owned by the pipeline workstream, which replaces it with the full component
 * (grouped by day, icons per activity type, note/call composer when `allowCompose`).
 */
export function Timeline({ subject }: { subject: TimelineSubject; allowCompose?: boolean }) {
  const query = useApiQuery(api.timeline.list, { query: subject });
  if (query.isPending) return <LoadingRows rows={4} />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  if (!query.data.items.length) return <EmptyState title="Nothing here yet" />;
  return (
    <ol className="flex flex-col gap-3">
      {query.data.items.map((item) => (
        <li key={item.id} className="rounded-md border bg-card p-3 text-sm">
          <p className="text-xs text-muted-foreground">
            {item.type} · {formatDateTime(item.occurredAt)}
          </p>
          <p className="whitespace-pre-line">{item.body}</p>
        </li>
      ))}
    </ol>
  );
}
