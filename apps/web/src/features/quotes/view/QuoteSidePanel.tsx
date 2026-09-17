import { api } from "@hco/shared";
import type { QuoteDetail } from "@hco/shared/api/quotes";
import { Link } from "@tanstack/react-router";
import { CircleCheck, CircleX, Mail, MessageCircle, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useApiQuery } from "@/lib/api/hooks";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { QuoteRows } from "../QuoteRows";
import type { QuoteActions } from "../useQuoteActions";

/** Beside the quotation: how to send it, the customer's decision, its history and other quotes on the deal. */
export function QuoteSidePanel({
  detail,
  actions,
  onReject,
}: {
  detail: QuoteDetail;
  actions: QuoteActions;
  onReject: () => void;
}) {
  const { quote } = detail;
  return (
    <aside className="flex min-w-0 flex-col gap-6 lg:sticky lg:top-6">
      <div className="divide-y rounded-xl border bg-card">
        {quote.status === "draft" ? <SendSection detail={detail} actions={actions} /> : null}
        {quote.status === "sent" ? (
          <>
            <OutcomeSection detail={detail} actions={actions} onReject={onReject} />
            <ResendSection detail={detail} actions={actions} />
          </>
        ) : null}
        {quote.status === "accepted" || quote.status === "rejected" ? (
          <ResultSection detail={detail} />
        ) : null}
        <HistorySection detail={detail} />
      </div>
      <OtherQuotes dealId={quote.dealId} quoteId={quote.id} />
    </aside>
  );
}

function ChannelRow({
  icon: Icon,
  button,
  note,
  noteExtra,
}: {
  icon: LucideIcon;
  button: ReactNode;
  note: string;
  noteExtra?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="hidden lg:block">{button}</div>
      <p className="flex gap-2 text-xs leading-relaxed text-muted-foreground">
        <Icon aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 lg:hidden" />
        <span>
          {note} {noteExtra}
        </span>
      </p>
    </div>
  );
}

/** A disabled button doesn't receive pointer events, so its tooltip hangs off a focusable wrapper. */
function WithReason({ reason, children }: { reason: string | null; children: ReactNode }) {
  if (!reason) return children;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          tabIndex={0}
          className="block rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          {children}
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-64">{reason}</TooltipContent>
    </Tooltip>
  );
}

function OpenChatLink({ conversationId }: { conversationId: string | null }) {
  const { t } = useTranslation("quotes");
  if (!conversationId) return null;
  return (
    <Link
      to="/inbox/$conversationId"
      params={{ conversationId }}
      className="font-medium whitespace-nowrap text-primary underline-offset-2 hover:underline"
    >
      {t("send.openChat")}
    </Link>
  );
}

function SendSection({ detail, actions }: { detail: QuoteDetail; actions: QuoteActions }) {
  const { t } = useTranslation("quotes");
  const name = detail.contact.firstName;
  return (
    <section data-tour="quote-send-desktop" className="flex flex-col gap-4 p-4 sm:p-5">
      <h2 className="text-sm font-semibold">{t("send.title", { name })}</h2>
      <ChannelRow
        icon={MessageCircle}
        button={
          <WithReason reason={detail.canSendWhatsapp ? null : t("send.windowShort", { name })}>
            <Button
              className="w-full"
              disabled={!detail.canSendWhatsapp || actions.sendingVia !== null}
              onClick={actions.sendWhatsapp}
            >
              <MessageCircle />
              {actions.sendingVia === "whatsapp" ? t("send.sending") : t("send.whatsapp")}
            </Button>
          </WithReason>
        }
        note={actions.whatsappNote}
        noteExtra={<OpenChatLink conversationId={actions.conversationId} />}
      />
      <ChannelRow
        icon={Mail}
        button={
          <WithReason reason={detail.canSendEmail ? null : actions.emailNote}>
            <Button
              className="w-full"
              variant="outline"
              disabled={!detail.canSendEmail || actions.sendingVia !== null}
              onClick={actions.sendEmail}
            >
              <Mail />
              {actions.sendingVia === "email" ? t("send.sending") : t("send.email")}
            </Button>
          </WithReason>
        }
        note={actions.emailNote}
      />
    </section>
  );
}

/** Sending a copy of a quote that is already out. On phones this lives in the action bar's menu. */
function ResendSection({ detail, actions }: { detail: QuoteDetail; actions: QuoteActions }) {
  const { t } = useTranslation("quotes");
  const name = detail.contact.firstName;
  return (
    <section className="hidden flex-col gap-2.5 p-4 sm:p-5 lg:flex">
      <h2 className="text-sm font-semibold">{t("send.resendTitle")}</h2>
      <div className="grid grid-cols-2 gap-2">
        <WithReason reason={detail.canSendWhatsapp ? null : t("send.windowShort", { name })}>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            disabled={!detail.canSendWhatsapp || actions.sendingVia !== null}
            onClick={actions.sendWhatsapp}
          >
            <MessageCircle />
            {actions.sendingVia === "whatsapp" ? t("send.sending") : t("send.resendWhatsapp")}
          </Button>
        </WithReason>
        <WithReason reason={detail.canSendEmail ? null : actions.emailNote}>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            disabled={!detail.canSendEmail || actions.sendingVia !== null}
            onClick={actions.sendEmail}
          >
            <Mail />
            {actions.sendingVia === "email" ? t("send.sending") : t("send.resendEmail")}
          </Button>
        </WithReason>
      </div>
      {detail.canSendWhatsapp ? null : (
        <p className="text-xs leading-relaxed text-muted-foreground">
          {t("send.windowShort", { name })}. <OpenChatLink conversationId={actions.conversationId} />
        </p>
      )}
    </section>
  );
}

function OutcomeSection({
  detail,
  actions,
  onReject,
}: {
  detail: QuoteDetail;
  actions: QuoteActions;
  onReject: () => void;
}) {
  const { t } = useTranslation("quotes");
  return (
    <section className="flex flex-col gap-3 p-4 sm:p-5">
      <div>
        <h2 className="text-sm font-semibold">{t("outcome.title", { name: detail.contact.firstName })}</h2>
        <p className="mt-1 text-xs text-muted-foreground">{t("outcome.body")}</p>
      </div>
      <div className="hidden gap-2 lg:grid">
        <Button disabled={actions.decidingAs !== null} onClick={actions.accept}>
          <CircleCheck />
          {t("outcome.accept")}
        </Button>
        <Button variant="outline" disabled={actions.decidingAs !== null} onClick={onReject}>
          <CircleX />
          {t("outcome.reject")}
        </Button>
      </div>
    </section>
  );
}

function ResultSection({ detail }: { detail: QuoteDetail }) {
  const { t } = useTranslation("quotes");
  const accepted = detail.quote.status === "accepted";
  const Icon = accepted ? CircleCheck : CircleX;
  return (
    <section className="p-4 sm:p-5">
      <div
        className={cn(
          "flex gap-2.5 rounded-lg p-3 text-sm",
          accepted ? "bg-success-soft text-success" : "bg-danger-soft text-destructive",
        )}
      >
        <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        <div>
          <p className="text-foreground">
            {t(accepted ? "outcome.acceptedNote" : "outcome.rejectedNote", {
              name: detail.contact.firstName,
            })}
          </p>
          <Link
            to="/deals/$dealId"
            params={{ dealId: detail.deal.id }}
            className="mt-1.5 inline-block font-medium underline-offset-2 hover:underline"
          >
            {t("outcome.openDeal")}
          </Link>
        </div>
      </div>
    </section>
  );
}

function HistorySection({ detail }: { detail: QuoteDetail }) {
  const { t } = useTranslation("quotes");
  const { quote } = detail;
  const events = [
    {
      key: "drafted",
      label: detail.preparedByName
        ? t("history.drafted", { name: detail.preparedByName })
        : t("history.draftedAnon"),
      at: quote.createdAt,
      dot: "bg-muted-foreground/50",
    },
    quote.sentAt
      ? {
          key: "sent",
          label: t(quote.sentVia === "email" ? "history.sentEmail" : "history.sentWhatsapp"),
          at: quote.sentAt,
          dot: "bg-info",
        }
      : null,
    quote.status === "accepted" || quote.status === "rejected"
      ? {
          key: quote.status,
          label: t(`history.${quote.status}`),
          at: quote.updatedAt,
          dot: quote.status === "accepted" ? "bg-success" : "bg-destructive",
        }
      : null,
  ].filter((event) => event !== null);

  return (
    <section className="p-4 sm:p-5">
      <h2 className="text-sm font-semibold">{t("history.title")}</h2>
      <ol className="mt-3 flex flex-col">
        {events.map((event, index) => (
          <li key={event.key} className="relative flex gap-3 pb-3 last:pb-0">
            {index < events.length - 1 ? (
              <span aria-hidden="true" className="absolute start-[3px] top-3 bottom-0 w-px bg-border" />
            ) : null}
            <span aria-hidden="true" className={cn("mt-1.5 size-[7px] shrink-0 rounded-full", event.dot)} />
            <div className="min-w-0">
              <p className="text-sm">{event.label}</p>
              <p className="text-xs text-muted-foreground tabular-nums">{formatDateTime(event.at)}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function OtherQuotes({ dealId, quoteId }: { dealId: string; quoteId: string }) {
  const { t } = useTranslation("quotes");
  const query = useApiQuery(api.quotes.listForDeal, { params: { dealId } });
  const others = (query.data?.items ?? []).filter((q) => q.id !== quoteId);
  if (!others.length) return null;
  return (
    <section className="flex flex-col gap-2.5">
      <h2 className="text-sm font-semibold">{t("panel.otherTitle")}</h2>
      <QuoteRows items={others} />
    </section>
  );
}
