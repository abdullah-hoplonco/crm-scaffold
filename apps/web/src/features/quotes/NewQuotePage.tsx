import { DEFAULT_QUOTE_VALIDITY_DAYS } from "@hco/core/quotes/index";
import { api } from "@hco/shared";
import { Link, useNavigate } from "@tanstack/react-router";
import { FileText } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { EmptyState } from "@/components/app/States";
import { Button } from "@/components/ui/button";
import { errorMessage } from "@/lib/api/errors";
import { useApiMutation, useApiQuery } from "@/lib/api/hooks";
import { QuoteBuilder } from "./builder/QuoteBuilder";
import { contactFullName, daysFromToday, todayInWorkspace } from "./model";
import { QuoteLoadError } from "./QuoteLoadError";
import { QuotePageHeader, QuotePageSkeleton } from "./QuotePageHeader";
import { retryUnlessClientError } from "./queryOptions";

export function NewQuotePage({ dealId }: { dealId: string | undefined }) {
  const { t } = useTranslation("quotes");
  if (!dealId) {
    return (
      <EmptyState
        icon={FileText}
        title={t("builder.noDealTitle")}
        description={t("builder.noDealBody")}
        action={
          <Button asChild>
            <Link to="/pipeline">{t("builder.openPipeline")}</Link>
          </Button>
        }
        className="min-h-[60dvh]"
      />
    );
  }
  return <NewQuoteForDeal dealId={dealId} />;
}

function NewQuoteForDeal({ dealId }: { dealId: string }) {
  const { t } = useTranslation("quotes");
  const navigate = useNavigate();
  const context = useApiQuery(
    api.quotes.draftContext,
    { params: { dealId } },
    { staleTime: Infinity, retry: retryUnlessClientError },
  );
  const create = useApiMutation(api.quotes.create, {
    onSuccess: (detail) => {
      toast.success(t("builder.created", { number: detail.quote.number }));
      void navigate({ to: "/quotes/$quoteId", params: { quoteId: detail.quote.id }, replace: true });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  if (context.isPending) return <QuotePageSkeleton />;
  if (context.isError) {
    return (
      <QuoteLoadError
        title={t("view.unavailableDeal")}
        error={context.error}
        onRetry={() => void context.refetch()}
      />
    );
  }

  const { deal, contact, company, workspace } = context.data;
  return (
    <div className="mx-auto w-full max-w-7xl px-4 pt-5 pb-8 sm:px-6 lg:px-8">
      <QuotePageHeader
        deal={deal}
        title={t("builder.newTitle")}
        description={t("builder.for", {
          name: company ? `${contactFullName(contact)}, ${company.name}` : contactFullName(contact),
        })}
      />
      <QuoteBuilder
        context={{
          deal,
          contact,
          company,
          workspace,
          number: context.data.nextNumber,
          status: "draft",
          issueDate: todayInWorkspace(),
          vatRate: workspace.vatRate,
          preparedByName: context.data.preparedByName,
        }}
        initial={{ lines: [], validUntil: daysFromToday(DEFAULT_QUOTE_VALIDITY_DAYS), notes: "" }}
        submitLabel={t("builder.saveDraft")}
        submitting={create.isPending}
        onSubmit={(values) => create.mutate({ params: { dealId }, body: values })}
        onCancel={() => void navigate({ to: "/deals/$dealId", params: { dealId } })}
      />
    </div>
  );
}
