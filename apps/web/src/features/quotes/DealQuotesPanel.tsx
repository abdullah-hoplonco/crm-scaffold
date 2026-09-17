import { api } from "@hco/shared";
import { Link } from "@tanstack/react-router";
import { FileText, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { EmptyState, ErrorState, LoadingRows } from "@/components/app/States";
import { Button } from "@/components/ui/button";
import { useApiQuery } from "@/lib/api/hooks";
import { retryUnlessClientError } from "./queryOptions";
import { QuoteRows } from "./QuoteRows";

/** Quotes on a deal with their status, total and when they were sent, plus "New quote". Rendered on the deal page. */
export function DealQuotesPanel({ dealId }: { dealId: string }) {
  const { t } = useTranslation("quotes");
  const query = useApiQuery(
    api.quotes.listForDeal,
    { params: { dealId } },
    { retry: retryUnlessClientError },
  );
  const items = query.data?.items ?? [];
  const headingId = `deal-quotes-${dealId}`;

  const newQuote = (variant: "default" | "outline") => (
    <Button asChild size="sm" variant={variant}>
      <Link to="/quotes/new" search={{ dealId }}>
        <Plus />
        {t("panel.new")}
      </Link>
    </Button>
  );

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <div className="flex min-h-8 items-center justify-between gap-2">
        <h2 id={headingId} className="flex items-baseline gap-2 text-base font-semibold">
          {t("panel.title")}
          {items.length ? (
            <span className="text-sm font-normal text-muted-foreground tabular-nums">{items.length}</span>
          ) : null}
        </h2>
        {items.length ? newQuote("outline") : null}
      </div>

      {query.isPending ? (
        <LoadingRows rows={2} className="p-0" />
      ) : query.isError ? (
        <ErrorState
          error={query.error}
          onRetry={() => void query.refetch()}
          className="rounded-lg border py-8"
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={t("panel.emptyTitle")}
          description={t("panel.emptyBody")}
          action={newQuote("default")}
          className="rounded-lg border border-dashed bg-card py-8"
        />
      ) : (
        <QuoteRows items={items} />
      )}
    </section>
  );
}
