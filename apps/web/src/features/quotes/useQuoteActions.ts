import { serviceWindowState } from "@hco/core";
import { api } from "@hco/shared";
import type { QuoteDetail } from "@hco/shared/api/quotes";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { errorMessage } from "@/lib/api/errors";
import { useApiMutation } from "@/lib/api/hooks";
import { formatDuration, formatRelative } from "@/lib/format";
import { modelFromDetail } from "./model";
import { useDownloadQuotePdf } from "./useDownloadQuotePdf";

/** Re-render every `intervalMs` so countdowns stay current. */
function useNow(intervalMs: number) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

/** Send, outcome and download actions for a quote, plus why a channel is unavailable. */
export function useQuoteActions(detail: QuoteDetail) {
  const { t } = useTranslation("quotes");
  const navigate = useNavigate();
  const now = useNow(30_000);
  const { quote, contact } = detail;
  const name = contact.firstName;
  const file = `${quote.number}.pdf`;
  const email = contact.emails[0] ?? null;
  const conversationId = detail.whatsappConversationId ?? null;

  const send = useApiMutation(api.quotes.send, {
    onSuccess: (_result, input) => {
      if (input.body.via === "whatsapp") {
        toast.success(t("send.sentWhatsapp"), {
          description: t("send.sentWhatsappBody", { file, name }),
          action: conversationId
            ? {
                label: t("send.openChat"),
                onClick: () => void navigate({ to: "/inbox/$conversationId", params: { conversationId } }),
              }
            : undefined,
        });
      } else {
        toast.success(t("send.sentEmail"), { description: t("send.sentEmailBody", { file, email }) });
      }
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const update = useApiMutation(api.quotes.update, {
    onSuccess: (_result, input) =>
      toast.success(input.body?.status === "accepted" ? t("outcome.accepted") : t("outcome.rejected")),
    onError: (error) => toast.error(errorMessage(error)),
  });

  const pdf = useDownloadQuotePdf();

  const expiresAt = detail.serviceWindowExpiresAt ?? null;
  const serviceWindow = expiresAt
    ? serviceWindowState({ channel: "whatsapp", serviceWindowExpiresAt: expiresAt }, now)
    : null;
  const whatsappNote = detail.canSendWhatsapp
    ? t("send.windowOpen", { duration: formatDuration(serviceWindow?.remainingMs ?? 0) })
    : expiresAt
      ? t("send.windowClosed", { name, ago: formatRelative(expiresAt) })
      : t("send.windowNever", { name });

  const emailNote = detail.canSendEmail
    ? t("send.emailTo", { email })
    : !email
      ? t("send.emailMissing", { name })
      : t("send.emailNoConnection");

  const params = { quoteId: quote.id };
  return {
    whatsappNote,
    emailNote,
    conversationId,
    sendWhatsapp: () => send.mutate({ params, body: { via: "whatsapp" } }),
    sendEmail: () => send.mutate({ params, body: { via: "email" } }),
    sendingVia: send.isPending ? send.variables.body.via : null,
    accept: () => update.mutate({ params, body: { status: "accepted" } }),
    reject: () => update.mutate({ params, body: { status: "rejected" } }),
    decidingAs: update.isPending ? (update.variables.body?.status ?? null) : null,
    download: () => void pdf.download(modelFromDetail(detail)),
    downloading: pdf.pending,
  };
}

export type QuoteActions = ReturnType<typeof useQuoteActions>;
