import { api } from "@hco/shared";
import type { QuoteDetail } from "@hco/shared/api/quotes";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { errorMessage } from "@/lib/api/errors";
import { useApiMutation, useApiQuery } from "@/lib/api/hooks";
import { QuoteBuilder } from "./builder/QuoteBuilder";
import { linesFromQuote } from "./builder/lines";
import { contactFullName } from "./model";
import { QuoteLoadError } from "./QuoteLoadError";
import { QuotePageHeader, QuotePageSkeleton } from "./QuotePageHeader";
import { retryUnlessClientError } from "./queryOptions";
import { QuoteStatusPill } from "./QuoteStatusPill";
import { QuoteView } from "./view/QuoteView";

/** A quote as a document with its actions, or the builder when a draft is being edited. */
export function QuotePage({ quoteId, mode }: { quoteId: string; mode?: "edit" }) {
  const { t } = useTranslation("quotes");
  const query = useApiQuery(api.quotes.get, { params: { quoteId } }, { retry: retryUnlessClientError });
  if (query.isPending) return <QuotePageSkeleton />;
  if (query.isError) {
    return (
      <QuoteLoadError
        title={t("view.unavailableQuote")}
        error={query.error}
        onRetry={() => void query.refetch()}
      />
    );
  }
  if (mode === "edit" && query.data.quote.status === "draft") {
    return <EditQuote key={query.data.quote.id} detail={query.data} />;
  }
  return <QuoteView detail={query.data} />;
}

function EditQuote({ detail }: { detail: QuoteDetail }) {
  const { t } = useTranslation("quotes");
  const navigate = useNavigate();
  const { quote, deal, contact, company, workspace } = detail;
  const backToQuote = () =>
    void navigate({ to: "/quotes/$quoteId", params: { quoteId: quote.id }, search: {} });
  const update = useApiMutation(api.quotes.update, {
    onSuccess: () => {
      toast.success(t("builder.updated"));
      backToQuote();
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pt-5 pb-8 sm:px-6 lg:px-8">
      <QuotePageHeader
        deal={deal}
        title={t("builder.editTitle", { number: quote.number })}
        status={<QuoteStatusPill status={quote.status} />}
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
          number: quote.number,
          status: quote.status,
          issueDate: quote.createdAt,
          vatRate: quote.vatRate,
          preparedByName: detail.preparedByName ?? null,
        }}
        initial={{
          lines: linesFromQuote(quote.lineItems),
          validUntil: quote.validUntil,
          notes: quote.notes ?? "",
        }}
        submitLabel={t("builder.saveChanges")}
        submitting={update.isPending}
        onSubmit={(values) => update.mutate({ params: { quoteId: quote.id }, body: values })}
        onCancel={backToQuote}
      />
    </div>
  );
}
