import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Building2, KanbanSquare, Plug, Shuffle, Users, type LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/app/PageHeader";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";

interface SettingsNavItem {
  to: "/settings" | "/settings/users" | "/settings/channels" | "/settings/assignment" | "/settings/pipeline";
  labelKey: string;
  icon: LucideIcon;
}

const ITEMS: SettingsNavItem[] = [
  { to: "/settings", labelKey: "nav.workspace", icon: Building2 },
  { to: "/settings/users", labelKey: "nav.team", icon: Users },
  { to: "/settings/channels", labelKey: "nav.channels", icon: Plug },
  { to: "/settings/assignment", labelKey: "nav.assignment", icon: Shuffle },
  { to: "/settings/pipeline", labelKey: "nav.pipeline", icon: KanbanSquare },
];

function isCurrent(pathname: string, to: SettingsNavItem["to"]) {
  const path = pathname.replace(/\/$/, "");
  return to === "/settings" ? path === "/settings" : path === to || path.startsWith(`${to}/`);
}

/** Settings shell: side navigation on desktop, wrapping tabs on phones, the section on the end side. */
export function SettingsLayout() {
  const { t } = useTranslation("settings");
  const { workspace } = useSession();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="mx-auto w-full max-w-6xl pb-12">
      <PageHeader
        title={t("title")}
        description={
          <span className="hidden sm:inline">{t("description", { workspace: workspace.name })}</span>
        }
      />
      <div className="lg:grid lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-10 lg:px-8">
        <nav aria-label={t("navLabel")} className="lg:sticky lg:top-6 lg:self-start">
          {/* Wrap rather than scroll: a tab cut off at the screen edge reads as clipped on a phone. */}
          <ul className="flex flex-wrap gap-x-1 border-b px-4 sm:px-6 lg:flex-col lg:gap-0.5 lg:border-b-0 lg:px-0">
            {ITEMS.map((item) => {
              const current = isCurrent(pathname, item.to);
              const Icon = item.icon;
              return (
                <li key={item.to} className="shrink-0">
                  <Link
                    to={item.to}
                    aria-current={current ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-2.5 text-sm whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                      "-mb-px border-b-2 border-transparent px-2 py-3",
                      "lg:mb-0 lg:rounded-md lg:border-b-0 lg:px-3 lg:py-2 lg:hover:bg-card",
                      current &&
                        "border-primary font-medium text-foreground lg:bg-card lg:text-primary lg:shadow-xs lg:ring-1 lg:ring-border",
                    )}
                  >
                    <Icon className={cn("hidden size-4 shrink-0 lg:block", current && "text-primary")} />
                    {t(item.labelKey)}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="min-w-0 px-4 pt-6 sm:px-6 lg:px-0 lg:pt-0">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
