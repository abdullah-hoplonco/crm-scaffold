import { serviceWindowState, SERVICE_WINDOW_HOURS } from "@hco/core";
import type { ConversationListItem } from "@hco/shared/api/inbox";
import { LayoutTemplate, Lock, SendHorizontal, Timer } from "lucide-react";
import { useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatDuration, formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useNow } from "./hooks";

const WINDOW_MS = SERVICE_WINDOW_HOURS * 3_600_000;
const CLOSING_SOON_MS = 2 * 3_600_000;

/**
 * Everything under the messages: the WhatsApp service window state and the composer. Outside the
 * window the text box is locked and the way forward is an approved template.
 */
export function ReplyArea({
  conversation,
  firstName,
  onSend,
  onOpenTemplates,
}: {
  conversation: ConversationListItem;
  firstName: string;
  onSend: (text: string) => void;
  onOpenTemplates: () => void;
}) {
  const { t } = useTranslation("inbox");
  const now = useNow(15_000);
  const isWhatsapp = conversation.channel === "whatsapp";
  const serviceWindow = serviceWindowState(conversation, now);
  const locked = isWhatsapp && !serviceWindow.open;

  return (
    <div className="relative shrink-0 border-t bg-card">
      {isWhatsapp ? (
        serviceWindow.open ? (
          <WindowOpenBar remainingMs={serviceWindow.remainingMs} />
        ) : (
          <div
            role="status"
            data-tour="service-window"
            className="flex flex-col gap-3 border-b border-attention/30 bg-warning-soft px-4 py-3 sm:flex-row sm:items-center"
          >
            <p className="flex min-w-0 flex-1 gap-2.5 text-sm text-foreground">
              <Lock aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-warning" />
              <span>
                {serviceWindow.expiresAt
                  ? t("window.closed", { ago: formatRelative(serviceWindow.expiresAt), name: firstName })
                  : t("window.never", { name: firstName })}
              </span>
            </p>
            <Button type="button" className="shrink-0 self-start sm:self-auto" onClick={onOpenTemplates}>
              <LayoutTemplate className="size-4" />
              {t("composer.sendTemplate")}
            </Button>
          </div>
        )
      ) : null}
      <Composer
        channel={conversation.channel}
        locked={locked}
        firstName={firstName}
        onSend={onSend}
        onOpenTemplates={onOpenTemplates}
      />
    </div>
  );
}

/**
 * The reply area's top edge is the window itself: a line that drains from full to empty over 24 hours,
 * turning saffron in the last two.
 */
function WindowOpenBar({ remainingMs }: { remainingMs: number }) {
  const { t } = useTranslation("inbox");
  const closing = remainingMs < CLOSING_SOON_MS;
  const left = Math.min(1, remainingMs / WINDOW_MS);
  const time = formatDuration(remainingMs);
  return (
    <>
      <span
        role="progressbar"
        aria-label={t("window.progressLabel")}
        aria-valuemin={0}
        aria-valuemax={SERVICE_WINDOW_HOURS * 60}
        aria-valuenow={Math.round(remainingMs / 60_000)}
        aria-valuetext={time}
        className="absolute inset-x-0 -top-px block h-0.5 bg-border"
      >
        <span
          className={cn(
            "absolute inset-y-0 start-0 transition-[width] duration-700",
            closing ? "bg-attention" : "bg-channel-whatsapp",
          )}
          style={{ width: `${Math.max(1, left * 100)}%` }}
        />
      </span>
      <p className="flex items-center gap-1.5 px-4 pt-2.5 text-xs sm:px-5" data-tour="service-window">
        <Timer
          aria-hidden="true"
          className={cn("size-3.5 shrink-0", closing ? "text-warning" : "text-channel-whatsapp")}
        />
        <span className={cn("min-w-0 truncate", closing ? "font-medium text-foreground" : "text-muted-foreground")}>
          {closing ? t("window.closing", { time }) : t("window.open", { time })}
        </span>
      </p>
    </>
  );
}

function Composer({
  channel,
  locked,
  firstName,
  onSend,
  onOpenTemplates,
}: {
  channel: "whatsapp" | "email";
  locked: boolean;
  firstName: string;
  onSend: (text: string) => void;
  onOpenTemplates: () => void;
}) {
  const { t } = useTranslation("inbox");
  const [text, setText] = useState("");
  const input = useRef<HTMLTextAreaElement>(null);
  const canSend = !locked && text.trim().length > 0;

  const submit = (event?: FormEvent) => {
    event?.preventDefault();
    if (!canSend) return;
    onSend(text.trim());
    setText("");
    input.current?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit();
    }
  };

  const placeholder = locked
    ? t("composer.placeholderLocked", { name: firstName })
    : channel === "email"
      ? t("composer.placeholderEmail", { name: firstName })
      : t("composer.placeholder");

  return (
    <form onSubmit={submit} className="flex items-end gap-2 px-3 py-3 sm:px-4" data-tour="composer">
      {channel === "whatsapp" ? (
        <Button
          type="button"
          variant="ghost"
          className="h-10 shrink-0 gap-1.5 px-2.5 text-muted-foreground hover:text-accent-foreground"
          onClick={onOpenTemplates}
          aria-label={t("composer.templates")}
        >
          <LayoutTemplate className="size-[18px]" />
          <span className="hidden sm:inline">{t("composer.templates")}</span>
        </Button>
      ) : null}
      <label htmlFor="composer" className="sr-only">
        {t("composer.label")}
      </label>
      <Textarea
        id="composer"
        ref={input}
        rows={1}
        value={text}
        disabled={locked}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        aria-describedby="composer-hint"
        className="max-h-40 min-h-10 resize-none rounded-2xl bg-background py-2.5 leading-snug"
      />
      <span id="composer-hint" className="sr-only">
        {t("composer.hint")}
      </span>
      <Button
        type="submit"
        size="icon"
        className="size-10 shrink-0 rounded-full"
        disabled={!canSend}
        aria-label={t("composer.send")}
      >
        <SendHorizontal className="size-[18px] rtl:-scale-x-100" />
      </Button>
    </form>
  );
}
