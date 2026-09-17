import { templateSegments, templateVariableCount } from "@hco/core/inbox/templates";
import { api, type WhatsAppTemplate } from "@hco/shared";
import { CheckCircle2, LayoutTemplate } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { EmptyState, ErrorState } from "@/components/app/States";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useApiQuery } from "@/lib/api/hooks";
import { cn } from "@/lib/utils";

export interface TemplatePrefill {
  firstName: string;
  interest: string | null;
  userFirstName: string;
}

/** Guess a variable from its hint, e.g. "Patient first name" or "Your name". Unknown hints start empty. */
function prefillFor(hint: string, prefill: TemplatePrefill): string {
  if (/your name|sender|agent|coordinator/i.test(hint)) return prefill.userFirstName;
  if (/name/i.test(hint)) return prefill.firstName;
  if (/treatment|interest|product|service/i.test(hint)) return softenInterest(prefill.interest);
  return "";
}

/** "Laser hair removal" reads better mid-sentence as "laser hair removal"; single brand words stay as they are. */
function softenInterest(interest: string | null): string {
  if (!interest) return "";
  const words = interest.split(/\s+/);
  if (words.length < 2 || words.slice(1).some((w) => /[A-Z]/.test(w))) return interest;
  return interest.charAt(0).toLowerCase() + interest.slice(1);
}

function defaultsFor(template: WhatsAppTemplate, prefill: TemplatePrefill): string[] {
  const count = templateVariableCount(template.body);
  return Array.from({ length: count }, (_, i) => prefillFor(template.variableHints[i] ?? "", prefill));
}

export function TemplateDialog({
  open,
  onOpenChange,
  prefill,
  recipientName,
  onSend,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefill: TemplatePrefill;
  recipientName: string;
  onSend: (template: WhatsAppTemplate, variables: string[]) => void;
}) {
  const { t } = useTranslation("inbox");
  const templates = useApiQuery(api.inbox.templates, {});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, string[]>>({});

  const items = templates.data?.items ?? [];
  const selected = items.find((tpl) => tpl.id === selectedId) ?? items[0] ?? null;
  const values = selected ? (edits[selected.id] ?? defaultsFor(selected, prefill)) : [];
  const complete = values.every((v) => v.trim().length > 0);

  const setValue = (index: number, value: string) => {
    if (!selected) return;
    const next = [...values];
    next[index] = value;
    setEdits((prev) => ({ ...prev, [selected.id]: next }));
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!selected || !complete) return;
    onSend(
      selected,
      values.map((v) => v.trim()),
    );
    setEdits((prev) => {
      const rest = { ...prev };
      delete rest[selected.id];
      return rest;
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl"
        onOpenAutoFocus={(event) => {
          // Start where the work is: the first field that still needs a value.
          const empty = values.findIndex((v) => !v.trim());
          const field = document.getElementById(`tpl-var-${Math.max(0, empty)}`);
          if (field) {
            event.preventDefault();
            field.focus();
          }
        }}
      >
        <DialogHeader className="border-b px-5 pt-5 pb-4 text-start sm:px-6">
          <DialogTitle>{t("templates.title", { name: recipientName })}</DialogTitle>
          <DialogDescription>{t("templates.description")}</DialogDescription>
        </DialogHeader>

        {templates.isPending ? (
          <div className="grid gap-3 p-6 sm:grid-cols-[15rem_1fr]">
            <Skeleton className="h-40" />
            <Skeleton className="h-40" />
          </div>
        ) : templates.isError ? (
          <ErrorState error={templates.error} onRetry={() => void templates.refetch()} />
        ) : !selected ? (
          <EmptyState
            icon={LayoutTemplate}
            title={t("templates.empty")}
            description={t("templates.emptyDescription")}
          />
        ) : (
          <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
            <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)] overflow-y-auto sm:grid-cols-[15rem_minmax(0,1fr)]">
              <fieldset className="border-b p-3 sm:border-e sm:border-b-0">
                <legend className="sr-only">{t("templates.choose")}</legend>
                <div className="flex gap-2 overflow-x-auto sm:flex-col sm:overflow-visible">
                  {items.map((tpl) => {
                    const active = tpl.id === selected.id;
                    return (
                      <label
                        key={tpl.id}
                        className={cn(
                          "relative flex min-w-[12rem] cursor-pointer flex-col gap-0.5 rounded-lg border px-3 py-2.5 text-start transition-colors sm:min-w-0",
                          "has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/50",
                          active ? "border-primary bg-accent" : "bg-card hover:bg-muted",
                        )}
                      >
                        <input
                          type="radio"
                          name="template"
                          value={tpl.id}
                          checked={active}
                          onChange={() => setSelectedId(tpl.id)}
                          className="sr-only"
                        />
                        <span className="flex items-center gap-1.5">
                          <span className="truncate text-sm font-medium">{tpl.name}</span>
                          {active ? (
                            <CheckCircle2 aria-hidden="true" className="ms-auto size-4 shrink-0 text-primary" />
                          ) : null}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {t(`templates.categories.${tpl.category}`)}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              <div className="flex min-w-0 flex-col gap-5 p-4 sm:p-5">
                <div className="rounded-xl bg-background p-3 sm:p-4">
                  <p className="mb-2 text-xs font-medium text-muted-foreground">{t("templates.preview")}</p>
                  <div className="flex justify-end">
                    <p
                      aria-live="polite"
                      className="max-w-[92%] rounded-2xl rounded-se-md bg-primary/12 px-3 py-2 text-sm leading-relaxed break-words whitespace-pre-line"
                    >
                      {templateSegments(selected.body).map((segment, i) =>
                        segment.kind === "text" ? (
                          <span key={i}>{segment.text}</span>
                        ) : values[segment.index]?.trim() ? (
                          <span key={i} className="font-semibold text-accent-foreground">
                            {values[segment.index]}
                          </span>
                        ) : (
                          <span
                            key={i}
                            className="rounded bg-attention/25 px-1 text-sm font-medium text-warning"
                          >
                            {selected.variableHints[segment.index] ?? `{{${segment.index + 1}}}`}
                          </span>
                        ),
                      )}
                    </p>
                  </div>
                </div>

                <div className="grid gap-3">
                  {values.map((value, i) => (
                    <div key={`${selected.id}-${i}`} className="grid gap-1.5">
                      <Label htmlFor={`tpl-var-${i}`}>
                        {selected.variableHints[i] ?? t("templates.variable", { n: i + 1 })}
                      </Label>
                      <Input
                        id={`tpl-var-${i}`}
                        value={value}
                        onChange={(e) => setValue(i, e.target.value)}
                        autoComplete="off"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter className="border-t px-5 py-4 sm:px-6">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t("common:actions.cancel")}
              </Button>
              <Button type="submit" disabled={!complete}>
                {t("composer.sendTemplate")}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
