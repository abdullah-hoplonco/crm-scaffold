import { Link } from "@tanstack/react-router";
import { ArrowLeft, MessageCircle, Search, SearchX, X } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { EmptyState, ErrorState } from "@/components/app/States";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isApiError } from "@/lib/api/errors";
import { cn } from "@/lib/utils";

/** Small building blocks shared by the contacts and companies screens. */

export function Section({
  title,
  action,
  children,
  className,
  bodyClassName,
}: {
  title: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn("rounded-lg border bg-card", className)}>
      <header className="flex min-h-12 items-center justify-between gap-2 border-b px-4 py-2">
        <h2 className="text-sm font-semibold">{title}</h2>
        {action}
      </header>
      <div className={cn("p-4 empty:hidden", bodyClassName)}>{children}</div>
    </section>
  );
}

export function DetailItem({
  label,
  labelFor,
  children,
  className,
}: {
  label: ReactNode;
  /** Id of the control in the value, so the label is announced with it. */
  labelFor?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-1", className)}>
      <dt className="text-xs text-muted-foreground">
        {labelFor ? <label htmlFor={labelFor}>{label}</label> : label}
      </dt>
      <dd className="min-w-0 text-sm">{children}</dd>
    </div>
  );
}

/** Detail page that failed to load: a deleted or unknown record gets a way back, anything else a retry. */
export function RecordUnavailable({
  error,
  onRetry,
  backTo,
  backLabel,
  title,
}: {
  error: unknown;
  onRetry: () => void;
  backTo: "/contacts" | "/companies";
  backLabel: string;
  title: string;
}) {
  if (!isApiError(error) || error.status !== 404) {
    return <ErrorState error={error} onRetry={onRetry} />;
  }
  return (
    <EmptyState
      icon={SearchX}
      title={title}
      description={error.message}
      action={
        <Button asChild variant="outline">
          <Link to={backTo}>{backLabel}</Link>
        </Button>
      }
    />
  );
}

export function NotAdded({ children }: { children?: ReactNode }) {
  const { t } = useTranslation("contacts");
  return <span className="text-muted-foreground">{children ?? t("shared.notAdded")}</span>;
}

export function BackLink({ to, children }: { to: "/contacts" | "/companies"; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="inline-flex w-fit items-center gap-1.5 rounded-sm text-sm text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden="true" />
      {children}
    </Link>
  );
}

/** Marks a phone number that is on WhatsApp. */
export function WhatsappMark({ withLabel = false, className }: { withLabel?: boolean; className?: string }) {
  const { t } = useTranslation("contacts");
  return (
    <span
      className={cn("inline-flex items-center gap-1 text-xs font-medium text-channel-whatsapp", className)}
      title={t("shared.onWhatsapp")}
    >
      <MessageCircle className="size-3.5" aria-hidden="true" />
      {withLabel ? t("shared.whatsapp") : <span className="sr-only">{t("shared.onWhatsapp")}</span>}
    </span>
  );
}

export function SearchField({
  id,
  label,
  placeholder,
  value,
  onChange,
  className,
}: {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  const { t } = useTranslation();
  return (
    <div className={cn("relative w-full", className)}>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <Search
        className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        id={id}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="bg-card ps-9 pe-9 [&::-webkit-search-cancel-button]:hidden"
        autoComplete="off"
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute end-1.5 top-1/2 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          aria-label={t("actions.clear")}
        >
          <X className="size-4" />
        </button>
      ) : null}
    </div>
  );
}
