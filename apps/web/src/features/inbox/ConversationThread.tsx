import { renderTemplate } from "@hco/core/inbox/templates";
import { firstNameOf } from "@hco/core/leads/views";
import { api, type Message, type WhatsAppTemplate } from "@hco/shared";
import type { ConversationDetail } from "@hco/shared/api/inbox";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, MessageSquareDashed } from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { EmptyState, ErrorState } from "@/components/app/States";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { errorMessage, isApiError } from "@/lib/api/errors";
import { apiKey, useApiMutation, useApiQuery } from "@/lib/api/hooks";
import { useSession } from "@/lib/session";
import { useNow } from "./hooks";
import { MessageBubble } from "./MessageBubble";
import { ReplyArea } from "./ReplyArea";
import { TemplateDialog } from "./TemplateDialog";
import { ThreadHeader } from "./ThreadHeader";
import { dayLabel, dubaiDayKey } from "./time";

/** Messages from the same side within this gap are drawn as one group. */
const GROUP_GAP_MS = 5 * 60_000;

type SendInput = { kind: "text"; body: string } | { kind: "template"; template: WhatsAppTemplate; variables: string[] };

export function ConversationThread({ conversationId }: { conversationId: string }) {
  const { t } = useTranslation("inbox");
  const { user } = useSession();
  const queryClient = useQueryClient();
  const input = { params: { conversationId } };
  const detailKey = apiKey(api.inbox.get, input);
  const query = useApiQuery(api.inbox.get, input);
  const users = useApiQuery(api.workspace.listUsers, {});
  const [templatesOpen, setTemplatesOpen] = useState(false);
  // The optimistic bubble for a template needs the template body, which the request itself doesn't carry.
  const pendingTemplate = useRef<WhatsAppTemplate | null>(null);

  const send = useApiMutation<typeof api.inbox.send, { previous?: ConversationDetail }>(api.inbox.send, {
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: detailKey });
      const previous = queryClient.getQueryData<ConversationDetail>(detailKey);
      if (previous) {
        const optimistic = optimisticMessage(previous, vars.body, user.id, pendingTemplate.current);
        queryClient.setQueryData<ConversationDetail>(detailKey, {
          ...previous,
          messages: [...previous.messages, optimistic],
        });
      }
      return { previous };
    },
    onSuccess: (_message, vars) => {
      if (vars.body.kind === "template") toast.success(t("toasts.templateSent"));
    },
    onError: (error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(detailKey, context.previous);
      toast.error(t("toasts.sendFailed"), {
        description: isApiError(error, "SERVICE_WINDOW_CLOSED") ? t("toasts.windowClosed") : errorMessage(error),
      });
    },
  });
  const doSend = (payload: SendInput) => {
    if (payload.kind === "text") {
      send.mutate({ params: { conversationId }, body: { kind: "text", body: payload.body } });
    } else {
      pendingTemplate.current = payload.template;
      send.mutate({
        params: { conversationId },
        body: { kind: "template", templateId: payload.template.id, variables: payload.variables },
      });
      setTemplatesOpen(false);
    }
  };

  // Opening a conversation reads it.
  const { mutate: markRead, isPending: marking } = useApiMutation(api.inbox.markRead);
  const unread = query.data?.conversation.unreadCount ?? 0;
  useEffect(() => {
    if (unread > 0 && !marking) markRead({ params: { conversationId } });
  }, [unread, marking, markRead, conversationId]);

  if (query.isPending) return <ThreadSkeleton />;
  if (query.isError) {
    return (
      <div className="flex flex-1 flex-col">
        <BackBar />
        {isApiError(query.error, "NOT_FOUND") || isApiError(query.error, "FORBIDDEN") ? (
          <EmptyState
            icon={MessageSquareDashed}
            title={t("thread.unavailable")}
            description={errorMessage(query.error)}
            action={
              <Button asChild variant="outline" size="sm">
                <Link to="/inbox">{t("thread.backToInbox")}</Link>
              </Button>
            }
            className="flex-1"
          />
        ) : (
          <ErrorState error={query.error} onRetry={() => void query.refetch()} className="flex-1" />
        )}
      </div>
    );
  }

  const detail = query.data;
  const c = detail.conversation;
  const firstName = detail.contact?.firstName ?? firstNameOf(detail.lead?.name ?? c.displayName);
  const senderNames = new Map((users.data?.items ?? []).map((u) => [u.id, firstNameOf(u.name)]));

  return (
    <>
      <ThreadHeader detail={detail} />
      <MessageList messages={detail.messages} senderNames={senderNames} conversationId={c.id} />
      <ReplyArea
        key={c.id}
        conversation={c}
        firstName={firstName}
        onSend={(body) => doSend({ kind: "text", body })}
        onOpenTemplates={() => setTemplatesOpen(true)}
      />
      {c.channel === "whatsapp" ? (
        <TemplateDialog
          key={`templates-${c.id}`}
          open={templatesOpen}
          onOpenChange={setTemplatesOpen}
          recipientName={firstName}
          prefill={{ firstName, interest: detail.interest ?? null, userFirstName: firstNameOf(user.name) }}
          onSend={(template, variables) => doSend({ kind: "template", template, variables })}
        />
      ) : null}
    </>
  );
}

function MessageList({
  messages,
  senderNames,
  conversationId,
}: {
  messages: Message[];
  senderNames: Map<string, string>;
  conversationId: string;
}) {
  const { t } = useTranslation("inbox");
  const now = useNow(60_000);
  const scroller = useRef<HTMLDivElement>(null);
  const seen = useRef<{ id: string; count: number } | null>(null);

  // Jump to the newest message on open; glide to it when a new one arrives.
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const previous = seen.current;
    const isNewConversation = previous?.id !== conversationId;
    if (isNewConversation || messages.length > previous.count) {
      el.scrollTo({ top: el.scrollHeight, behavior: isNewConversation ? "auto" : "smooth" });
    }
    seen.current = { id: conversationId, count: messages.length };
  }, [conversationId, messages.length]);

  const days = useMemo(() => {
    const groups: Array<{ key: string; label: string; messages: Message[] }> = [];
    for (const m of messages) {
      const key = dubaiDayKey(m.occurredAt);
      const last = groups[groups.length - 1];
      if (last?.key === key) last.messages.push(m);
      else groups.push({ key, label: dayLabel(m.occurredAt, now, t), messages: [m] });
    }
    return groups;
  }, [messages, now, t]);

  return (
    <div
      ref={scroller}
      className="min-h-0 flex-1 overflow-y-auto bg-background"
      role="log"
      aria-live="polite"
      aria-label={t("thread.messages")}
    >
      <div className="mx-auto flex min-h-full max-w-3xl flex-col justify-end px-3 pt-2 pb-4 sm:px-6">
        {messages.length === 0 ? (
          <EmptyState
            icon={MessageSquareDashed}
            title={t("thread.noMessages")}
            description={t("thread.noMessagesDescription")}
          />
        ) : null}
        {days.map((day) => (
          <section key={day.key} aria-label={day.label} className="flex flex-col">
            <div className="sticky top-2 z-10 my-3 flex justify-center">
              <span className="rounded-full border bg-card px-3 py-0.5 text-xs font-medium text-muted-foreground">
                {day.label}
              </span>
            </div>
            {day.messages.map((m, i) => {
              const prev = day.messages[i - 1];
              const continued =
                prev !== undefined &&
                prev.direction === m.direction &&
                new Date(m.occurredAt).getTime() - new Date(prev.occurredAt).getTime() < GROUP_GAP_MS;
              return (
                <MessageBubble
                  key={m.id}
                  message={m}
                  continued={continued}
                  senderName={m.sentByUserId ? (senderNames.get(m.sentByUserId) ?? null) : null}
                />
              );
            })}
          </section>
        ))}
      </div>
    </div>
  );
}

function optimisticMessage(
  detail: ConversationDetail,
  body: { kind: "text"; body: string } | { kind: "template"; templateId: string; variables: string[] },
  userId: string,
  template: WhatsAppTemplate | null,
): Message {
  const now = new Date().toISOString();
  const c = detail.conversation;
  const isTemplate = body.kind === "template";
  return {
    id: `optimistic-${now}`,
    workspaceId: c.workspaceId,
    createdAt: now,
    updatedAt: now,
    conversationId: c.id,
    direction: "out",
    channel: c.channel,
    kind: isTemplate ? "template" : "text",
    externalId: null,
    body: isTemplate ? (template ? renderTemplate(template.body, body.variables) : null) : body.body,
    subject: null,
    media: [],
    template:
      isTemplate && template
        ? { templateId: template.id, name: template.name, language: template.language, variables: body.variables }
        : null,
    quoteId: null,
    status: "queued",
    error: null,
    sentByUserId: userId,
    occurredAt: now,
  };
}

function BackBar() {
  const { t } = useTranslation("inbox");
  return (
    <div className="flex h-14 shrink-0 items-center border-b bg-card px-2 lg:hidden">
      <Button asChild variant="ghost" size="sm">
        <Link to="/inbox">
          <ArrowLeft className="size-4 rtl:rotate-180" />
          {t("thread.backToInbox")}
        </Link>
      </Button>
    </div>
  );
}

function ThreadSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col" aria-busy="true">
      <div className="flex items-center gap-3 border-b bg-card px-4 py-3">
        <Skeleton className="size-11 rounded-full" />
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-28" />
        </div>
      </div>
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-end gap-3 bg-background px-6 py-6">
        <Skeleton className="h-12 w-2/3 rounded-2xl" />
        <Skeleton className="ms-auto h-16 w-1/2 rounded-2xl" />
        <Skeleton className="h-10 w-1/3 rounded-2xl" />
        <Skeleton className="ms-auto h-12 w-3/5 rounded-2xl" />
      </div>
      <div className="h-16 border-t bg-card" />
    </div>
  );
}
