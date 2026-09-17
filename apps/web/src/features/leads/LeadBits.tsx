import { leadUrgency, roundDuration } from "@hco/core/leads/speed";
import type { LeadStatus } from "@hco/shared";
import { AlarmClock, Timer } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const STATUS_TONE: Record<LeadStatus, string> = {
  new: "bg-warning-soft text-[#6B4700]",
  contacted: "bg-info-soft text-info",
  qualified: "bg-accent text-accent-foreground",
  converted: "bg-success-soft text-success",
  disqualified: "bg-muted text-muted-foreground",
};

const STATUS_DOT: Record<LeadStatus, string> = {
  new: "bg-attention",
  contacted: "bg-info",
  qualified: "bg-primary",
  converted: "bg-success",
  disqualified: "bg-muted-foreground/60",
};

export function LeadStatusPill({ status, className }: { status: LeadStatus; className?: string }) {
  const { t } = useTranslation();
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        STATUS_TONE[status],
        className,
      )}
    >
      <span aria-hidden="true" className={cn("size-1.5 rounded-full", STATUS_DOT[status])} />
      {t(`leadStatus.${status}`)}
    </span>
  );
}

/** Speed-to-lead: "Reply within 8 min" in saffron, "Overdue by 2 h" in red. Renders nothing when calm. */
export function SpeedChip({
  lead,
  now,
  className,
}: {
  lead: { status: LeadStatus; nextTaskDueAt: string | null };
  now: Date;
  className?: string;
}) {
  const { t } = useTranslation("leads");
  const urgency = leadUrgency(lead, now);
  if (!urgency) return null;
  const { unit, value } = roundDuration(urgency.ms);
  const time = t(`duration.${unit}`, { count: value });
  const overdue = urgency.kind !== "reply_within";
  const Icon = overdue ? AlarmClock : Timer;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap tabular-nums",
        overdue ? "bg-danger-soft text-destructive" : "bg-attention/20 text-[#6B4700]",
        className,
      )}
    >
      <Icon aria-hidden="true" className={cn("size-3.5", overdue ? "text-destructive" : "text-warning")} />
      {t(`speed.${urgency.kind}`, { time })}
    </span>
  );
}

/** "Just now", "12 min ago", "3 h ago", "2 days ago", then a date. */
export function useReceivedLabel() {
  const { t } = useTranslation("leads");
  return (iso: string, now: Date) => {
    const ms = now.getTime() - new Date(iso).getTime();
    if (ms < 60_000) return t("received.justNow");
    if (ms >= 7 * 86_400_000) return formatDate(iso);
    const { unit, value } = roundDuration(ms);
    return t("received.ago", { time: t(`duration.${unit}`, { count: value }) });
  };
}
