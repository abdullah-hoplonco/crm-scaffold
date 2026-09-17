import { ImportField } from "@hco/shared/api/contacts";
import { mappingHasName } from "@hco/core/contacts/import";
import { AlertCircle, ArrowRight, FileSpreadsheet, Info } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { ParsedSheet } from "./csv";

export function MapStep({
  sheet,
  mapping,
  onMappingChange,
  onBack,
  onContinue,
  pending,
  error,
}: {
  sheet: ParsedSheet;
  mapping: Record<string, ImportField>;
  onMappingChange: (mapping: Record<string, ImportField>) => void;
  onBack: () => void;
  onContinue: () => void;
  pending: boolean;
  error: string | null;
}) {
  const { t } = useTranslation("contacts");
  const hasName = mappingHasName(mapping);
  const hasPhone = Object.values(mapping).includes("phone");

  // A field can come from one column only: choosing it elsewhere releases the other column.
  const assign = (header: string, field: ImportField) =>
    onMappingChange(
      Object.fromEntries(
        sheet.headers.map((h) => {
          if (h === header) return [h, field];
          const current = mapping[h] ?? "ignore";
          return [h, field !== "ignore" && current === field ? "ignore" : current];
        }),
      ),
    );

  return (
    <>
      <div className="grid gap-5 p-4 sm:p-6">
        <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/40 px-4 py-3">
          <FileSpreadsheet className="size-5 shrink-0 text-channel-csv" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{sheet.fileName}</p>
            <p className="text-xs text-muted-foreground tabular-nums">
              {t("import.map.fileSummary", { rows: sheet.rows.length, columns: sheet.headers.length })}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onBack}>
            {t("import.map.chooseAnother")}
          </Button>
        </div>

        <div>
          <h2 className="text-base font-semibold">{t("import.map.title")}</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{t("import.map.description")}</p>
        </div>

        <div className="overflow-hidden rounded-lg border">
          <div className="hidden grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_24px_220px] items-center gap-4 border-b bg-muted/50 px-4 py-2 text-xs text-muted-foreground md:grid">
            <span>{t("import.map.columnInFile")}</span>
            <span>{t("import.map.firstValues")}</span>
            <span />
            <span>{t("import.map.importAs")}</span>
          </div>
          <ul className="divide-y">
            {sheet.headers.map((header) => {
              const samples = sheet.rows
                .map((row) => row[header])
                .filter(Boolean)
                .slice(0, 3);
              const field = mapping[header] ?? "ignore";
              return (
                <li
                  key={header}
                  className="grid gap-1 px-4 py-3 text-sm md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_24px_220px] md:items-center md:gap-4"
                >
                  <span className="truncate font-medium">{header}</span>
                  <span className="truncate text-muted-foreground">
                    {samples.length ? samples.join(", ") : t("import.map.emptyColumn")}
                  </span>
                  <ArrowRight
                    className="hidden size-4 text-muted-foreground md:block rtl:rotate-180"
                    aria-hidden="true"
                  />
                  <Select value={field} onValueChange={(value) => assign(header, ImportField.parse(value))}>
                    <SelectTrigger
                      className={cn(
                        "mt-1 w-full md:mt-0",
                        field === "ignore" ? "text-muted-foreground" : "border-primary/40 bg-accent/40",
                      )}
                      aria-label={t("import.map.importColumnAs", { column: header })}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ImportField.options.map((option) => (
                        <SelectItem key={option} value={option}>
                          {t(`import.fields.${option}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </li>
              );
            })}
          </ul>
        </div>

        {!hasName ? (
          <p
            role="status"
            className="flex items-start gap-2 rounded-md border border-attention/40 bg-warning-soft px-3 py-2.5 text-sm text-warning"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {t("import.map.needsName")}
          </p>
        ) : !hasPhone ? (
          <p className="flex items-start gap-2 rounded-md bg-info-soft px-3 py-2.5 text-sm text-info">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {t("import.map.noPhone")}
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
      </div>
      <StepFooter>
        <Button variant="outline" onClick={onBack}>
          {t("import.back")}
        </Button>
        <Button onClick={onContinue} disabled={!hasName || pending}>
          {pending ? t("import.map.checking") : t("import.map.continue", { count: sheet.rows.length })}
        </Button>
      </StepFooter>
    </>
  );
}

/** Step actions, kept in view at the bottom of the screen (above the mobile tab bar) while rows scroll. */
export function StepFooter({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] z-10 flex flex-col-reverse gap-2 rounded-b-lg border-t bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:bottom-0">
      {children}
    </div>
  );
}
