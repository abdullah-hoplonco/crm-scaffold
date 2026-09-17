import { api } from "@hco/shared";
import { Lock, MessagesSquare, Timer } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useApiQuery } from "@/lib/api/hooks";

/** Desktop right pane when no conversation is open. */
export function InboxHome() {
  const { t } = useTranslation("inbox");
  const list = useApiQuery(api.inbox.list, { query: { filter: "all" } });
  const unread = list.data?.unreadTotal ?? 0;

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-background px-8 text-center">
      <span className="mb-4 inline-flex size-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
        <MessagesSquare aria-hidden="true" className="size-7" />
      </span>
      <h2 className="text-lg font-semibold">{t("home.title")}</h2>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        {unread > 0 ? t("home.waiting", { count: unread }) : t("home.caughtUp")}
      </p>
      <ul className="mt-8 grid max-w-md gap-3 text-start text-sm">
        <li className="flex gap-3">
          <Timer aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-channel-whatsapp" />
          <span className="text-muted-foreground">{t("home.windowHint")}</span>
        </li>
        <li className="flex gap-3">
          <Lock aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-warning" />
          <span className="text-muted-foreground">{t("home.templateHint")}</span>
        </li>
      </ul>
    </div>
  );
}
