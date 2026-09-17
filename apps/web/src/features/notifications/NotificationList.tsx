import type { Notification, NotificationType } from "@hco/shared";
import {
  BellOff,
  CalendarClock,
  FileCheck2,
  KanbanSquare,
  MessageCircle,
  Snowflake,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { ErrorState } from "@/components/app/States";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";

const ICONS: Record<NotificationType, { icon: LucideIcon; tone: string }> = {
  lead_assigned: { icon: UserPlus, tone: "bg-accent text-accent-foreground" },
  message_received: { icon: MessageCircle, tone: "bg-success-soft text-success" },
  task_due: { icon: CalendarClock, tone: "bg-info-soft text-info" },
  deal_stale: { icon: Snowflake, tone: "bg-warning-soft text-warning" },
  deal_assigned: { icon: KanbanSquare, tone: "bg-accent text-accent-foreground" },
  quote_accepted: { icon: FileCheck2, tone: "bg-success-soft text-success" },
};

export function NotificationList({
  items,
  isPending,
  error,
  onRetry,
  onOpen,
}: {
  items: Notification[] | undefined;
  isPending: boolean;
  error: Error | null;
  onRetry: () => void;
  onOpen: (notification: Notification) => void;
}) {
  const { t } = useTranslation("dashboard");

  if (isPending) {
    return (
      <div className="flex flex-col gap-3 p-4" aria-busy="true">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="size-8 rounded-full" />
            <div className="flex flex-1 flex-col gap-1.5">
              <Skeleton className="h-3.5 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }
  if (error) return <ErrorState error={error} onRetry={onRetry} className="py-8" />;
  if (!items?.length) {
    return (
      <div className="flex flex-col items-center gap-1.5 px-6 py-10 text-center">
        <span className="mb-1 flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <BellOff className="size-4.5" aria-hidden="true" />
        </span>
        <p className="text-sm font-medium">{t("notifications.emptyTitle")}</p>
        <p className="max-w-64 text-xs text-muted-foreground">{t("notifications.emptyDescription")}</p>
      </div>
    );
  }

  return (
    <ul className="divide-y">
      {items.map((n) => {
        const { icon: Icon, tone } = ICONS[n.type];
        const unread = !n.readAt;
        return (
          <li key={n.id}>
            <button
              type="button"
              onClick={() => onOpen(n)}
              className={cn(
                "flex w-full items-start gap-3 px-4 py-3 text-start transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset",
                unread && "bg-accent/40",
              )}
            >
              <span
                className={cn("mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full", tone)}
              >
                <Icon className="size-4" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className={cn("block text-sm leading-snug", unread ? "font-semibold" : "font-medium")}>
                  {n.title}
                </span>
                {n.body ? (
                  <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">{n.body}</span>
                ) : null}
                <span className="mt-1 block text-xs text-muted-foreground">
                  {formatRelative(n.createdAt)}
                </span>
              </span>
              {unread ? (
                <span className="mt-2 size-2 shrink-0 rounded-full bg-primary">
                  <span className="sr-only">{t("notifications.unread")}</span>
                </span>
              ) : null}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
