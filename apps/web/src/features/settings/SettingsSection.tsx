import { Lock } from "lucide-react";
import { useId, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** One settings section: heading, a sentence about what it controls, optional actions, then panels. */
export function SettingsSection({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 id={headingId} className="text-lg font-semibold tracking-tight">
            {title}
          </h2>
          {description ? (
            <p className="mt-1 max-w-prose text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}

export function SettingsPanel({
  title,
  description,
  children,
  className,
}: {
  title?: string;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("overflow-hidden rounded-xl border bg-card shadow-xs", className)}>
      {title ? (
        <div className="border-b px-4 py-3.5 sm:px-5">
          <h3 className="text-sm font-semibold">{title}</h3>
          {description ? <p className="mt-0.5 text-sm text-muted-foreground">{description}</p> : null}
        </div>
      ) : null}
      <div className="divide-y">{children}</div>
    </div>
  );
}

/** A label and its help text on the start side, the control on the end side (stacked on phones). */
export function SettingsRow({
  label,
  htmlFor,
  help,
  children,
}: {
  label: ReactNode;
  htmlFor?: string;
  help?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-2.5 px-4 py-4 sm:px-5 md:grid-cols-[14rem_minmax(0,1fr)] md:gap-8 lg:grid-cols-[16rem_minmax(0,1fr)]">
      <div className="min-w-0">
        {htmlFor ? (
          <label htmlFor={htmlFor} className="text-sm font-medium">
            {label}
          </label>
        ) : (
          <p className="text-sm font-medium">{label}</p>
        )}
        {help ? <p className="mt-1 text-sm leading-snug text-muted-foreground">{help}</p> : null}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/** Tells managers and reps why the controls are disabled. */
export function ReadOnlyNote({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-start gap-2.5 rounded-lg border border-dashed bg-card/60 px-3.5 py-2.5 text-sm text-muted-foreground">
      <Lock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}

/** Sticky bar that appears while a form has unsaved changes. Sits above the phone tab bar. */
export function UnsavedChangesBar({
  visible,
  pending,
  onDiscard,
  saveLabel,
  formId,
}: {
  visible: boolean;
  pending: boolean;
  onDiscard: () => void;
  saveLabel?: string;
  formId?: string;
}) {
  const { t } = useTranslation("settings");
  const { t: tc } = useTranslation();
  if (!visible) return null;
  return (
    <div
      role="region"
      aria-label={t("unsaved.label")}
      className="sticky bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-20 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-xl border bg-card px-4 py-3 shadow-lg animate-in fade-in-0 slide-in-from-bottom-2 lg:bottom-4"
    >
      <p className="text-sm">
        <span
          className="me-2 inline-block size-2 rounded-full bg-attention align-middle"
          aria-hidden="true"
        />
        {t("unsaved.message")}
      </p>
      <div className="ms-auto flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          onClick={onDiscard}
          disabled={pending}
        >
          {t("unsaved.discard")}
        </Button>
        <Button
          type="submit"
          form={formId}
          size="sm"
          className="bg-attention text-[#2B1D00] hover:bg-attention/90"
          disabled={pending}
        >
          {pending ? t("unsaved.saving") : (saveLabel ?? tc("actions.saveChanges"))}
        </Button>
      </div>
    </div>
  );
}
