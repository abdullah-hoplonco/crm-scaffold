import { formatAmount } from "@hco/core/quotes/index";
import { Plus, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { EditableLine, LineErrors } from "./lines";

export function LineItemsEditor({
  lines,
  lineTotals,
  errors,
  showErrors,
  onChange,
  onRemove,
  onAddBlank,
}: {
  lines: EditableLine[];
  lineTotals: Map<string, string>;
  errors: Record<string, LineErrors>;
  showErrors: boolean;
  onChange: (key: string, patch: Partial<EditableLine>) => void;
  onRemove: (key: string) => void;
  onAddBlank: () => void;
}) {
  const { t } = useTranslation("quotes");
  return (
    <div className="@container flex flex-col gap-3">
      <ol className="flex flex-col gap-2.5">
        {lines.map((line, index) => {
          const lineErrors = showErrors ? errors[line.key] : undefined;
          const total = lineTotals.get(line.key);
          const id = (field: string) => `line-${line.key}-${field}`;
          return (
            <li key={line.key} className="rounded-lg border bg-card p-3 @md:p-4">
              <div className="flex items-start gap-2">
                <span
                  aria-hidden="true"
                  className="mt-2 w-5 shrink-0 text-xs text-muted-foreground tabular-nums"
                >
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <Label htmlFor={id("description")} className="sr-only">
                    {t("builder.descriptionLabel", { index: index + 1 })}
                  </Label>
                  {/* Grows with long treatment names instead of cutting them off on a phone. */}
                  <Textarea
                    id={id("description")}
                    value={line.description}
                    rows={1}
                    placeholder={t("builder.descriptionPlaceholder")}
                    className="min-h-9 resize-none"
                    aria-invalid={lineErrors?.description ? true : undefined}
                    aria-describedby={lineErrors?.description ? id("description-error") : undefined}
                    onChange={(e) => onChange(line.key, { description: e.target.value.replace(/\n/g, " ") })}
                  />
                  {lineErrors?.description ? (
                    <p id={id("description-error")} className="mt-1 text-xs text-destructive">
                      {t("builder.errorDescription")}
                    </p>
                  ) : null}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive"
                  aria-label={t("builder.remove", { index: index + 1 })}
                  disabled={lines.length === 1}
                  onClick={() => onRemove(line.key)}
                >
                  <Trash2 />
                </Button>
              </div>

              <div className="mt-3 grid grid-cols-[5rem_minmax(0,1fr)] items-start gap-x-3 gap-y-2 ps-7 @md:grid-cols-[5.5rem_10rem_minmax(0,1fr)] @md:pe-11">
                <div>
                  <Label htmlFor={id("qty")} className="mb-1 text-xs font-normal text-muted-foreground">
                    {t("builder.qty")}
                  </Label>
                  <Input
                    id={id("qty")}
                    value={line.qty}
                    inputMode="decimal"
                    className="text-end tabular-nums"
                    aria-invalid={lineErrors?.qty ? true : undefined}
                    onChange={(e) => onChange(line.key, { qty: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor={id("price")} className="mb-1 text-xs font-normal text-muted-foreground">
                    {t("builder.unitPrice")}
                  </Label>
                  <Input
                    id={id("price")}
                    value={line.unitPrice}
                    inputMode="decimal"
                    placeholder="0.00"
                    className="text-end tabular-nums"
                    aria-invalid={lineErrors?.unitPrice ? true : undefined}
                    onChange={(e) => onChange(line.key, { unitPrice: e.target.value })}
                  />
                </div>
                <div className="col-span-2 flex items-baseline justify-between gap-2 @md:col-span-1 @md:block @md:text-end">
                  <p className="text-xs text-muted-foreground @md:mb-1 @md:leading-[1.125rem]">
                    {t("builder.amount")}
                  </p>
                  <p
                    className={cn(
                      "font-medium tabular-nums @md:flex @md:h-9 @md:items-center @md:justify-end",
                      !total && "text-muted-foreground",
                    )}
                  >
                    {total ? `AED ${formatAmount(total)}` : "—"}
                  </p>
                </div>
                {lineErrors?.qty || lineErrors?.unitPrice ? (
                  <p className="col-span-2 text-xs text-destructive @md:col-span-3">
                    {[
                      lineErrors.qty && t("builder.errorQty"),
                      lineErrors.unitPrice && t("builder.errorPrice"),
                    ]
                      .filter(Boolean)
                      .join(". ")}
                  </p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
      <div>
        <Button type="button" variant="ghost" size="sm" className="text-primary" onClick={onAddBlank}>
          <Plus />
          {t("builder.addLine")}
        </Button>
      </div>
    </div>
  );
}
