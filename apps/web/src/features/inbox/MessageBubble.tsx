import type { Media, Message } from "@hco/shared";
import { Link } from "@tanstack/react-router";
import { FileText, ImageIcon, LayoutTemplate } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { MessageTicks } from "./MessageTicks";
import { clockTime } from "./time";

/**
 * One message. Inbound sits on the start side on white, outbound on the end side in a soft teal tint.
 * `continued` marks a follow-up from the same side, which tucks in closer and drops the corner notch.
 */
export function MessageBubble({
  message: m,
  continued,
  senderName,
}: {
  message: Message;
  continued: boolean;
  senderName: string | null;
}) {
  const { t } = useTranslation("inbox");
  const outbound = m.direction === "out";
  const isEmail = m.channel === "email";
  const document = m.kind === "document" ? m.media.find((x) => x.kind === "document") : undefined;
  const image = m.kind === "image" ? m.media.find((x) => x.kind === "image") : undefined;
  const caption = document?.caption ?? image?.caption ?? null;
  // Document and photo messages carry the file name in the body; show the caption instead.
  const body = document || image ? caption : m.body;

  return (
    <div className={cn("flex", outbound ? "justify-end" : "justify-start", continued ? "mt-0.5" : "mt-3")}>
      <div
        className={cn(
          "relative flex max-w-[85%] min-w-0 flex-col gap-1 rounded-2xl px-3 pt-2 pb-1.5 text-sm leading-snug shadow-[0_1px_0_rgb(19_35_42/0.06)] sm:max-w-[72%]",
          isEmail && "sm:max-w-[80%]",
          outbound ? "bg-primary/12 text-foreground" : "border bg-card text-card-foreground",
          !continued && (outbound ? "rounded-se-md" : "rounded-ss-md"),
          m.status === "failed" && "ring-1 ring-destructive/40",
        )}
      >
        {m.template ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-accent-foreground/80">
            <LayoutTemplate aria-hidden="true" className="size-3" />
            {t("message.template", { name: m.template.name })}
          </span>
        ) : null}
        {isEmail && m.subject ? <p className="text-sm font-semibold">{m.subject}</p> : null}
        {document ? <DocumentCard media={document} quoteId={m.quoteId} outbound={outbound} /> : null}
        {image ? <PhotoCard media={image} /> : null}
        {body ? <p className="break-words whitespace-pre-line">{body}</p> : null}
        <span
          className={cn(
            "flex items-center gap-1 self-end text-xs text-muted-foreground tabular-nums",
            outbound && "ps-6",
          )}
        >
          {outbound && senderName ? <span className="truncate">{senderName}</span> : null}
          <time dateTime={m.occurredAt}>{clockTime(m.occurredAt)}</time>
          {outbound && !isEmail ? <MessageTicks status={m.status} /> : null}
        </span>
        {m.status === "failed" ? (
          <span className="text-xs text-destructive">{m.error ?? t("message.failed")}</span>
        ) : null}
      </div>
    </div>
  );
}

function DocumentCard({ media, quoteId, outbound }: { media: Media; quoteId: string | null; outbound: boolean }) {
  const { t } = useTranslation("inbox");
  const content = (
    <>
      <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-md bg-danger-soft text-destructive">
        <FileText aria-hidden="true" className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{media.fileName ?? t("message.document")}</span>
        <span className="block text-xs text-muted-foreground">
          {[
            quoteId ? t("message.quotation") : t("message.pdf"),
            media.sizeBytes ? t("message.size", { kb: Math.max(1, Math.round(media.sizeBytes / 1024)) }) : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </span>
      </span>
    </>
  );
  const className = cn(
    "flex min-w-[14rem] items-center gap-3 rounded-lg p-2",
    outbound ? "bg-card/70" : "bg-muted",
  );
  return quoteId ? (
    <Link
      to="/quotes/$quoteId"
      params={{ quoteId }}
      className={cn(
        className,
        "transition-colors hover:bg-card focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
      )}
      aria-label={t("message.openQuote", { name: media.fileName ?? "" })}
    >
      {content}
    </Link>
  ) : (
    <div className={className}>{content}</div>
  );
}

function PhotoCard({ media }: { media: Media }) {
  const { t } = useTranslation("inbox");
  return (
    <div className="flex h-36 w-56 max-w-full flex-col items-center justify-center gap-1.5 rounded-lg bg-muted text-muted-foreground">
      <ImageIcon aria-hidden="true" className="size-6" />
      <span className="text-xs">{media.fileName ?? t("message.photo")}</span>
    </div>
  );
}
