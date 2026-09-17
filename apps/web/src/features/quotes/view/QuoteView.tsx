import type { QuoteDetail } from "@hco/shared/api/quotes";
import { Link } from "@tanstack/react-router";
import { Download, Pencil } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { formatAed } from "@/lib/format";
import { contactFullName, modelFromDetail } from "../model";
import { QuoteDocument } from "../QuoteDocument";
import { QuotePageHeader } from "../QuotePageHeader";
import { QuoteStatusPill } from "../QuoteStatusPill";
import { useQuoteActions } from "../useQuoteActions";
import { QuoteMobileBar } from "./QuoteMobileBar";
import { QuoteSidePanel } from "./QuoteSidePanel";

export function QuoteView({ detail }: { detail: QuoteDetail }) {
  const { t } = useTranslation("quotes");
  const actions = useQuoteActions(detail);
  const [confirmReject, setConfirmReject] = useState(false);
  const { quote, deal, contact } = detail;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pt-5 pb-28 sm:px-6 lg:px-8 lg:pb-10">
      <QuotePageHeader
        deal={deal}
        title={t("view.title", { number: quote.number })}
        status={<QuoteStatusPill status={quote.status} />}
        description={t("view.summary", {
          name: detail.company
            ? `${contactFullName(contact)}, ${detail.company.name}`
            : contactFullName(contact),
          total: formatAed(quote.totalAed),
        })}
        actions={
          <>
            {quote.status === "draft" ? (
              <Button asChild variant="outline">
                <Link to="/quotes/$quoteId" params={{ quoteId: quote.id }} search={{ mode: "edit" }}>
                  <Pencil />
                  {t("view.edit")}
                </Link>
              </Button>
            ) : null}
            <Button
              variant="outline"
              data-tour="quote-download"
              disabled={actions.downloading}
              onClick={actions.download}
            >
              <Download />
              {actions.downloading ? t("view.downloading") : t("view.download")}
            </Button>
          </>
        }
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] xl:gap-8">
        <QuoteDocument model={modelFromDetail(detail)} showStatus={false} className="min-w-0" />
        <QuoteSidePanel detail={detail} actions={actions} onReject={() => setConfirmReject(true)} />
      </div>

      <QuoteMobileBar detail={detail} actions={actions} onReject={() => setConfirmReject(true)} />

      <AlertDialog open={confirmReject} onOpenChange={setConfirmReject}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("outcome.rejectTitle", { number: quote.number })}</AlertDialogTitle>
            <AlertDialogDescription>{t("outcome.rejectBody")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("builder.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                actions.reject();
                setConfirmReject(false);
              }}
            >
              {t("outcome.rejectConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
