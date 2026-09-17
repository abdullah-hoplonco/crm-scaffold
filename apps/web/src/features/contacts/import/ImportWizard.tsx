import { api } from "@hco/shared";
import type { ImportDraft, ImportField } from "@hco/shared/api/contacts";
import { guessImportMapping } from "@hco/core/contacts/import";
import { useQueryClient } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { callApi } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/errors";
import { useApiMutation } from "@/lib/api/hooks";
import { cn } from "@/lib/utils";
import { BackLink } from "../ui";
import { downloadRowsToFix, type ParsedSheet } from "./csv";
import { ImportStep, type ImportRun } from "./ImportStep";
import { MapStep } from "./MapStep";
import { ReviewStep } from "./ReviewStep";
import { UploadStep } from "./UploadStep";

const STEPS = ["upload", "map", "review", "import"] as const;
type Step = (typeof STEPS)[number];

/** Enough requests for a visible, honest progress bar without thousands of calls for a big file. */
function batchSize(total: number) {
  return Math.max(4, Math.ceil(total / 20));
}

export function ImportWizard() {
  const { t } = useTranslation("contacts");
  const queryClient = useQueryClient();
  const [step, setStepState] = useState<Step>("upload");
  const top = useRef<HTMLDivElement>(null);
  // Each step starts at the top of the page, not wherever the previous (longer) step was scrolled to.
  const setStep = (next: Step) => {
    setStepState(next);
    window.requestAnimationFrame(() => top.current?.closest("main")?.scrollTo({ top: 0 }));
  };
  const [sheet, setSheet] = useState<ParsedSheet | null>(null);
  const [mapping, setMapping] = useState<Record<string, ImportField>>({});
  const [drafts, setDrafts] = useState<ImportDraft[]>([]);
  const [duplicates, setDuplicates] = useState<"skip" | "update">("skip");
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const [run, setRun] = useState<ImportRun | null>(null);
  const preview = useApiMutation(api.contacts.importPreview);

  const startOver = () => {
    setStep("upload");
    setSheet(null);
    setDrafts([]);
    setRun(null);
    preview.reset();
  };

  const review = () => {
    if (!sheet) return;
    preview.mutate(
      { body: { rows: sheet.rows, mapping } },
      {
        onSuccess: (result) => {
          setDrafts(result.drafts);
          setStep("review");
        },
      },
    );
  };

  /** Send the importable rows in batches from `from`, adding to the totals of batches already sent. */
  const importRows = async (from: number, before: ImportRun | null) => {
    if (!sheet) return;
    const sendable = drafts.filter((d) => d.errors.length === 0);
    const size = batchSize(sendable.length);
    let current: ImportRun = before ?? {
      status: "running",
      processed: 0,
      total: sendable.length,
      created: 0,
      updated: 0,
      skipped: 0,
      errorRows: drafts.length - sendable.length,
      error: null,
    };
    current = { ...current, status: "running", error: null };
    setRun(current);
    setStep("import");
    for (let start = from; start < sendable.length; start += size) {
      const batch = sendable.slice(start, start + size);
      try {
        const result = await callApi(api.contacts.importCommit, {
          body: { drafts: batch, duplicates, assigneeId, fileName: sheet.fileName },
        });
        current = {
          ...current,
          processed: start + batch.length,
          created: current.created + result.created,
          updated: current.updated + result.updated,
          skipped: current.skipped + result.skipped,
        };
        setRun(current);
      } catch (error) {
        setRun({ ...current, status: "failed", processed: start, error: errorMessage(error) });
        void queryClient.invalidateQueries();
        return;
      }
    }
    setRun({ ...current, status: "done" });
    void queryClient.invalidateQueries();
    if (current.created > 0) toast.success(t("import.run.toast", { count: current.created }));
  };

  let content;
  if (step === "upload" || !sheet) {
    content = (
      <UploadStep
        onParsed={(parsed) => {
          setSheet(parsed);
          setMapping(guessImportMapping(parsed.headers));
          preview.reset();
          setStep("map");
        }}
      />
    );
  } else if (step === "map") {
    content = (
      <MapStep
        sheet={sheet}
        mapping={mapping}
        onMappingChange={setMapping}
        onBack={startOver}
        onContinue={review}
        pending={preview.isPending}
        error={preview.error ? errorMessage(preview.error) : null}
      />
    );
  } else if (step === "review") {
    content = (
      <ReviewStep
        sheet={sheet}
        mapping={mapping}
        drafts={drafts}
        duplicates={duplicates}
        onDuplicatesChange={setDuplicates}
        assigneeId={assigneeId}
        onAssigneeChange={setAssigneeId}
        onBack={() => setStep("map")}
        onImport={() => void importRows(0, null)}
      />
    );
  } else if (run) {
    content = (
      <ImportStep
        run={run}
        onRetry={() => void importRows(run.processed, run)}
        onBackToReview={() => setStep("review")}
        onStartOver={startOver}
        onDownloadRowsToFix={() => downloadRowsToFix(sheet, drafts)}
      />
    );
  }

  return (
    <>
      <header className="flex flex-col gap-3 px-4 pt-4 pb-5 sm:px-6 lg:px-8">
        <BackLink to="/contacts">{t("list.title")}</BackLink>
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{t("import.title")}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{t("import.description")}</p>
        </div>
      </header>
      <div ref={top} className="flex max-w-6xl flex-col gap-5 px-4 pb-10 sm:px-6 lg:px-8">
        <Stepper current={step} locked={run?.status === "done"} />
        <div className="rounded-lg border bg-card">{content}</div>
      </div>
    </>
  );
}

function Stepper({ current, locked }: { current: Step; locked: boolean }) {
  const { t } = useTranslation("contacts");
  const index = STEPS.indexOf(current);
  return (
    <nav aria-label={t("import.steps.label")}>
      <ol className="flex items-center gap-2 sm:gap-3">
        {STEPS.map((step, i) => {
          const state = i < index || (locked && i === index) ? "done" : i === index ? "current" : "upcoming";
          return (
            <li
              key={step}
              className="flex flex-1 items-center gap-2 last:flex-none sm:gap-3"
              aria-current={i === index ? "step" : undefined}
            >
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold tabular-nums transition-colors",
                  state === "done" && "border-primary bg-primary text-primary-foreground",
                  state === "current" && "border-primary bg-card text-primary ring-4 ring-primary/15",
                  state === "upcoming" && "bg-card text-muted-foreground",
                )}
              >
                {state === "done" ? <Check className="size-3.5" aria-hidden="true" /> : i + 1}
              </span>
              <span
                className={cn(
                  "hidden text-sm whitespace-nowrap sm:inline",
                  state === "upcoming" ? "text-muted-foreground" : "font-medium",
                )}
              >
                {t(`import.steps.${step}`)}
              </span>
              {i < STEPS.length - 1 ? (
                <span
                  aria-hidden="true"
                  className={cn("h-px min-w-4 flex-1", i < index ? "bg-primary" : "bg-border")}
                />
              ) : null}
            </li>
          );
        })}
      </ol>
      <p className="mt-2 text-sm font-medium sm:hidden">
        {t("import.steps.mobile", { step: index + 1, total: STEPS.length, label: t(`import.steps.${current}`) })}
      </p>
    </nav>
  );
}
