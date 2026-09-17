import type { DealCard } from "@hco/shared/api/pipeline";
import { CalendarDays, Hourglass, ListChecks, MessageCircle } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Money } from "@/components/app/Money";
import { SourceBadge } from "@/components/app/SourceBadge";
import { UserAvatar } from "@/components/app/UserAvatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { daysSince, formatShortDate, todayInWorkspace } from "./dates";

/**
 * What a deal looks like on the board and in lists. Pure presentation: the board wraps it for
 * dragging, the mobile list wraps it with a "Move to…" menu.
 */
export function DealCardView({
  card,
  actions,
  className,
  lifted = false,
}: {
  card: DealCard;
  /** Extra controls in the footer, e.g. the "Move to…" menu. */
  actions?: ReactNode;
  className?: string;
  /** Rendered in the drag overlay. */
  lifted?: boolean;
}) {
  const { t } = useTranslation("pipeline");
  const closeDateOverdue =
    card.stageType === "open" &&
    card.expectedCloseDate !== null &&
    card.expectedCloseDate < todayInWorkspace();
  // Deal titles often already name the contact ("Invisalign — Rania Khoury"); don't say it twice.
  const contactInTitle = card.title.toLowerCase().includes(card.contactName.toLowerCase());
  const whoLine = card.companyName
    ? contactInTitle
      ? card.companyName
      : t("card.contactAtCompany", { contact: card.contactName, company: card.companyName })
    : contactInTitle
      ? null
      : card.contactName;

  return (
    <div
      className={cn(
        "relative flex flex-col gap-2 rounded-lg border bg-card p-3 text-start transition-[border-color,box-shadow]",
        lifted && "rotate-[1.5deg] border-primary/40 shadow-[0_12px_28px_-10px_rgba(15,43,49,0.35)]",
        className,
      )}
    >
      {card.isStale ? (
        <p className="inline-flex w-fit items-center gap-1 rounded-full bg-warning-soft px-2 py-0.5 text-xs font-medium text-warning">
          <Hourglass className="size-3" aria-hidden="true" />
          {t("card.stale", { count: daysSince(card.lastActivityAt) })}
        </p>
      ) : null}

      <div className="min-w-0">
        <p className="line-clamp-2 text-sm leading-snug font-medium text-foreground">{card.title}</p>
        {whoLine ? <p className="mt-0.5 truncate text-xs text-muted-foreground">{whoLine}</p> : null}
      </div>

      <div className="flex items-baseline justify-between gap-2">
        <Money
          value={card.valueAed}
          className={cn(
            "text-sm font-semibold",
            card.stageType === "lost" && "text-muted-foreground line-through decoration-1",
          )}
        />
        {card.stageType === "won" && card.closedAt ? (
          <span className="text-xs font-medium text-success">
            {t("card.wonOn", { date: formatShortDate(card.closedAt) })}
          </span>
        ) : null}
        {card.stageType === "lost" && card.closedAt ? (
          <span className="truncate text-xs text-muted-foreground">
            {card.lostReason
              ? t(`common:lostReasons.${card.lostReason}`)
              : t("card.lostOn", { date: formatShortDate(card.closedAt) })}
          </span>
        ) : null}
      </div>

      <div className="flex min-h-6 items-center gap-2.5 border-t border-dashed pt-2 text-xs text-muted-foreground">
        <SourceBadge source={card.source} compact className="px-1.5" />
        {card.stageType === "open" && card.expectedCloseDate ? (
          <Meta
            label={t(closeDateOverdue ? "card.closeDateOverdue" : "card.closeDate", {
              date: formatShortDate(card.expectedCloseDate),
            })}
          >
            <span
              className={cn(
                "inline-flex items-center gap-1 tabular-nums",
                closeDateOverdue && "text-destructive",
              )}
            >
              <CalendarDays className="size-3.5" aria-hidden="true" />
              {formatShortDate(card.expectedCloseDate)}
            </span>
          </Meta>
        ) : null}
        {card.openTasksCount > 0 ? (
          <Meta label={t("card.openTasks", { count: card.openTasksCount })}>
            <span className="inline-flex items-center gap-1 tabular-nums">
              <ListChecks className="size-3.5" aria-hidden="true" />
              {card.openTasksCount}
            </span>
          </Meta>
        ) : null}
        {card.hasUnreadMessages ? (
          <Meta label={t("card.unread")}>
            <span className="relative inline-flex text-channel-whatsapp">
              <MessageCircle className="size-3.5" aria-hidden="true" />
              <span className="absolute -end-0.5 -top-0.5 size-2 rounded-full border border-card bg-channel-whatsapp" />
            </span>
          </Meta>
        ) : null}
        <span className="ms-auto flex items-center gap-1">
          {actions}
          <Meta
            label={
              card.assigneeName
                ? t("card.assignedTo", { name: card.assigneeName })
                : t("common:states.unassigned")
            }
          >
            <span className="inline-flex">
              <UserAvatar name={card.assigneeName} size="sm" />
            </span>
          </Meta>
        </span>
      </div>
    </div>
  );
}

/** A small icon + number with a tooltip for sighted users and a label for screen readers. */
function Meta({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="relative z-10 inline-flex">
          {children}
          <span className="sr-only">{label}</span>
        </span>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
