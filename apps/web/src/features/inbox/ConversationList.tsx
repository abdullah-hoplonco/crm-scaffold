import { api } from "@hco/shared";
import type { ConversationListItem } from "@hco/shared/api/inbox";
import { keepPreviousData } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Inbox, MailCheck, Search, SearchX, Timer, UserRoundCheck, Users, type LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { EmptyState, ErrorState, LoadingRows } from "@/components/app/States";
import { UserAvatar } from "@/components/app/UserAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useApiQuery } from "@/lib/api/hooks";
import { formatListTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ChannelGlyph } from "./ChannelGlyph";
import { useDebouncedValue } from "./hooks";

export type InboxFilter = "all" | "mine" | "unassigned" | "unread";
const FILTERS: InboxFilter[] = ["all", "mine", "unassigned", "unread"];

const EMPTY_ICON: Record<InboxFilter, LucideIcon> = {
  all: Inbox,
  mine: UserRoundCheck,
  unassigned: Users,
  unread: MailCheck,
};

export function ConversationList({
  selectedId,
  filter,
  onFilterChange,
  search,
  onSearchChange,
}: {
  selectedId: string | null;
  filter: InboxFilter;
  onFilterChange: (filter: InboxFilter) => void;
  search: string;
  onSearchChange: (q: string) => void;
}) {
  const { t } = useTranslation("inbox");
  const q = useDebouncedValue(search.trim(), 250);
  const list = useApiQuery(
    api.inbox.list,
    { query: { filter, q: q || undefined } },
    { placeholderData: keepPreviousData },
  );
  const counts = list.data?.counts;

  return (
    <>
      <div className="flex flex-col gap-3 border-b px-4 pt-4 pb-3">
        <h1 className="text-xl font-semibold tracking-tight">{t("title")}</h1>
        <div className="relative">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t("searchPlaceholder")}
            aria-label={t("searchLabel")}
            className="ps-9"
          />
        </div>
        <div role="group" aria-label={t("filters.label")} className="-mx-1 flex gap-1 overflow-x-auto px-1 py-0.5">
          {FILTERS.map((f) => {
            const active = f === filter;
            const count = counts?.[f];
            return (
              <button
                key={f}
                type="button"
                aria-pressed={active}
                onClick={() => onFilterChange(f)}
                className={cn(
                  "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-sm transition-colors",
                  "focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "bg-card text-foreground/80 hover:bg-accent hover:text-accent-foreground",
                )}
              >
                {t(`filters.${f}`)}
                {count !== undefined ? (
                  <span
                    className={cn(
                      "text-xs tabular-nums",
                      active ? "text-primary-foreground/80" : "text-muted-foreground",
                      f === "unread" && count > 0 && !active && "font-semibold text-primary",
                    )}
                  >
                    {count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto" aria-busy={list.isFetching}>
        {list.isPending ? (
          <LoadingRows rows={7} />
        ) : list.isError ? (
          <ErrorState error={list.error} onRetry={() => void list.refetch()} />
        ) : list.data.items.length === 0 ? (
          q ? (
            <EmptyState
              icon={SearchX}
              title={t("empty.search.title", { q })}
              description={t("empty.search.description")}
              action={
                <Button variant="outline" size="sm" onClick={() => onSearchChange("")}>
                  {t("empty.search.clear")}
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={EMPTY_ICON[filter]}
              title={t(`empty.${filter}.title`)}
              description={t(`empty.${filter}.description`)}
              action={
                filter !== "all" ? (
                  <Button variant="outline" size="sm" onClick={() => onFilterChange("all")}>
                    {t("empty.showAll")}
                  </Button>
                ) : undefined
              }
            />
          )
        ) : (
          <ul className="flex flex-col py-1">
            {list.data.items.map((conversation) => (
              <li key={conversation.id}>
                <ConversationRow conversation={conversation} selected={conversation.id === selectedId} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

function ConversationRow({
  conversation: c,
  selected,
}: {
  conversation: ConversationListItem;
  selected: boolean;
}) {
  const { t } = useTranslation("inbox");
  const unread = c.unreadCount > 0;
  const lastWasOutbound = Boolean(c.lastOutboundAt && c.lastOutboundAt === c.lastMessageAt);
  return (
    <Link
      to="/inbox/$conversationId"
      params={{ conversationId: c.id }}
      aria-current={selected ? "page" : undefined}
      className={cn(
        "relative mx-2 flex items-center gap-3 rounded-lg px-2.5 py-2.5 transition-colors",
        "hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
        selected && "bg-accent hover:bg-accent",
      )}
    >
      <span className="relative shrink-0">
        <UserAvatar name={c.displayName} size="lg" />
        <ChannelGlyph channel={c.channel} className="absolute -end-0.5 -bottom-0.5" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex items-baseline gap-2">
          <span className={cn("min-w-0 flex-1 truncate text-sm", unread ? "font-semibold" : "font-medium")}>
            {c.displayName}
          </span>
          {c.lastMessageAt ? (
            <time
              dateTime={c.lastMessageAt}
              className={cn(
                "shrink-0 text-xs tabular-nums",
                unread ? "font-medium text-primary" : "text-muted-foreground",
              )}
            >
              {formatListTime(c.lastMessageAt)}
            </time>
          ) : null}
        </span>
        <span className="flex items-center gap-2">
          <span
            className={cn(
              "min-w-0 flex-1 truncate text-sm",
              unread ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {lastWasOutbound ? <span className="text-muted-foreground">{t("list.you")}</span> : null}
            {c.lastMessagePreview ?? t("list.noMessages")}
          </span>
          {c.channel === "whatsapp" && c.serviceWindowOpen ? (
            <Timer
              role="img"
              aria-label={t("list.windowOpen")}
              className="size-3.5 shrink-0 text-channel-whatsapp"
            />
          ) : null}
          {unread ? (
            <span className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground tabular-nums">
              <span aria-hidden="true">{c.unreadCount}</span>
              <span className="sr-only">{t("list.unread", { count: c.unreadCount })}</span>
            </span>
          ) : null}
        </span>
      </span>
    </Link>
  );
}
