import { Link } from "@tanstack/react-router";
import { FileX } from "lucide-react";
import { useTranslation } from "react-i18next";
import { EmptyState, ErrorState } from "@/components/app/States";
import { Button } from "@/components/ui/button";
import { errorMessage, isApiError } from "@/lib/api/errors";

/**
 * A quote or deal that is missing or assigned to someone else can't be fixed by retrying, so offer a
 * way back to the pipeline instead. Other failures keep the retry.
 */
export function QuoteLoadError({
  title,
  error,
  onRetry,
}: {
  title: string;
  error: Error;
  onRetry: () => void;
}) {
  const { t } = useTranslation("quotes");
  if (isApiError(error) && error.status < 500) {
    return (
      <EmptyState
        icon={FileX}
        title={title}
        description={errorMessage(error)}
        action={
          <Button asChild variant="outline">
            <Link to="/pipeline">{t("builder.openPipeline")}</Link>
          </Button>
        }
        className="min-h-[60dvh]"
      />
    );
  }
  return <ErrorState error={error} onRetry={onRetry} className="min-h-[60dvh]" />;
}
