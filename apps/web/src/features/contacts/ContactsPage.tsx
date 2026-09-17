import { api } from "@hco/shared";
import type { ContactListItem } from "@hco/shared/api/contacts";
import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { Plus, Upload, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState, ErrorState, LoadingRows } from "@/components/app/States";
import { UserAvatar } from "@/components/app/UserAvatar";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { callApi } from "@/lib/api/client";
import { apiKey } from "@/lib/api/hooks";
import { formatListTime, formatPhone, formatRelative } from "@/lib/format";
import { ContactFormDialog } from "./ContactFormDialog";
import { useDebouncedValue } from "./hooks";
import { fullName } from "./names";
import { SearchField, WhatsappMark } from "./ui";

const PAGE_SIZE = 25;

function useContactPages(q: string) {
  return useInfiniteQuery({
    queryKey: [...apiKey(api.contacts.list), "pages", q],
    queryFn: ({ pageParam }) =>
      callApi(api.contacts.list, { query: { q: q || undefined, limit: PAGE_SIZE, offset: pageParam } }),
    initialPageParam: 0,
    getNextPageParam: (last, pages) => {
      const loaded = pages.reduce((n, page) => n + page.items.length, 0);
      return loaded < last.total ? loaded : undefined;
    },
    placeholderData: keepPreviousData,
  });
}

export function ContactsPage({
  search,
  onSearchChange,
}: {
  search: string;
  onSearchChange: (q: string) => void;
}) {
  const { t } = useTranslation("contacts");
  const navigate = useNavigate();
  const [input, setInput] = useState(search);
  const q = useDebouncedValue(input.trim(), 250);
  const [creating, setCreating] = useState(false);
  const pages = useContactPages(q);

  useEffect(() => {
    if (q !== search) onSearchChange(q);
  }, [q, search, onSearchChange]);

  // Pages can overlap when a contact changes while more are loading; show each contact once.
  const seen = new Set<string>();
  const items = (pages.data?.pages ?? [])
    .flatMap((page) => page.items)
    .filter((c) => (seen.has(c.id) ? false : (seen.add(c.id), true)));
  const total = pages.data?.pages[0]?.total ?? 0;

  let body;
  if (pages.isPending) {
    body = (
      <div className="rounded-lg border bg-card">
        <LoadingRows rows={8} />
      </div>
    );
  } else if (pages.isError) {
    body = (
      <div className="rounded-lg border bg-card">
        <ErrorState error={pages.error} onRetry={() => void pages.refetch()} />
      </div>
    );
  } else if (items.length === 0) {
    body = (
      <div className="rounded-lg border bg-card">
        {q ? (
          <EmptyState
            icon={Users}
            title={t("list.noMatchesTitle", { q })}
            description={t("list.noMatchesDescription")}
            action={
              <Button variant="outline" onClick={() => setInput("")}>
                {t("list.clearSearch")}
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={Users}
            title={t("list.emptyTitle")}
            description={t("list.emptyDescription")}
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Button onClick={() => setCreating(true)}>
                  <Plus />
                  {t("list.newContact")}
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/contacts/import">
                    <Upload />
                    {t("list.importSpreadsheet")}
                  </Link>
                </Button>
              </div>
            }
          />
        )}
      </div>
    );
  } else {
    body = (
      <>
        <ContactsTable items={items} />
        <ContactCards items={items} />
        {pages.hasNextPage ? (
          <div className="mt-4 flex flex-col items-center gap-2">
            <p className="text-xs text-muted-foreground tabular-nums">
              {t("list.showing", { shown: items.length, total })}
            </p>
            <Button
              variant="outline"
              onClick={() => void pages.fetchNextPage()}
              disabled={pages.isFetchingNextPage}
            >
              {pages.isFetchingNextPage
                ? t("list.loadingMore")
                : t("list.showMore", { count: Math.min(PAGE_SIZE, total - items.length) })}
            </Button>
          </div>
        ) : null}
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={t("list.title")}
        description={t("list.description")}
        actions={
          <>
            <Button variant="outline" asChild>
              <Link to="/contacts/import">
                <Upload />
                {t("list.import")}
              </Link>
            </Button>
            <Button onClick={() => setCreating(true)}>
              <Plus />
              {t("list.newContact")}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <SearchField
            id="contacts-search"
            label={t("list.searchLabel")}
            placeholder={t("list.searchPlaceholder")}
            value={input}
            onChange={setInput}
            className="sm:max-w-md"
          />
          {pages.data ? (
            <p className="text-sm text-muted-foreground tabular-nums" aria-live="polite">
              {q ? t("list.matches", { count: total }) : t("list.count", { count: total })}
            </p>
          ) : null}
        </div>
      </PageHeader>
      <div className="px-4 pb-8 sm:px-6 lg:px-8">{body}</div>
      <ContactFormDialog
        open={creating}
        onOpenChange={setCreating}
        onSaved={(contact) => void navigate({ to: "/contacts/$contactId", params: { contactId: contact.id } })}
      />
    </>
  );
}

function ContactsTable({ items }: { items: ContactListItem[] }) {
  const { t } = useTranslation("contacts");
  const { t: tc } = useTranslation();
  const navigate = useNavigate();
  return (
    <div className="hidden overflow-hidden rounded-lg border bg-card md:block">
      <Table className="table-fixed">
        <TableHeader className="bg-muted/50">
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[32%] ps-4 text-xs text-muted-foreground lg:w-[26%] xl:w-[23%]">
              {t("list.columns.name")}
            </TableHead>
            <TableHead className="w-[22%] text-xs text-muted-foreground lg:w-[18%] xl:w-[16%]">
              {t("list.columns.company")}
            </TableHead>
            <TableHead className="w-[22%] text-xs text-muted-foreground lg:w-[16%] xl:w-[14%]">
              {t("list.columns.phone")}
            </TableHead>
            <TableHead className="hidden text-xs text-muted-foreground xl:table-cell xl:w-[17%]">
              {t("list.columns.email")}
            </TableHead>
            <TableHead className="hidden text-xs text-muted-foreground lg:table-cell lg:w-[16%] xl:w-[14%]">
              {t("list.columns.assignee")}
            </TableHead>
            <TableHead className="w-[12%] text-end text-xs text-muted-foreground lg:w-[10%] xl:w-[7%]">
              {t("list.columns.openDeals")}
            </TableHead>
            <TableHead className="w-[12%] pe-4 text-end text-xs text-muted-foreground lg:w-[14%] xl:w-[9%]">
              {t("list.columns.lastActivity")}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((contact) => {
            const name = fullName(contact);
            const phone = contact.phones[0];
            return (
              <TableRow
                key={contact.id}
                className="cursor-pointer"
                onClick={() =>
                  void navigate({ to: "/contacts/$contactId", params: { contactId: contact.id } })
                }
              >
                <TableCell className="py-2.5 ps-4">
                  <div className="flex min-h-9 min-w-0 items-center gap-3">
                    <UserAvatar name={name} />
                    <div className="min-w-0">
                      <Link
                        to="/contacts/$contactId"
                        params={{ contactId: contact.id }}
                        className="block truncate rounded-sm font-medium hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                      >
                        {name}
                      </Link>
                      {contact.jobTitle ? (
                        <p className="truncate text-xs text-muted-foreground">{contact.jobTitle}</p>
                      ) : null}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="truncate">
                  {contact.companyId && contact.companyName ? (
                    <Link
                      to="/companies/$companyId"
                      params={{ companyId: contact.companyId }}
                      onClick={(e) => e.stopPropagation()}
                      className="truncate rounded-sm text-foreground/90 hover:text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    >
                      {contact.companyName}
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">–</span>
                  )}
                </TableCell>
                <TableCell>
                  {phone ? (
                    <span className="flex items-center gap-1.5 tabular-nums">
                      <span className="truncate">{formatPhone(phone.e164)}</span>
                      {phone.isWhatsapp ? <WhatsappMark /> : null}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">–</span>
                  )}
                </TableCell>
                <TableCell className="hidden truncate text-foreground/90 xl:table-cell">
                  {contact.emails[0] ?? <span className="text-muted-foreground">–</span>}
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  {contact.assigneeName ? (
                    <span className="flex min-w-0 items-center gap-2">
                      <UserAvatar name={contact.assigneeName} size="sm" />
                      <span className="truncate">{contact.assigneeName}</span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground">{tc("states.unassigned")}</span>
                  )}
                </TableCell>
                <TableCell className="text-end tabular-nums">
                  {contact.openDealsCount > 0 ? (
                    <span className="inline-flex min-w-6 justify-center rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-accent-foreground">
                      {contact.openDealsCount}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">–</span>
                  )}
                </TableCell>
                <TableCell className="pe-4 text-end text-muted-foreground">
                  {contact.lastActivityAt ? (
                    <time dateTime={contact.lastActivityAt} className="truncate">
                      {formatRelative(contact.lastActivityAt)}
                    </time>
                  ) : (
                    "–"
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function ContactCards({ items }: { items: ContactListItem[] }) {
  const { t } = useTranslation("contacts");
  return (
    <ul className="divide-y overflow-hidden rounded-lg border bg-card md:hidden">
      {items.map((contact) => {
        const name = fullName(contact);
        const phone = contact.phones[0];
        const role =
          contact.jobTitle && contact.companyName
            ? t("shared.jobAtCompany", { job: contact.jobTitle, company: contact.companyName })
            : (contact.jobTitle ?? contact.companyName);
        return (
          <li key={contact.id}>
            <Link
              to="/contacts/$contactId"
              params={{ contactId: contact.id }}
              className="flex gap-3 px-4 py-3 hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none"
            >
              <UserAvatar name={name} className="mt-0.5" />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="truncate font-medium">{name}</p>
                  {contact.lastActivityAt ? (
                    <time
                      dateTime={contact.lastActivityAt}
                      className="shrink-0 text-xs text-muted-foreground tabular-nums"
                    >
                      {formatListTime(contact.lastActivityAt)}
                    </time>
                  ) : null}
                </div>
                {role ? <p className="truncate text-sm text-muted-foreground">{role}</p> : null}
                <div className="mt-1 flex items-center justify-between gap-3 text-sm">
                  {phone ? (
                    <span className="flex min-w-0 items-center gap-1.5 tabular-nums">
                      <span className="truncate">{formatPhone(phone.e164)}</span>
                      {phone.isWhatsapp ? <WhatsappMark /> : null}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">{t("detail.noPhone")}</span>
                  )}
                  {contact.openDealsCount > 0 ? (
                    <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">
                      {t("list.openDeals", { count: contact.openDealsCount })}
                    </span>
                  ) : null}
                </div>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
