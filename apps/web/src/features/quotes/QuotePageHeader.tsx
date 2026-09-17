import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Skeleton } from "@/components/ui/skeleton";

/** Page header for quote screens: a way back to the deal, the title and the page actions. */
export function QuotePageHeader({
  deal,
  title,
  status,
  description,
  actions,
}: {
  deal: { id: string; title: string } | null;
  title: ReactNode;
  status?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  const { t } = useTranslation("quotes");
  return (
    <header className="flex flex-col gap-3 pb-5">
      {deal ? (
        <Link
          to="/deals/$dealId"
          params={{ dealId: deal.id }}
          aria-label={t("builder.backToDeal", { title: deal.title })}
          className="inline-flex max-w-full items-center gap-1.5 self-start rounded-sm text-sm text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <ArrowLeft className="size-4 shrink-0 rtl:rotate-180" />
          <span className="truncate">{deal.title}</span>
        </Link>
      ) : (
        <Skeleton className="h-5 w-48" />
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h1 className="text-xl font-semibold tracking-tight tabular-nums sm:text-2xl">{title}</h1>
            {status}
          </div>
          {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {actions ? <div className="hidden flex-wrap items-center gap-2 lg:flex">{actions}</div> : null}
      </div>
    </header>
  );
}

export function QuotePageSkeleton() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 lg:px-8" aria-busy="true">
      <Skeleton className="h-5 w-48" />
      <Skeleton className="mt-4 h-8 w-72" />
      <Skeleton className="mt-2 h-4 w-56" />
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Skeleton className="h-[36rem] w-full rounded-md" />
        <Skeleton className="hidden h-72 w-full rounded-xl lg:block" />
      </div>
    </div>
  );
}
