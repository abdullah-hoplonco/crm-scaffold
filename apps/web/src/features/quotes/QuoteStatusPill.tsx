import type { QuoteStatus } from "@hco/shared";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

const TONE: Record<QuoteStatus, { pill: string; dot: string }> = {
  draft: { pill: "bg-warning-soft text-warning", dot: "bg-attention" },
  sent: { pill: "bg-info-soft text-info", dot: "bg-info" },
  accepted: { pill: "bg-success-soft text-success", dot: "bg-success" },
  rejected: { pill: "bg-danger-soft text-destructive", dot: "bg-destructive" },
};

export function QuoteStatusPill({ status, className }: { status: QuoteStatus; className?: string }) {
  const { t } = useTranslation("quotes");
  const tone = TONE[status];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium",
        tone.pill,
        className,
      )}
    >
      <span aria-hidden="true" className={cn("size-1.5 rounded-full", tone.dot)} />
      {t(`status.${status}`)}
    </span>
  );
}
