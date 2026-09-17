import { Link } from "@tanstack/react-router";
import { AlertTriangle, Check, Download, Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export interface ImportRun {
  status: "running" | "failed" | "done";
  /** Rows sent so far, out of `total` rows being imported (rows that need fixing aren't sent). */
  processed: number;
  total: number;
  created: number;
  updated: number;
  skipped: number;
  errorRows: number;
  error: string | null;
}

export function ImportStep({
  run,
  onRetry,
  onBackToReview,
  onStartOver,
  onDownloadRowsToFix,
}: {
  run: ImportRun;
  onRetry: () => void;
  onBackToReview: () => void;
  onStartOver: () => void;
  onDownloadRowsToFix: () => void;
}) {
  const { t } = useTranslation("contacts");
  const percent = run.total === 0 ? 100 : Math.round((run.processed / run.total) * 100);

  if (run.status === "running") {
    return (
      <div className="grid justify-items-center gap-4 px-6 py-16 text-center" aria-live="polite" aria-busy="true">
        <Loader2 className="size-7 animate-spin text-primary" aria-hidden="true" />
        <h2 className="text-lg font-semibold">{t("import.run.importing")}</h2>
        <Progress value={percent} className="h-2.5 w-full max-w-sm" aria-label={t("import.run.progressLabel")} />
        <p className="text-sm text-muted-foreground tabular-nums">
          {t("import.run.progress", { processed: run.processed, total: run.total })}
        </p>
      </div>
    );
  }

  if (run.status === "failed") {
    return (
      <div role="alert" className="grid justify-items-center gap-3 px-6 py-14 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-danger-soft text-destructive">
          <AlertTriangle className="size-5" aria-hidden="true" />
        </span>
        <h2 className="text-lg font-semibold">{t("import.run.failedTitle")}</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          {t("import.run.failedDescription", { processed: run.processed, total: run.total, error: run.error })}
        </p>
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          <Button onClick={onRetry}>{t("import.run.retry")}</Button>
          <Button variant="outline" onClick={onBackToReview}>
            {t("import.run.backToReview")}
          </Button>
        </div>
      </div>
    );
  }

  const skippedDuplicates = run.skipped;
  return (
    <div className="grid justify-items-center gap-3 px-4 py-12 text-center sm:px-6" aria-live="polite">
      <span className="flex size-12 items-center justify-center rounded-full bg-success-soft text-success">
        <Check className="size-6" aria-hidden="true" />
      </span>
      <h2 className="text-lg font-semibold">
        {run.created > 0
          ? t("import.run.doneTitle", { count: run.created })
          : run.updated > 0
            ? t("import.run.doneUpdatedTitle", { count: run.updated })
            : t("import.run.doneNothingTitle")}
      </h2>
      <p className="max-w-md text-sm text-muted-foreground">{t("import.run.doneDescription")}</p>
      <dl className="mt-3 grid w-full max-w-md divide-y rounded-lg border text-start text-sm">
        <ResultRow label={t("import.run.created")} value={run.created} />
        {run.updated > 0 ? <ResultRow label={t("import.run.updated")} value={run.updated} /> : null}
        {skippedDuplicates > 0 ? (
          <ResultRow label={t("import.run.skippedDuplicates")} value={skippedDuplicates} />
        ) : null}
        {run.errorRows > 0 ? (
          <ResultRow
            label={t("import.run.errorRows")}
            value={run.errorRows}
            action={
              <Button variant="link" size="xs" className="h-auto w-fit px-0! text-xs" onClick={onDownloadRowsToFix}>
                <Download />
                {t("import.downloadRowsToFix")}
              </Button>
            }
          />
        ) : null}
      </dl>
      <div className="mt-4 flex w-full flex-col-reverse justify-center gap-2 sm:w-auto sm:flex-row">
        <Button variant="outline" onClick={onStartOver}>
          {t("import.run.another")}
        </Button>
        <Button asChild>
          <Link to="/contacts">{t("import.run.goToContacts")}</Link>
        </Button>
      </div>
    </div>
  );
}

function ResultRow({ label, value, action }: { label: string; value: number; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-2.5">
      <dt className="grid gap-0.5">
        <span>{label}</span>
        {action}
      </dt>
      <dd className="text-base font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
