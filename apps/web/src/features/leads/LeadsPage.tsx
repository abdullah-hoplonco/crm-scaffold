import { LEAD_VIEWS, type LeadView } from "@hco/core/leads/views";
import { api, LeadSource } from "@hco/shared";
import type { LeadListItem } from "@hco/shared/api/leads";
import { keepPreviousData } from "@tanstack/react-query";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { Inbox, Plus, Search, SearchX, UserRound } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/app/PageHeader";
import { SourceBadge } from "@/components/app/SourceBadge";
import { EmptyState, ErrorState, LoadingRows } from "@/components/app/States";
import { UserAvatar } from "@/components/app/UserAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDebouncedValue, useNow } from "@/features/inbox/hooks";
import { useApiQuery } from "@/lib/api/hooks";
import { formatDateTime } from "@/lib/format";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import { AddLeadDialog } from "./AddLeadDialog";
import { LeadStatusPill, SpeedChip, useReceivedLabel } from "./LeadBits";

const PAGE = 50;
const ALL = "all";

export function LeadsPage() {
  const { t } = useTranslation("leads");
  const { user } = useSession();
  const search = useSearch({ from: "/_app/leads/" });
  const navigate = useNavigate({ from: "/leads/" });
  const [q, setQ] = useState("");
  const [limit, setLimit] = useState(PAGE);
  const [adding, setAdding] = useState(false);
  const debouncedQ = useDebouncedValue(q.trim(), 250);
  const now = useNow(15_000);
  const users = useApiQuery(api.workspace.listUsers, {});

  const view: LeadView = search.view ?? "new";
  const assignee = search.assignee ?? (user.role === "rep" ? "mine" : ALL);
  const assigneeId = assignee === ALL ? undefined : assignee === "mine" ? user.id : assignee;

  const list = useApiQuery(
    api.leads.list,
    {
      query: {
        status: view === "all" ? undefined : view,
        source: search.source,
        assigneeId,
        q: debouncedQ || undefined,
        limit,
      },
    },
    { placeholderData: keepPreviousData },
  );

  const setFilters = (next: Partial<typeof search>) => {
    setLimit(PAGE);
    void navigate({ search: (prev) => ({ ...prev, ...next }), replace: true });
  };
  const filtered = Boolean(search.source || debouncedQ || assignee !== (user.role === "rep" ? "mine" : ALL));
  const clearFilters = () => {
    setQ("");
    setFilters({ source: undefined, assignee: undefined });
  };

  return (
    <div className="mx-auto w-full max-w-7xl pb-10">
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <Button onClick={() => setAdding(true)}>
            <Plus className="size-4" />
            {t("add.action")}
          </Button>
        }
      >
        <div
          role="group"
          aria-label={t("views.label")}
          className="-mx-4 flex gap-1 overflow-x-auto border-b px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
        >
          {LEAD_VIEWS.map((v) => {
            const active = v === view;
            const count = list.data?.counts?.[v];
            return (
              <button
                key={v}
                type="button"
                aria-pressed={active}
                onClick={() => setFilters({ view: v === "new" ? undefined : v })}
                className={cn(
                  "relative -mb-px inline-flex h-10 shrink-0 items-center gap-2 border-b-2 px-3 text-sm transition-colors",
                  "focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
                  active
                    ? "border-primary font-medium text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {t(`views.${v}`)}
                {count !== undefined ? (
                  <span
                    className={cn(
                      "min-w-5 rounded-full px-1.5 text-center text-xs tabular-nums",
                      v === "new" && count > 0
                        ? "bg-attention font-semibold text-[#2B1D00]"
                        : active
                          ? "bg-accent text-accent-foreground"
                          : "bg-muted text-muted-foreground",
                    )}
                  >
                    {count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative sm:w-72">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              type="search"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setLimit(PAGE);
              }}
              placeholder={t("filters.search")}
              aria-label={t("filters.searchLabel")}
              className="bg-card ps-9"
            />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <Select
              value={search.source ?? ALL}
              onValueChange={(v) => setFilters({ source: v === ALL ? undefined : (v as LeadSource) })}
            >
              <SelectTrigger className="w-full bg-card sm:w-40" aria-label={t("filters.source")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t("filters.allSources")}</SelectItem>
                <SelectSeparator />
                {LeadSource.options.map((s) => (
                  <SelectItem key={s} value={s}>
                    {t(`common:sources.${s}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={assignee} onValueChange={(v) => setFilters({ assignee: v })}>
              <SelectTrigger className="w-full bg-card sm:w-48" aria-label={t("filters.assignee")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>
                  {user.role === "rep" ? t("filters.mineAndUnassigned") : t("filters.everyone")}
                </SelectItem>
                <SelectItem value="mine">{t("filters.mine")}</SelectItem>
                <SelectItem value="unassigned">{t("filters.unassigned")}</SelectItem>
                {user.role !== "rep" ? (
                  <>
                    <SelectSeparator />
                    {(users.data?.items ?? [])
                      .filter((u) => u.isActive && u.id !== user.id)
                      .map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name}
                        </SelectItem>
                      ))}
                  </>
                ) : null}
              </SelectContent>
            </Select>
          </div>
        </div>
      </PageHeader>

      <div className="px-4 sm:px-6 lg:px-8">
        {list.isPending ? (
          <LoadingRows rows={8} className="p-0" />
        ) : list.isError ? (
          <ErrorState error={list.error} onRetry={() => void list.refetch()} />
        ) : list.data.items.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-card">
            {filtered ? (
              <EmptyState
                icon={SearchX}
                title={t("empty.filtered.title")}
                description={t("empty.filtered.description")}
                action={
                  <Button variant="outline" size="sm" onClick={clearFilters}>
                    {t("empty.filtered.clear")}
                  </Button>
                }
              />
            ) : (
              <EmptyState
                icon={view === "new" ? Inbox : UserRound}
                title={t(`empty.${view}.title`)}
                description={t(`empty.${view}.description`)}
                action={
                  view === "new" || view === "open" ? (
                    <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
                      <Plus className="size-4" />
                      {t("add.action")}
                    </Button>
                  ) : undefined
                }
              />
            )}
          </div>
        ) : (
          <>
            <div className="overflow-hidden rounded-xl border bg-card">
              <div
                aria-hidden="true"
                className="hidden grid-cols-[minmax(0,1fr)_11.5rem_7rem_10rem_7rem] gap-4 border-b bg-muted/40 px-4 py-2 text-xs text-muted-foreground lg:grid"
              >
                <span>{t("columns.lead")}</span>
                <span>{t("columns.reply")}</span>
                <span>{t("columns.received")}</span>
                <span>{t("columns.assignee")}</span>
                <span>{t("columns.status")}</span>
              </div>
              <ul className="divide-y">
                {list.data.items.map((lead) => (
                  <li key={lead.id}>
                    <LeadRow lead={lead} now={now} />
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-4 flex flex-col items-center gap-2 text-sm text-muted-foreground">
              <span className="tabular-nums">
                {t("pagination.showing", { shown: list.data.items.length, total: list.data.total })}
              </span>
              {list.data.items.length < list.data.total ? (
                <Button variant="outline" onClick={() => setLimit((l) => l + PAGE)} disabled={list.isFetching}>
                  {t("pagination.more")}
                </Button>
              ) : null}
            </div>
          </>
        )}
      </div>

      <AddLeadDialog open={adding} onOpenChange={setAdding} />
    </div>
  );
}

function LeadRow({ lead, now }: { lead: LeadListItem; now: Date }) {
  const { t } = useTranslation("leads");
  const received = useReceivedLabel();
  const isNew = lead.status === "new";
  const snippet = lead.message ?? Object.values(lead.formFields).join(", ");
  const assigneeFirst = lead.assigneeName?.replace(/^Dr\.\s+/, "").split(" ")[0] ?? null;

  const existing = lead.matchedContactName ? (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-info-soft px-2 py-0.5 text-xs font-medium whitespace-nowrap text-info"
      title={t("row.existingOf", { name: lead.matchedContactName })}
    >
      <UserRound aria-hidden="true" className="size-3" />
      {t("row.existing")}
    </span>
  ) : null;

  return (
    <Link
      to="/leads/$leadId"
      params={{ leadId: lead.id }}
      className={cn(
        "relative block px-4 py-3 transition-colors hover:bg-muted/60",
        "focus-visible:bg-muted/60 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none focus-visible:ring-inset",
        isNew && "bg-attention/[0.06] before:absolute before:inset-y-0 before:start-0 before:w-[3px] before:bg-attention",
      )}
    >
      {/* Desktop: one aligned row */}
      <div className="hidden grid-cols-[minmax(0,1fr)_11.5rem_7rem_10rem_7rem] items-center gap-4 lg:grid">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <span className={cn("truncate text-sm", isNew ? "font-semibold" : "font-medium")}>{lead.name}</span>
            <SourceBadge source={lead.source} className="shrink-0" />
            {existing}
          </div>
          <p className="mt-0.5 truncate text-[13px] text-muted-foreground">
            {lead.campaignName ? <span className="text-foreground/70">{lead.campaignName}: </span> : null}
            {snippet || t("row.noMessage")}
          </p>
        </div>
        <div>
          <SpeedChip lead={lead} now={now} />
        </div>
        <time
          dateTime={lead.receivedAt}
          title={formatDateTime(lead.receivedAt)}
          className="text-sm text-muted-foreground tabular-nums"
        >
          {received(lead.receivedAt, now)}
        </time>
        <span className="flex min-w-0 items-center gap-2 text-sm">
          <UserAvatar name={lead.assigneeName} size="sm" />
          <span className={cn("truncate", !lead.assigneeName && "text-muted-foreground")}>
            {lead.assigneeName ?? t("common:states.unassigned")}
          </span>
        </span>
        <span>
          <LeadStatusPill status={lead.status} />
        </span>
      </div>

      {/* Phone: a compact card */}
      <div className="flex flex-col gap-1.5 lg:hidden">
        <div className="flex items-baseline justify-between gap-3">
          <span className={cn("truncate text-[15px]", isNew ? "font-semibold" : "font-medium")}>{lead.name}</span>
          <time dateTime={lead.receivedAt} className="shrink-0 text-xs text-muted-foreground tabular-nums">
            {received(lead.receivedAt, now)}
          </time>
        </div>
        <p className="line-clamp-2 text-sm text-muted-foreground">{snippet || t("row.noMessage")}</p>
        {lead.campaignName ? <p className="truncate text-xs text-foreground/60">{lead.campaignName}</p> : null}
        <div className="flex flex-wrap items-center gap-1.5">
          <SourceBadge source={lead.source} />
          <LeadStatusPill status={lead.status} />
          <SpeedChip lead={lead} now={now} />
          {existing}
          <span className="ms-auto flex items-center gap-1.5 text-xs text-muted-foreground">
            <UserAvatar name={lead.assigneeName} size="sm" />
            {assigneeFirst ?? t("common:states.unassigned")}
          </span>
        </div>
      </div>
    </Link>
  );
}
