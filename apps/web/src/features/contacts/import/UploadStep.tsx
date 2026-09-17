import { AlertCircle, FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { useId, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CsvProblem, loadSampleSheet, parseCsvFile, SAMPLE_FILE_URL, type ParsedSheet } from "./csv";

export function UploadStep({ onParsed }: { onParsed: (sheet: ParsedSheet) => void }) {
  const { t } = useTranslation("contacts");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const read = async (load: () => Promise<ParsedSheet>) => {
    setBusy(true);
    setProblem(null);
    try {
      onParsed(await load());
    } catch (error) {
      setProblem(t(`import.upload.problems.${error instanceof CsvProblem ? error.code : "unreadable"}`));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-6 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-8">
      <div className="grid content-start gap-4">
        <DropZone busy={busy} onFile={(file) => void read(() => parseCsvFile(file))} />
        {problem ? (
          <div
            role="alert"
            className="flex gap-2.5 rounded-md border border-destructive/30 bg-danger-soft px-3 py-2.5 text-sm"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
            <p>{problem}</p>
          </div>
        ) : null}
        <div className="flex flex-col gap-3 rounded-lg border bg-muted/40 px-4 py-3 sm:flex-row sm:items-center">
          <FileSpreadsheet className="hidden size-5 shrink-0 text-channel-csv sm:block" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{t("import.upload.sampleTitle")}</p>
            <p className="text-xs text-muted-foreground">{t("import.upload.sampleDescription")}</p>
          </div>
          <Button variant="outline" size="sm" disabled={busy} onClick={() => void read(loadSampleSheet)}>
            {t("import.upload.useSample")}
          </Button>
        </div>
      </div>

      <aside className="grid content-start gap-3 text-sm lg:border-s lg:ps-8">
        <h2 className="font-semibold">{t("import.upload.tipsTitle")}</h2>
        <ul className="grid list-disc gap-2 ps-4 text-muted-foreground marker:text-border">
          <li>{t("import.upload.tipHeader")}</li>
          <li>{t("import.upload.tipColumns")}</li>
          <li>{t("import.upload.tipPhones")}</li>
          <li>{t("import.upload.tipSafe")}</li>
        </ul>
        <a
          href={SAMPLE_FILE_URL}
          download
          className="w-fit text-primary underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          {t("import.upload.downloadSample")}
        </a>
      </aside>
    </div>
  );
}

function DropZone({ busy, onFile }: { busy: boolean; onFile: (file: File) => void }) {
  const { t } = useTranslation("contacts");
  const inputId = useId();
  const [dragging, setDragging] = useState(false);
  return (
    <label
      htmlFor={inputId}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files[0];
        if (file && !busy) onFile(file);
      }}
      aria-busy={busy}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors sm:py-14",
        "has-[:focus-visible]:border-primary has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-ring/15",
        dragging ? "border-primary bg-accent" : "border-input bg-muted/20 hover:border-primary/50 hover:bg-accent/40",
      )}
    >
      <span className="mb-1 flex size-12 items-center justify-center rounded-full border bg-card text-primary shadow-xs">
        {busy ? <Loader2 className="size-5 animate-spin" /> : <Upload className="size-5" />}
      </span>
      <span className="text-base font-medium">
        {busy ? (
          t("import.upload.reading")
        ) : dragging ? (
          t("import.upload.dropNow")
        ) : (
          <>
            <span className="hidden sm:inline">{t("import.upload.dropTitle")}</span>
            <span className="sm:hidden">{t("import.upload.tapTitle")}</span>
          </>
        )}
      </span>
      <span className="hidden text-sm text-muted-foreground sm:block">
        <Trans
          t={t}
          i18nKey="import.upload.orChoose"
          components={{ choose: <span className="font-medium text-primary underline underline-offset-4" /> }}
        />
      </span>
      <span className="text-xs text-muted-foreground">{t("import.upload.limits")}</span>
      <input
        id={inputId}
        type="file"
        accept=".csv,text/csv"
        className="sr-only"
        disabled={busy}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = "";
        }}
      />
    </label>
  );
}
