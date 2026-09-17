import type { ConversationListItem } from "@hco/shared/api/inbox";
import { Link } from "@tanstack/react-router";
import { ChevronRight, Clock, Lock, Mail, MessageCircle, MessagesSquare } from "lucide-react";
import { useTranslation } from "react-i18next";
import { UserAvatar } from "@/components/app/UserAvatar";
import { cn } from "@/lib/utils";
import { ShowMoreButton, TodaySection, useCollapsedList, useDurationLabel } from "./TodaySection";

/** A WhatsApp window closing within this long is flagged so the reply goes out as free text. */
const CLOSING_SOON_MS = 3 * 3_600_000;

function WindowState({ conversation, now }: { conversation: ConversationListItem; now: Date }) {
  const { t } = useTranslation("dashboard");
  const duration = useDurationLabel();
  if (conversation.channel === "email") {
    return (
      <span className="inline-flex items-center gap-1 text-muted-foreground">
        <Mail className="size-3" aria-hidden="true" />
        {t("today.replies.email")}
      </span>
    );
  }
  const expiresAt = conversation.serviceWindowExpiresAt
    ? new Date(conversation.serviceWindowExpiresAt)
    : null;
  if (!conversation.serviceWindowOpen || !expiresAt || expiresAt <= now) {
    return (
      <span className="inline-flex items-center gap-1 text-muted-foreground">
        <Lock className="size-3" aria-hidden="true" />
        {t("today.replies.windowClosed")}
      </span>
    );
  }
  const left = expiresAt.getTime() - now.getTime();
  const closingSoon = left <= CLOSING_SOON_MS;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1",
        closingSoon ? "font-medium text-warning" : "text-muted-foreground",
      )}
    >
      <Clock className="size-3" aria-hidden="true" />
      {t(closingSoon ? "today.replies.windowClosing" : "today.replies.windowOpen", {
        duration: duration(left),
      })}
    </span>
  );
}

/** Conversations where the customer spoke last, most urgent reply first. */
export function WaitingForReply({
  conversations,
  now,
  showAssignee,
  className,
}: {
  conversations: ConversationListItem[];
  now: Date;
  showAssignee: boolean;
  className?: string;
}) {
  const { t } = useTranslation("dashboard");
  const { t: tc } = useTranslation();
  const duration = useDurationLabel();
  const list = useCollapsedList(conversations);

  return (
    <TodaySection
      id="replies"
      icon={MessagesSquare}
      title={t(showAssignee ? "today.replies.titleTeam" : "today.replies.title")}
      count={conversations.length}
      className={className}
    >
      <ul className="divide-y">
        {list.visible.map((c) => {
          const ChannelIcon = c.channel === "email" ? Mail : MessageCircle;
          const waited = c.lastInboundAt ? now.getTime() - new Date(c.lastInboundAt).getTime() : 0;
          return (
            <li key={c.id}>
              <Link
                to="/inbox/$conversationId"
                params={{ conversationId: c.id }}
                className="group flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
              >
                <span className="relative mt-0.5 shrink-0">
                  <UserAvatar name={c.displayName} />
                  <span
                    className={cn(
                      "absolute -end-1 -bottom-1 flex size-4 items-center justify-center rounded-full border-2 border-card text-white",
                      c.channel === "email" ? "bg-channel-email" : "bg-channel-whatsapp",
                    )}
                  >
                    <ChannelIcon className="size-2.5" aria-hidden="true" />
                  </span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-sm font-medium">{c.displayName}</span>
                    <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                      {t("today.replies.waited", { duration: duration(waited) })}
                    </span>
                  </span>
                  <span className="mt-0.5 block truncate text-sm text-muted-foreground">
                    {c.lastMessagePreview}
                  </span>
                  <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                    <WindowState conversation={c} now={now} />
                    {showAssignee ? (
                      <span className="text-muted-foreground">
                        {c.assigneeName ?? tc("states.unassigned")}
                      </span>
                    ) : null}
                  </span>
                </span>
                <ChevronRight
                  className="mt-2 size-4 shrink-0 text-muted-foreground rtl:rotate-180"
                  aria-hidden="true"
                />
              </Link>
            </li>
          );
        })}
      </ul>
      <ShowMoreButton hidden={list.hidden} onClick={list.expand} />
    </TodaySection>
  );
}
