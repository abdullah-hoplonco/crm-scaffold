import type { QuoteDetail } from "@hco/shared/api/quotes";
import { Link } from "@tanstack/react-router";
import { ChevronUp, Download, Mail, MessageCircle, MoreHorizontal, Pencil } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { QuoteActions } from "../useQuoteActions";

/** Phone actions for a quote, fixed above the tab bar. */
export function QuoteMobileBar({
  detail,
  actions,
  onReject,
}: {
  detail: QuoteDetail;
  actions: QuoteActions;
  onReject: () => void;
}) {
  const { t } = useTranslation("quotes");
  const { quote } = detail;

  const sendItems = (
    <>
      <DropdownMenuItem
        disabled={!detail.canSendWhatsapp}
        onSelect={actions.sendWhatsapp}
        className="flex-col items-start gap-0.5"
      >
        <span className="flex items-center gap-2 font-medium">
          <MessageCircle className="size-4" />
          {t("send.whatsapp")}
        </span>
        <span className="text-xs text-muted-foreground">{actions.whatsappNote}</span>
      </DropdownMenuItem>
      <DropdownMenuItem
        disabled={!detail.canSendEmail}
        onSelect={actions.sendEmail}
        className="flex-col items-start gap-0.5"
      >
        <span className="flex items-center gap-2 font-medium">
          <Mail className="size-4" />
          {t("send.email")}
        </span>
        <span className="text-xs text-muted-foreground">{actions.emailNote}</span>
      </DropdownMenuItem>
    </>
  );

  const downloadButton = (
    <Button
      variant="outline"
      size="icon"
      data-tour="quote-download"
      aria-label={actions.downloading ? t("view.downloading") : t("view.download")}
      disabled={actions.downloading}
      onClick={actions.download}
    >
      <Download />
    </Button>
  );

  return (
    <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 flex items-center gap-2 border-t bg-card px-4 py-2.5 lg:hidden">
      {quote.status === "draft" ? (
        <>
          <Button asChild variant="outline" size="icon" aria-label={t("view.edit")}>
            <Link to="/quotes/$quoteId" params={{ quoteId: quote.id }} search={{ mode: "edit" }}>
              <Pencil />
            </Link>
          </Button>
          {downloadButton}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="flex-1" data-tour="quote-send" disabled={actions.sendingVia !== null}>
                {actions.sendingVia ? t("send.sending") : t("send.title", { name: detail.contact.firstName })}
                <ChevronUp />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="end" className="w-[min(22rem,calc(100vw-2rem))]">
              {sendItems}
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      ) : null}

      {quote.status === "sent" ? (
        <>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" aria-label={t("view.more")}>
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" className="w-[min(22rem,calc(100vw-2rem))]">
              <DropdownMenuItem onSelect={actions.download}>
                <Download className="size-4" />
                {t("view.download")}
              </DropdownMenuItem>
              {sendItems}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="outline"
            className="flex-1 px-2"
            disabled={actions.decidingAs !== null}
            onClick={onReject}
          >
            {t("outcome.reject")}
          </Button>
          <Button className="flex-1 px-2" disabled={actions.decidingAs !== null} onClick={actions.accept}>
            {t("outcome.accept")}
          </Button>
        </>
      ) : null}

      {quote.status === "accepted" || quote.status === "rejected" ? (
        <>
          <Button asChild variant="outline" className="flex-1">
            <Link to="/deals/$dealId" params={{ dealId: quote.dealId }}>
              {t("outcome.openDeal")}
            </Link>
          </Button>
          <Button className="flex-1" disabled={actions.downloading} onClick={actions.download}>
            <Download />
            {actions.downloading ? t("view.downloading") : t("view.download")}
          </Button>
        </>
      ) : null}
    </div>
  );
}
