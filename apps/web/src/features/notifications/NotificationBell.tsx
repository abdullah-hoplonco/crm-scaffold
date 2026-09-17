import { api, type Notification } from "@hco/shared";
import { useNavigate } from "@tanstack/react-router";
import { Bell, CheckCheck, X } from "lucide-react";
import { useState, useSyncExternalStore, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { errorMessage } from "@/lib/api/errors";
import { useApiMutation, useApiQuery } from "@/lib/api/hooks";
import { NotificationList } from "./NotificationList";

const DESKTOP_QUERY = "(min-width: 640px)";

function useIsDesktop(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const media = window.matchMedia(DESKTOP_QUERY);
      media.addEventListener("change", onChange);
      return () => media.removeEventListener("change", onChange);
    },
    () => window.matchMedia(DESKTOP_QUERY).matches,
    () => true,
  );
}

/** Top-bar bell: unread count, recent notifications, open one to read it. Live events keep it fresh. */
export function NotificationBell() {
  const { t } = useTranslation("dashboard");
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();
  const [open, setOpen] = useState(false);
  const notifications = useApiQuery(api.dashboard.notifications, {}, { refetchOnWindowFocus: true });
  const markRead = useApiMutation(api.dashboard.markNotificationsRead, {
    onError: (error) => toast.error(errorMessage(error)),
  });

  const unread = notifications.data?.unreadCount ?? 0;

  const openNotification = (n: Notification) => {
    setOpen(false);
    if (!n.readAt) markRead.mutate({ body: { ids: [n.id] } });
    if (n.href) void navigate({ to: n.href });
  };
  const markAllRead = () =>
    markRead.mutate({ body: {} }, { onSuccess: () => toast(t("notifications.allRead")) });

  const trigger = (
    <Button
      variant="ghost"
      size="icon"
      className="relative"
      aria-label={unread ? t("notifications.bellUnread", { count: unread }) : t("notifications.bell")}
    >
      <Bell className="size-5" />
      {unread ? (
        <span
          aria-hidden="true"
          className="absolute top-1 end-1 min-w-4 rounded-full bg-attention px-1 text-center text-[10px] leading-4 font-semibold text-[#2B1D00] tabular-nums ring-2 ring-card"
        >
          {unread > 99 ? "99+" : unread}
        </span>
      ) : null}
    </Button>
  );

  const header = (title: ReactNode, close?: ReactNode) => (
    <div className="flex items-center gap-2">
      {title}
      <Button
        variant="ghost"
        size="sm"
        className="ms-auto h-7 px-2 text-xs"
        onClick={markAllRead}
        disabled={unread === 0 || markRead.isPending}
      >
        <CheckCheck className="size-3.5" />
        {t("notifications.markAllRead")}
      </Button>
      {close}
    </div>
  );

  const list = (
    <NotificationList
      items={notifications.data?.items}
      isPending={notifications.isPending}
      error={notifications.error}
      onRetry={() => void notifications.refetch()}
      onOpen={openNotification}
    />
  );

  if (isDesktop) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>{trigger}</PopoverTrigger>
        <PopoverContent align="end" sideOffset={8} className="w-[380px] overflow-hidden p-0">
          <div className="border-b px-4 py-2.5">
            {header(<h2 className="text-sm font-semibold">{t("notifications.title")}</h2>)}
          </div>
          <div className="max-h-[min(480px,70dvh)] overflow-y-auto">{list}</div>
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent
        side="bottom"
        className="max-h-[85dvh] gap-0 rounded-t-xl pb-[env(safe-area-inset-bottom)]"
        showCloseButton={false}
      >
        <SheetHeader className="border-b px-4 py-3">
          {header(
            <SheetTitle className="text-base">{t("notifications.title")}</SheetTitle>,
            <SheetClose asChild>
              <Button variant="ghost" size="icon-sm" aria-label={t("notifications.close")}>
                <X className="size-4" />
              </Button>
            </SheetClose>,
          )}
          <SheetDescription className="sr-only">{t("notifications.description")}</SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto">{list}</div>
      </SheetContent>
    </Sheet>
  );
}
