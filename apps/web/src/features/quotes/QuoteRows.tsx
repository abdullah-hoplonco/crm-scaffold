import type { Quote } from "@hco/shared";
import { Link } from "@tanstack/react-router";
import { ChevronRight, FileText } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Money } from "@/components/app/Money";
import { formatDate, formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import { todayInWorkspace } from "./model";
import { QuoteStatusPill } from "./QuoteStatusPill";

/** Quotes as linked rows: number, status, when it was sent and the total incl. VAT. */
export function QuoteRows({ items, className }: { items: Quote[]; className?: string }) {
  const { t } = useTranslation("quotes");
  const today = todayInWorkspace();
  return (
    <ul className={cn("@container divide-y overflow-hidden rounded-lg border bg-card", className)}>
      {items.map((quote) => {
        const when = quote.sentAt
          ? t(quote.sentVia === "email" ? "panel.sentEmail" : "panel.sentWhatsapp", {
              when: formatRelative(quote.sentAt),
            })
          : t("panel.drafted", { when: formatRelative(quote.createdAt) });
        const validity =
          quote.status === "draft" || quote.status === "sent"
            ? t(quote.validUntil < today ? "panel.expired" : "panel.validUntil", {
                date: formatDate(quote.validUntil),
              })
            : null;
        return (
          <li key={quote.id}>
            <Link
              to="/quotes/$quoteId"
              params={{ quoteId: quote.id }}
              aria-label={t("panel.open", { number: quote.number })}
              className="flex items-center gap-3 px-3 py-3 transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset @sm:px-4"
            >
              <span
                aria-hidden="true"
                className="hidden size-9 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground @sm:flex"
              >
                <FileText className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-sm font-medium tabular-nums">{quote.number}</span>
                  <QuoteStatusPill status={quote.status} />
                </span>
                <span className="mt-0.5 block text-xs text-pretty text-muted-foreground">
                  {[when, validity].filter(Boolean).join(" · ")}
                </span>
              </span>
              <Money value={quote.totalAed} className="text-sm font-medium" />
              <ChevronRight
                aria-hidden="true"
                className="size-4 shrink-0 text-muted-foreground rtl:rotate-180"
              />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
