import { api, Emirate } from "@hco/shared";
import type { CompanyListItem } from "@hco/shared/api/companies";
import { formatTrn } from "@hco/core/contacts/registration";
import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { Building2, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Money } from "@/components/app/Money";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState, ErrorState, LoadingRows } from "@/components/app/States";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDebouncedValue } from "@/features/contacts/hooks";
import { SearchField } from "@/features/contacts/ui";
import { callApi } from "@/lib/api/client";
import { apiKey } from "@/lib/api/hooks";
import { CompanyFormDialog } from "./CompanyFormDialog";
import { CompanyMark } from "./CompanyMark";
import { useCompanyMeta } from "./labels";

const PAGE_SIZE = 25;
const ALL = "all";

function useCompanyPages(q: string, emirate: Emirate | undefined) {
  return useInfiniteQuery({
    queryKey: [...apiKey(api.companies.list), "pages", q, emirate],
    queryFn: ({ pageParam }) =>
      callApi(api.companies.list, {
        query: { q: q || undefined, emirate, limit: PAGE_SIZE, offset: pageParam },
      }),
    initialPageParam: 0,
    getNextPageParam: (last, pages) => {
      const loaded = pages.reduce((n, page) => n + page.items.length, 0);
      return loaded < last.total ? loaded : undefined;
    },
    placeholderData: keepPreviousData,
  });
}

export function CompaniesPage({
  search,
  emirate,
  onFiltersChange,
}: {
  search: string;
  emirate: Emirate | undefined;
  onFiltersChange: (filters: { q: string; emirate: Emirate | undefined }) => void;
}) {
  const { t } = useTranslation("contacts");
  const { t: tc } = useTranslation();
  const navigate = useNavigate();
  const [input, setInput] = useState(search);
  const q = useDebouncedValue(input.trim(), 250);
  const [creating, setCreating] = useState(false);
  const pages = useCompanyPages(q, emirate);

  useEffect(() => {
    if (q !== search) onFiltersChange({ q, emirate });
  }, [q, search, emirate, onFiltersChange]);

  const seen = new Set<string>();
  const items = (pages.data?.pages ?? [])
    .flatMap((page) => page.items)
    .filter((c) => (seen.has(c.id) ? false : (seen.add(c.id), true)));
  const total = pages.data?.pages[0]?.total ?? 0;
  const filtering = Boolean(q || emirate);

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
        {filtering ? (
          <EmptyState
            icon={Building2}
            title={t("companies.noMatchesTitle")}
            description={t("companies.noMatchesDescription")}
            action={
              <Button
                variant="outline"
                onClick={() => {
                  setInput("");
                  onFiltersChange({ q: "", emirate: undefined });
                }}
              >
                {t("companies.clearFilters")}
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={Building2}
            title={t("companies.emptyTitle")}
            description={t("companies.emptyDescription")}
            action={
              <Button onClick={() => setCreating(true)}>
                <Plus />
                {t("companies.newCompany")}
              </Button>
            }
          />
        )}
      </div>
    );
  } else {
    body = (
      <>
        <CompaniesTable items={items} />
        <CompanyCards items={items} />
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
        title={t("companies.title")}
        description={t("companies.description")}
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus />
            {t("companies.newCompany")}
          </Button>
        }
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <SearchField
            id="companies-search"
            label={t("companies.searchLabel")}
            placeholder={t("companies.searchPlaceholder")}
            value={input}
            onChange={setInput}
            className="sm:max-w-md"
          />
          <Select
            value={emirate ?? ALL}
            onValueChange={(value) =>
              onFiltersChange({ q, emirate: value === ALL ? undefined : Emirate.parse(value) })
            }
          >
            <SelectTrigger className="w-full bg-card sm:w-48" aria-label={t("companies.emirateFilter")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t("companies.allEmirates")}</SelectItem>
              {Emirate.options.map((option) => (
                <SelectItem key={option} value={option}>
                  {tc(`emirates.${option}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {pages.data ? (
            <p className="text-sm text-muted-foreground tabular-nums sm:ms-auto" aria-live="polite">
              {filtering ? t("list.matches", { count: total }) : t("companies.count", { count: total })}
            </p>
          ) : null}
        </div>
      </PageHeader>
      <div className="px-4 pb-8 sm:px-6 lg:px-8">{body}</div>
      <CompanyFormDialog
        open={creating}
        onOpenChange={setCreating}
        onSaved={(company) =>
          void navigate({ to: "/companies/$companyId", params: { companyId: company.id } })
        }
      />
    </>
  );
}

function JurisdictionCell({ company }: { company: CompanyListItem }) {
  const { t: tc } = useTranslation();
  if (!company.jurisdiction) return <span className="text-muted-foreground">–</span>;
  return (
    <span className="block min-w-0">
      <span className="block truncate">{tc(`jurisdiction.${company.jurisdiction}`)}</span>
      {company.jurisdiction === "free_zone" && company.freeZoneName ? (
        <span className="block truncate text-xs text-muted-foreground">{company.freeZoneName}</span>
      ) : null}
    </span>
  );
}

function CompaniesTable({ items }: { items: CompanyListItem[] }) {
  const { t } = useTranslation("contacts");
  const { t: tc } = useTranslation();
  const navigate = useNavigate();
  const head = "text-xs text-muted-foreground";
  return (
    <div className="hidden overflow-hidden rounded-lg border bg-card md:block">
      <Table className="table-fixed">
        <TableHeader className="bg-muted/50">
          <TableRow className="hover:bg-transparent">
            <TableHead className={`${head} w-[34%] ps-4 lg:w-[27%]`}>{t("companies.columns.name")}</TableHead>
            <TableHead className={`${head} hidden lg:table-cell lg:w-[12%]`}>
              {t("companies.columns.industry")}
            </TableHead>
            <TableHead className={`${head} w-[16%] lg:w-[11%]`}>{t("companies.columns.emirate")}</TableHead>
            <TableHead className={`${head} w-[18%] lg:w-[13%]`}>{t("companies.columns.jurisdiction")}</TableHead>
            <TableHead className={`${head} hidden xl:table-cell xl:w-[14%]`}>{t("companies.columns.trn")}</TableHead>
            <TableHead className={`${head} w-[12%] text-end lg:w-[8%]`}>{t("companies.columns.contacts")}</TableHead>
            <TableHead className={`${head} w-[20%] pe-4 text-end lg:w-[15%]`}>
              {t("companies.columns.pipeline")}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((company) => (
            <TableRow
              key={company.id}
              className="cursor-pointer"
              onClick={() => void navigate({ to: "/companies/$companyId", params: { companyId: company.id } })}
            >
              <TableCell className="py-2.5 ps-4">
                <div className="flex min-w-0 items-center gap-3">
                  <CompanyMark name={company.name} />
                  <Link
                    to="/companies/$companyId"
                    params={{ companyId: company.id }}
                    className="truncate rounded-sm font-medium hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    {company.name}
                  </Link>
                </div>
              </TableCell>
              <TableCell className="hidden truncate text-foreground/90 lg:table-cell">
                {company.industry ?? <span className="text-muted-foreground">–</span>}
              </TableCell>
              <TableCell className="truncate">
                {company.emirate ? tc(`emirates.${company.emirate}`) : <span className="text-muted-foreground">–</span>}
              </TableCell>
              <TableCell>
                <JurisdictionCell company={company} />
              </TableCell>
              <TableCell className="hidden tracking-wide tabular-nums xl:table-cell">
                {company.trn ? formatTrn(company.trn) : <span className="text-muted-foreground">–</span>}
              </TableCell>
              <TableCell className="text-end tabular-nums">{company.contactsCount}</TableCell>
              <TableCell className="pe-4 text-end">
                {company.openDealsCount > 0 ? (
                  <span className="block">
                    <Money value={company.openPipelineAed} className="font-medium" />
                    <span className="block text-xs text-muted-foreground">
                      {t("list.openDeals", { count: company.openDealsCount })}
                    </span>
                  </span>
                ) : (
                  <span className="text-muted-foreground">–</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function CompanyCards({ items }: { items: CompanyListItem[] }) {
  const { t } = useTranslation("contacts");
  const meta = useCompanyMeta();
  return (
    <ul className="divide-y overflow-hidden rounded-lg border bg-card md:hidden">
      {items.map((company) => (
        <li key={company.id}>
          <Link
            to="/companies/$companyId"
            params={{ companyId: company.id }}
            className="flex gap-3 px-4 py-3 hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none"
          >
            <CompanyMark name={company.name} className="mt-0.5" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{company.name}</p>
              <p className="truncate text-sm text-muted-foreground">{meta(company)}</p>
              <div className="mt-1 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                <span className="truncate">
                  {[company.industry, t("companies.contactsCount", { count: company.contactsCount })]
                    .filter(Boolean)
                    .join(", ")}
                </span>
                {company.openDealsCount > 0 ? (
                  <Money value={company.openPipelineAed} className="text-sm font-medium text-foreground" />
                ) : null}
              </div>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
