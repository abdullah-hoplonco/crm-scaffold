import { sumMoney } from "@hco/core";
import { api, type Stage } from "@hco/shared";
import type { DealCard } from "@hco/shared/api/pipeline";
import { Link } from "@tanstack/react-router";
import { Handshake, Plus } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Money } from "@/components/app/Money";
import { EmptyState, ErrorState, LoadingRows } from "@/components/app/States";
import { UserAvatar } from "@/components/app/UserAvatar";
import { Button } from "@/components/ui/button";
import { useApiQuery } from "@/lib/api/hooks";
import { formatAed } from "@/lib/format";
import { cn } from "@/lib/utils";
import { formatShortDate } from "./dates";
import { NewDealDialog } from "./NewDealDialog";

/** Deals of a contact or a company, open ones first, with a way to start a new one. */
export function ContactDealsPanel({ contactId, companyId }: { contactId?: string; companyId?: string }) {
  const { t } = useTranslation("pipeline");
  const [newDealOpen, setNewDealOpen] = useState(false);
  const deals = useApiQuery(api.pipeline.list, { query: { contactId, companyId, status: "all" } });
  const stages = useApiQuery(api.pipeline.getDefault, {}, { staleTime: 5 * 60_000 }).data?.stages ?? [];

  const newDeal = (
    <Button variant="outline" size="sm" onClick={() => setNewDealOpen(true)}>
      <Plus />
      {t("newDeal")}
    </Button>
  );

  let body;
  if (deals.isPending) body = <LoadingRows rows={2} className="p-0" />;
  else if (deals.isError)
    body = <ErrorState error={deals.error} onRetry={() => void deals.refetch()} className="py-6" />;
  else if (deals.data.items.length === 0) {
    body = (
      <EmptyState
        icon={Handshake}
        title={t("contactDeals.emptyTitle")}
        description={t(companyId && !contactId ? "contactDeals.emptyCompany" : "contactDeals.emptyContact")}
        action={newDeal}
        className="rounded-lg border border-dashed py-8"
      />
    );
  } else {
    const open = deals.data.items.filter((d) => d.stageType === "open");
    body = (
      <>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            {open.length > 0
              ? t("contactDeals.summary", {
                  count: open.length,
                  value: formatAed(sumMoney(open.map((d) => d.valueAed))),
                })
              : t("contactDeals.noneOpen")}
          </p>
          {newDeal}
        </div>
        <ul className="flex flex-col divide-y rounded-lg border bg-card">
          {deals.data.items.map((deal) => (
            <DealRow
              key={deal.id}
              deal={deal}
              stages={stages}
              showContact={Boolean(companyId && !contactId)}
            />
          ))}
        </ul>
      </>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {body}
      <NewDealDialog open={newDealOpen} onOpenChange={setNewDealOpen} defaults={{ contactId, companyId }} />
    </div>
  );
}

function DealRow({ deal, stages, showContact }: { deal: DealCard; stages: Stage[]; showContact: boolean }) {
  const { t } = useTranslation("pipeline");
  const open = stages.filter((s) => s.type === "open");
  const index = open.findIndex((s) => s.id === deal.stageId);

  return (
    <li className="relative flex flex-col gap-2 px-3 py-3 hover:bg-muted/40 sm:flex-row sm:items-center sm:gap-4">
      <div className="min-w-0 flex-1">
        <Link
          to="/deals/$dealId"
          params={{ dealId: deal.id }}
          className="block truncate text-sm font-medium outline-none after:absolute after:inset-0 focus-visible:underline"
        >
          {deal.title}
        </Link>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
          <span
            className={cn(
              "rounded-full px-1.5 leading-5 font-medium",
              deal.stageType === "open" && "bg-accent text-accent-foreground",
              deal.stageType === "won" && "bg-success-soft text-success",
              deal.stageType === "lost" && "bg-danger-soft text-destructive",
            )}
          >
            {deal.stageName}
          </span>
          {showContact ? <span className="truncate">{deal.contactName}</span> : null}
          {deal.stageType !== "open" && deal.closedAt ? (
            <span>
              {t(deal.stageType === "won" ? "card.wonOn" : "card.lostOn", {
                date: formatShortDate(deal.closedAt),
              })}
            </span>
          ) : deal.expectedCloseDate ? (
            <span>{t("card.closeDate", { date: formatShortDate(deal.expectedCloseDate) })}</span>
          ) : null}
        </p>
      </div>
      <div className="flex items-center gap-3">
        {deal.stageType === "open" && open.length > 0 ? (
          <span className="flex w-20 gap-0.5" aria-hidden="true">
            {open.map((s, i) => (
              <span
                key={s.id}
                className={cn("h-1 flex-1 rounded-full", i <= index ? "bg-primary" : "bg-border")}
              />
            ))}
          </span>
        ) : null}
        <Money
          value={deal.valueAed}
          className={cn(
            "ms-auto text-sm font-semibold sm:ms-0",
            deal.stageType === "lost" && "text-muted-foreground line-through",
          )}
        />
        <UserAvatar name={deal.assigneeName} size="sm" />
      </div>
    </li>
  );
}
