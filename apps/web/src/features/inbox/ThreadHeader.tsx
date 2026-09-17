import { api } from "@hco/shared";
import type { ConversationDetail } from "@hco/shared/api/inbox";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, ExternalLink, KanbanSquare } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { AssigneeSelect } from "@/components/app/AssigneeSelect";
import { Money } from "@/components/app/Money";
import { SourceBadge } from "@/components/app/SourceBadge";
import { UserAvatar } from "@/components/app/UserAvatar";
import { Button } from "@/components/ui/button";
import { errorMessage } from "@/lib/api/errors";
import { useApiMutation, useApiQuery } from "@/lib/api/hooks";
import { formatPhone } from "@/lib/format";
import { ChannelGlyph } from "./ChannelGlyph";

/** "Invisalign — Layla Haddad" shown inside Layla's chat reads as just "Invisalign". */
function dealLabel(title: string, personName: string) {
  const suffix = ` — ${personName}`;
  return title.endsWith(suffix) ? title.slice(0, -suffix.length) : title;
}

export function ThreadHeader({ detail }: { detail: ConversationDetail }) {
  const { t } = useTranslation("inbox");
  const c = detail.conversation;
  const users = useApiQuery(api.workspace.listUsers, {});
  const assign = useApiMutation(api.inbox.assign, {
    onSuccess: (updated) => {
      const name = users.data?.items.find((u) => u.id === updated.assigneeId)?.name;
      toast.success(name ? t("toasts.assigned", { name }) : t("toasts.unassigned"));
    },
    onError: (error) => toast.error(t("toasts.assignFailed"), { description: errorMessage(error) }),
  });
  const address = c.participantPhoneE164 ? formatPhone(c.participantPhoneE164) : c.participantEmail;
  const subjectLabel = c.contactId ? t("thread.openContact") : c.leadId ? t("thread.openLead") : null;

  return (
    <header className="shrink-0 border-b bg-card">
      <div className="flex items-center gap-2 px-2 py-2.5 sm:gap-3 sm:px-4">
        <Button asChild variant="ghost" size="icon" className="shrink-0 lg:hidden">
          <Link to="/inbox" aria-label={t("thread.back")}>
            <ArrowLeft className="size-5 rtl:rotate-180" />
          </Link>
        </Button>
        <span className="relative shrink-0">
          <UserAvatar name={c.displayName} size="lg" />
          <ChannelGlyph channel={c.channel} className="absolute -end-0.5 -bottom-0.5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base leading-tight font-semibold">{c.displayName}</h2>
          <p className="mt-0.5 flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
            {address ? <span className="truncate tabular-nums">{address}</span> : null}
            {c.source ? <SourceBadge source={c.source} className="hidden py-0 sm:inline-flex" /> : null}
          </p>
        </div>
        {c.subjectHref && subjectLabel ? (
          <Button asChild variant="ghost" size="sm" className="shrink-0 text-muted-foreground">
            <Link to={c.subjectHref}>
              <ExternalLink className="size-4" />
              <span className="hidden sm:inline">{subjectLabel}</span>
              <span className="sr-only sm:hidden">{subjectLabel}</span>
            </Link>
          </Button>
        ) : null}
        <label htmlFor="conversation-assignee" className="sr-only">
          {t("thread.assignee")}
        </label>
        <AssigneeSelect
          value={c.assigneeId}
          onChange={(assigneeId) => assign.mutate({ params: { conversationId: c.id }, body: { assigneeId } })}
          disabled={assign.isPending}
          className="hidden h-9 w-44 shrink-0 md:flex"
          id="conversation-assignee"
        />
      </div>

      <div className="flex items-center gap-2 overflow-x-auto px-3 pb-2.5 sm:px-4 md:hidden">
        <label htmlFor="conversation-assignee-compact" className="sr-only">
          {t("thread.assignee")}
        </label>
        <AssigneeSelect
          value={c.assigneeId}
          onChange={(assigneeId) => assign.mutate({ params: { conversationId: c.id }, body: { assigneeId } })}
          disabled={assign.isPending}
          className="w-auto shrink-0 text-xs data-[size=default]:h-8"
          id="conversation-assignee-compact"
        />
        {c.source ? <SourceBadge source={c.source} className="shrink-0 sm:hidden" /> : null}
        <DealChips detail={detail} />
      </div>
      {detail.openDeals.length > 0 ? (
        <div className="hidden items-center gap-2 overflow-x-auto px-4 pb-2.5 md:flex">
          <span className="shrink-0 text-xs text-muted-foreground">{t("thread.openDeals")}</span>
          <DealChips detail={detail} />
        </div>
      ) : null}
    </header>
  );
}

function DealChips({ detail }: { detail: ConversationDetail }) {
  return (
    <>
      {detail.openDeals.map((deal) => (
        <Link
          key={deal.id}
          to="/deals/$dealId"
          params={{ dealId: deal.id }}
          className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border bg-background px-2.5 text-xs transition-colors hover:border-primary/40 hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <KanbanSquare aria-hidden="true" className="size-3.5 text-primary" />
          <span className="max-w-[12rem] truncate font-medium">
            {dealLabel(deal.title, detail.conversation.displayName)}
          </span>
          <span className="text-muted-foreground">{deal.stageName}</span>
          <Money value={deal.valueAed} compact className="text-muted-foreground" />
        </Link>
      ))}
    </>
  );
}
