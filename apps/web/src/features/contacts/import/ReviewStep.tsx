import type { ImportDraft, ImportField } from "@hco/shared/api/contacts";
import { importDraftStatus, sheetRowNumber, type ImportDraftStatus } from "@hco/core/contacts/import";
import { Link } from "@tanstack/react-router";
import { Download } from "lucide-react";
import { useId, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { AssigneeSelect } from "@/components/app/AssigneeSelect";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { formatPhone } from "@/lib/format";
import { cn } from "@/lib/utils";
import { downloadRowsToFix, type ParsedSheet } from "./csv";
import { StepFooter } from "./MapStep";

/** Rows rendered at once; the counts above always cover the whole file. */
const MAX_VISIBLE_ROWS = 200;

type Filter = "all" | ImportDraftStatus;

const TONE: Record<ImportDraftStatus, { dot: string; text: string }> = {
  new: { dot: "bg-success", text: "text-success" },
  duplicate: { dot: "bg-attention", text: "text-[#6B4700]" },
  error: { dot: "bg-destructive", text: "text-destructive" },
};

export function ReviewStep({
  sheet,
  mapping,
  drafts,
  duplicates,
  onDuplicatesChange,
  assigneeId,
  onAssigneeChange,
  onBack,
  onImport,
}: {
  sheet: ParsedSheet;
  mapping: Record<string, ImportField>;
  drafts: ImportDraft[];
  duplicates: "skip" | "update";
  onDuplicatesChange: (value: "skip" | "update") => void;
  assigneeId: string | null;
  onAssigneeChange: (userId: string | null) => void;
  onBack: () => void;
  onImport: () => void;
}) {
  const { t } = useTranslation("contacts");
  const formId = useId();
  const counts = { all: drafts.length, new: 0, duplicate: 0, error: 0 };
  for (const draft of drafts) counts[importDraftStatus(draft)] += 1;
  const [filter, setFilter] = useState<Filter>("all");
  const visible = drafts.filter((d) => filter === "all" || importDraftStatus(d) === filter);
  const phoneColumn = Object.entries(mapping).find(([, field]) => field === "phone")?.[0];
  const emailColumn = Object.entries(mapping).find(([, field]) => field === "email")?.[0];
  const updating = duplicates === "update" ? counts.duplicate : 0;
  const importable = counts.new + updating;

  const filters: Array<{ value: Filter; label: string }> = [
    { value: "all", label: t("import.review.filters.all") },
    { value: "new", label: t("import.review.filters.new") },
    { value: "duplicate", label: t("import.review.filters.duplicate") },
    { value: "error", label: t("import.review.filters.error") },
  ];

  return (
    <>
      <div className="grid gap-5 p-4 sm:p-6">
        <div>
          <h2 className="text-base font-semibold">{t("import.review.title")}</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {t("import.review.description", { count: drafts.length })}
          </p>
        </div>

        <div role="group" aria-label={t("import.review.filterLabel")} className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {filters.map((option) => {
            const active = filter === option.value;
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={active}
                onClick={() => setFilter(option.value)}
                className={cn(
                  "flex flex-col items-start gap-0.5 rounded-lg border bg-card px-3 py-2.5 text-start transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
                  active ? "border-primary bg-accent/60 shadow-xs" : "hover:bg-muted/60",
                )}
              >
                <span className="text-2xl font-semibold tabular-nums">{counts[option.value]}</span>
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  {option.value !== "all" ? (
                    <span className={cn("size-2 rounded-full", TONE[option.value].dot)} aria-hidden="true" />
                  ) : null}
                  {option.label}
                </span>
              </button>
            );
          })}
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
          {counts.duplicate > 0 ? (
            <fieldset className="grid gap-2">
              <legend className="mb-2 text-sm font-medium">
                {t("import.review.duplicatesQuestion", { count: counts.duplicate })}
              </legend>
              <RadioGroup
                value={duplicates}
                onValueChange={(value) => onDuplicatesChange(value === "update" ? "update" : "skip")}
                className="grid gap-2 sm:grid-cols-2"
              >
                {(["skip", "update"] as const).map((option) => (
                  <Label
                    key={option}
                    htmlFor={`${formId}-${option}`}
                    className="flex cursor-pointer items-start gap-3 rounded-lg border bg-card p-3 font-normal has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-accent/40"
                  >
                    <RadioGroupItem id={`${formId}-${option}`} value={option} className="mt-0.5" />
                    <span className="grid gap-1">
                      <span className="text-sm font-medium">{t(`import.review.${option}.title`)}</span>
                      <span className="text-xs leading-relaxed text-muted-foreground">
                        {t(`import.review.${option}.description`)}
                      </span>
                    </span>
                  </Label>
                ))}
              </RadioGroup>
            </fieldset>
          ) : (
            <div />
          )}
          <div className="grid content-start gap-1.5">
            <Label htmlFor={`${formId}-assignee`}>{t("import.review.assignTo")}</Label>
            <AssigneeSelect
              id={`${formId}-assignee`}
              value={assigneeId}
              onChange={onAssigneeChange}
              className="w-full bg-card"
            />
            <p className="text-xs text-muted-foreground">{t("import.review.assignHint")}</p>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border">
          <div className="hidden grid-cols-[56px_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1.5fr)] gap-3 border-b bg-muted/50 px-4 py-2 text-xs text-muted-foreground lg:grid">
            <span>{t("import.review.columns.row")}</span>
            <span>{t("import.review.columns.name")}</span>
            <span>{t("import.review.columns.phone")}</span>
            <span>{t("import.review.columns.email")}</span>
            <span>{t("import.review.columns.company")}</span>
            <span>{t("import.review.columns.result")}</span>
          </div>
          {visible.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">{t("import.review.noneInFilter")}</p>
          ) : (
            <ul className="divide-y">
              {visible.slice(0, MAX_VISIBLE_ROWS).map((draft) => (
                <DraftRow
                  key={draft.rowIndex}
                  draft={draft}
                  rawPhone={phoneColumn ? sheet.rows[draft.rowIndex]?.[phoneColumn] : undefined}
                  rawEmail={emailColumn ? sheet.rows[draft.rowIndex]?.[emailColumn] : undefined}
                  duplicates={duplicates}
                />
              ))}
            </ul>
          )}
          {visible.length > MAX_VISIBLE_ROWS ? (
            <p className="border-t bg-muted/30 px-4 py-2 text-xs text-muted-foreground tabular-nums">
              {t("import.review.truncated", { shown: MAX_VISIBLE_ROWS, total: visible.length })}
            </p>
          ) : null}
        </div>

        {counts.error > 0 ? (
          <div className="flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <p>{t("import.review.errorsSkipped", { count: counts.error })}</p>
            <Button variant="outline" size="sm" onClick={() => downloadRowsToFix(sheet, drafts)}>
              <Download />
              {t("import.downloadRowsToFix")}
            </Button>
          </div>
        ) : null}
      </div>
      <StepFooter>
        <Button variant="outline" onClick={onBack}>
          {t("import.review.back")}
        </Button>
        <Button onClick={onImport} disabled={importable === 0}>
          {importable === 0
            ? t("import.review.nothingToImport")
            : updating > 0 && counts.new > 0
              ? t("import.review.importAndUpdate", { count: counts.new, updated: updating })
              : updating > 0
                ? t("import.review.updateOnly", { count: updating })
                : t("import.review.import", { count: counts.new })}
        </Button>
      </StepFooter>
    </>
  );
}

function DraftRow({
  draft,
  rawPhone,
  rawEmail,
  duplicates,
}: {
  draft: ImportDraft;
  rawPhone: string | undefined;
  rawEmail: string | undefined;
  duplicates: "skip" | "update";
}) {
  const { t } = useTranslation("contacts");
  const status = importDraftStatus(draft);
  const name = [draft.firstName, draft.lastName].filter(Boolean).join(" ");
  const phone = draft.phoneE164 ? formatPhone(draft.phoneE164) : rawPhone;
  const email = draft.email ?? rawEmail;
  const phoneBroken = !draft.phoneE164 && Boolean(rawPhone);
  const emailBroken = !draft.email && Boolean(rawEmail);

  let result;
  if (status === "error") {
    result = <span className="text-destructive">{draft.errors.join(" ")}</span>;
  } else if (status === "duplicate" && draft.duplicateOfContactId) {
    result = (
      <span className="grid gap-0.5">
        <span className="text-[#6B4700]">
          <Trans
            t={t}
            i18nKey="import.review.matches"
            values={{ name: draft.duplicateOfContactName }}
            components={{
              contact: (
                <Link
                  to="/contacts/$contactId"
                  params={{ contactId: draft.duplicateOfContactId }}
                  target="_blank"
                  className="font-medium underline underline-offset-4"
                />
              ),
            }}
          />
        </span>
        <span className="text-xs text-muted-foreground">
          {duplicates === "update" ? t("import.review.willUpdate") : t("import.review.willSkip")}
        </span>
      </span>
    );
  } else {
    result = <span className="text-success">{t("import.review.willCreate")}</span>;
  }

  return (
    <li
      className={cn(
        "grid gap-1 px-4 py-3 text-sm lg:grid-cols-[56px_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1.5fr)] lg:items-start lg:gap-3",
        status === "error" && "bg-danger-soft/40",
        status === "duplicate" && "bg-warning-soft/40",
      )}
    >
      <span className="flex items-center gap-2 text-xs text-muted-foreground tabular-nums lg:pt-0.5">
        <span className={cn("size-2 rounded-full lg:hidden", TONE[status].dot)} aria-hidden="true" />
        <span className="lg:hidden">{t("import.review.rowNumber", { row: sheetRowNumber(draft.rowIndex) })}</span>
        <span className="hidden lg:inline">{sheetRowNumber(draft.rowIndex)}</span>
      </span>
      <span className="truncate font-medium">{name || <span className="text-destructive">–</span>}</span>
      <span className={cn("truncate tabular-nums", phoneBroken && "text-destructive line-through decoration-1")}>
        {phone ?? <span className="text-muted-foreground">–</span>}
      </span>
      <span className={cn("truncate", emailBroken && "text-destructive line-through decoration-1")}>
        {email ?? <span className="text-muted-foreground">–</span>}
      </span>
      <span className="truncate text-muted-foreground lg:text-foreground">{draft.companyName ?? "–"}</span>
      <span className="min-w-0">{result}</span>
    </li>
  );
}
