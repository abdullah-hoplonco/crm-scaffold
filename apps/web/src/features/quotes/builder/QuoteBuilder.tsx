import { formatAmount, formatDecimal } from "@hco/core/quotes/index";
import type { Company, Contact, Deal, QuoteStatus, Workspace } from "@hco/shared";
import type { LineItemInput } from "@hco/shared/api/quotes";
import { Eye, Info, Sparkles } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { QuoteDocumentModel } from "../model";
import { QuoteDocument } from "../QuoteDocument";
import { LineItemsEditor } from "./LineItemsEditor";
import { blankLine, evaluateLines, isBlank, lineFromItem, type EditableLine } from "./lines";
import { PriceListPicker } from "./PriceListPicker";
import { suggestedGroup } from "./priceList";
import { TotalsSummary } from "./TotalsSummary";
import { ValidityField } from "./ValidityField";

export interface QuoteBuilderContext {
  deal: Deal;
  contact: Contact;
  company: Company | null;
  workspace: Workspace;
  number: string | null;
  status: QuoteStatus;
  issueDate: string;
  vatRate: string;
  preparedByName: string | null;
}

export interface QuoteBuilderValues {
  lineItems: LineItemInput[];
  validUntil: string;
  notes: string | null;
}

/** Line items, validity and notes with live 5% VAT totals and a live preview of the quotation. */
export function QuoteBuilder({
  context,
  initial,
  submitLabel,
  submitting,
  onSubmit,
  onCancel,
}: {
  context: QuoteBuilderContext;
  initial: { lines: EditableLine[]; validUntil: string; notes: string };
  submitLabel: string;
  submitting: boolean;
  onSubmit: (values: QuoteBuilderValues) => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation("quotes");
  const [lines, setLines] = useState<EditableLine[]>(() =>
    initial.lines.length ? initial.lines : [blankLine()],
  );
  const [validUntil, setValidUntil] = useState(initial.validUntil);
  const [notes, setNotes] = useState(initial.notes);
  const [showErrors, setShowErrors] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const evaluation = evaluateLines(lines, context.vatRate);
  const suggestion = suggestedGroup(context.deal.title);
  const showSuggestion = suggestion !== null && lines.every(isBlank);
  const rate = formatDecimal(context.vatRate);

  const addItems = (items: Array<{ description: string; qty: string; unitPriceAed: string }>) => {
    setLines((current) => [...current.filter((line) => !isBlank(line)), ...items.map(lineFromItem)]);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!evaluation.isValid) {
      setShowErrors(true);
      return;
    }
    onSubmit({ lineItems: evaluation.items, validUntil, notes: notes.trim() || null });
  };

  const preview: QuoteDocumentModel = {
    number: context.number,
    status: context.status,
    issueDate: context.issueDate,
    validUntil,
    preparedByName: context.preparedByName,
    subject: context.deal.title,
    workspace: context.workspace,
    contact: context.contact,
    company: context.company,
    lines: evaluation.priced.map(({ key, item, totalAed }) => ({
      key,
      description: item.description,
      qty: item.qty,
      unitPriceAed: item.unitPriceAed,
      totalAed,
    })),
    subtotalAed: evaluation.subtotalAed,
    vatRate: context.vatRate,
    vatAmountAed: evaluation.vatAmountAed,
    totalAed: evaluation.totalAed,
    notes: notes.trim() || null,
  };

  return (
    <form
      onSubmit={submit}
      noValidate
      className="grid items-start gap-8 pb-28 sm:pb-0 xl:grid-cols-[minmax(0,1fr)_32rem] min-[87.5rem]:grid-cols-[minmax(0,1fr)_36rem]"
    >
      <div className="flex min-w-0 flex-col gap-8">
        {context.workspace.trn ? null : (
          <p className="flex gap-2 rounded-lg bg-warning-soft px-3 py-2.5 text-sm text-[#6B4700]">
            <Info className="mt-0.5 size-4 shrink-0" />
            {t("builder.noTrnWarning")}
          </p>
        )}

        <section aria-labelledby="quote-items" data-tour="quote-lines" className="flex flex-col gap-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 id="quote-items" className="text-base font-semibold">
                {t("builder.items")}
              </h2>
              <p className="text-xs text-muted-foreground">{t("builder.itemsHint", { rate })}</p>
            </div>
            <PriceListPicker suggested={suggestion} onAdd={addItems} />
          </div>

          {showSuggestion ? (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-dashed border-primary/40 bg-accent/60 px-3 py-2.5">
              <p className="flex items-center gap-2 text-sm text-accent-foreground">
                <Sparkles className="size-4 shrink-0" />
                {t("builder.suggestion", { name: suggestion.name })}
              </p>
              <Button type="button" size="sm" variant="secondary" onClick={() => addItems(suggestion.items)}>
                {t("builder.suggestionAdd", { count: suggestion.items.length })}
              </Button>
            </div>
          ) : null}

          <LineItemsEditor
            lines={lines}
            lineTotals={evaluation.lineTotals}
            errors={evaluation.errors}
            showErrors={showErrors}
            onChange={(key, patch) =>
              setLines((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)))
            }
            onRemove={(key) => setLines((current) => current.filter((line) => line.key !== key))}
            onAddBlank={() => setLines((current) => [...current, blankLine()])}
          />
        </section>

        <ValidityField value={validUntil} onChange={setValidUntil} />

        <div className="flex flex-col gap-2">
          <Label htmlFor="quote-notes">{t("builder.notes")}</Label>
          <Textarea
            id="quote-notes"
            value={notes}
            rows={3}
            placeholder={t("builder.notesPlaceholder")}
            aria-describedby="quote-notes-hint"
            onChange={(e) => setNotes(e.target.value)}
          />
          <p id="quote-notes-hint" className="text-xs text-muted-foreground">
            {t("builder.notesHint")}
          </p>
        </div>

        <TotalsSummary
          className="xl:hidden"
          rate={rate}
          subtotalAed={evaluation.subtotalAed}
          vatAmountAed={evaluation.vatAmountAed}
          totalAed={evaluation.totalAed}
        />

        {showErrors && !evaluation.isValid ? (
          <p role="alert" className="text-sm text-destructive">
            {t("builder.fixErrors")}
          </p>
        ) : null}

        {/* Desktop and tablet actions */}
        <div className="hidden items-center justify-end gap-2 border-t pt-5 sm:flex">
          <Button type="button" variant="ghost" onClick={onCancel}>
            {t("builder.cancel")}
          </Button>
          <Button type="button" variant="outline" className="xl:hidden" onClick={() => setPreviewOpen(true)}>
            <Eye />
            {t("builder.preview")}
          </Button>
          <Button type="submit" data-tour="quote-save" disabled={submitting}>
            {submitting ? t("builder.saving") : submitLabel}
          </Button>
        </div>
      </div>

      {/* Live preview beside the form on wide screens */}
      <aside
        aria-label={t("builder.previewTitle")}
        data-tour="quote-preview"
        className="sticky top-6 hidden min-w-0 xl:block"
      >
        <QuoteDocument model={preview} />
      </aside>

      {/* Phone actions, above the tab bar */}
      <div
        className={cn(
          "fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 flex items-center gap-2 border-t bg-card/95 px-4 py-2.5 backdrop-blur sm:hidden",
        )}
      >
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground">{t("builder.total")}</p>
          <p className="truncate font-semibold tabular-nums">AED {formatAmount(preview.totalAed)}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={t("builder.preview")}
          onClick={() => setPreviewOpen(true)}
        >
          <Eye />
        </Button>
        <Button type="submit" data-tour="quote-save" disabled={submitting}>
          {submitting ? t("builder.saving") : submitLabel}
        </Button>
      </div>

      <Sheet open={previewOpen} onOpenChange={setPreviewOpen}>
        <SheetContent side="bottom" className="max-h-[92dvh] overflow-y-auto rounded-t-xl bg-background">
          <SheetHeader>
            <SheetTitle>{t("builder.previewTitle")}</SheetTitle>
          </SheetHeader>
          <div className="px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
            <QuoteDocument model={preview} />
          </div>
        </SheetContent>
      </Sheet>
    </form>
  );
}
