import type { LucideIcon } from "lucide-react";
import { AlertTriangle } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { errorMessage } from "@/lib/api/errors";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2 px-6 py-12 text-center", className)}>
      {Icon ? (
        <span className="mb-1 inline-flex size-11 items-center justify-center rounded-full bg-accent text-accent-foreground">
          <Icon className="size-5" />
        </span>
      ) : null}
      <p className="font-medium">{title}</p>
      {description ? <p className="max-w-sm text-sm text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

export function ErrorState({
  error,
  onRetry,
  className,
}: {
  error: unknown;
  onRetry?: () => void;
  className?: string;
}) {
  const { t } = useTranslation();
  return (
    <div role="alert" className={cn("flex flex-col items-center gap-2 px-6 py-12 text-center", className)}>
      <span className="inline-flex size-11 items-center justify-center rounded-full bg-danger-soft text-destructive">
        <AlertTriangle className="size-5" />
      </span>
      <p className="font-medium">{t("states.errorTitle")}</p>
      <p className="max-w-sm text-sm text-muted-foreground">{errorMessage(error)}</p>
      {onRetry ? (
        <Button variant="outline" size="sm" className="mt-2" onClick={onRetry}>
          {t("actions.retry")}
        </Button>
      ) : null}
    </div>
  );
}

export function LoadingRows({ rows = 6, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-2 p-4", className)} aria-busy="true" aria-live="polite">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-14 w-full" />
      ))}
    </div>
  );
}
