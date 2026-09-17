import { formatAmount } from "@hco/core/quotes/index";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

/** Subtotal, VAT and total as the builder shows them below the form. */
export function TotalsSummary({
  rate,
  subtotalAed,
  vatAmountAed,
  totalAed,
  className,
}: {
  rate: string;
  subtotalAed: string;
  vatAmountAed: string;
  totalAed: string;
  className?: string;
}) {
  const { t } = useTranslation("quotes");
  return (
    <dl aria-live="polite" data-tour="quote-totals" className={cn("rounded-lg border bg-card p-4 text-sm", className)}>
      <div className="flex justify-between gap-4 py-1">
        <dt className="text-muted-foreground">{t("builder.subtotal")}</dt>
        <dd className="tabular-nums">AED {formatAmount(subtotalAed)}</dd>
      </div>
      <div className="flex justify-between gap-4 py-1">
        <dt className="text-muted-foreground">{t("builder.vat", { rate })}</dt>
        <dd className="tabular-nums">AED {formatAmount(vatAmountAed)}</dd>
      </div>
      <div className="mt-2 flex items-baseline justify-between gap-4 border-t pt-3">
        <dt className="font-medium">{t("builder.total")}</dt>
        <dd className="text-lg font-semibold tabular-nums">AED {formatAmount(totalAed)}</dd>
      </div>
    </dl>
  );
}
