import { api } from "@hco/shared";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Building2,
  CalendarCheck,
  FlaskConical,
  Inbox,
  KanbanSquare,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { NotificationBell } from "@/features/notifications/NotificationBell";
import { useApiQuery } from "@/lib/api/hooks";
import { useSession, useSignOut } from "@/lib/session";
import { cn } from "@/lib/utils";
import { BrandMark } from "./BrandMark";
import { UserAvatar } from "./UserAvatar";

interface NavItem {
  to: string;
  labelKey: string;
  icon: LucideIcon;
  roles?: Array<"owner" | "manager" | "rep">;
  badge?: "inbox" | "leads";
}

const PRIMARY: NavItem[] = [
  { to: "/today", labelKey: "nav.today", icon: CalendarCheck },
  { to: "/dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard, roles: ["owner", "manager"] },
  { to: "/leads", labelKey: "nav.leads", icon: UserPlus, badge: "leads" },
  { to: "/inbox", labelKey: "nav.inbox", icon: Inbox, badge: "inbox" },
  { to: "/pipeline", labelKey: "nav.pipeline", icon: KanbanSquare },
  { to: "/contacts", labelKey: "nav.contacts", icon: Users },
  { to: "/companies", labelKey: "nav.companies", icon: Building2 },
];

const SECONDARY: NavItem[] = [
  { to: "/settings", labelKey: "nav.settings", icon: Settings },
  { to: "/dev/demo", labelKey: "nav.demo", icon: FlaskConical, roles: ["owner", "manager"] },
];

const MOBILE_TABS = ["/today", "/leads", "/inbox", "/pipeline"];

function useBadges() {
  const inbox = useApiQuery(
    api.inbox.list,
    { query: { filter: "all" } },
    { retry: false, refetchOnWindowFocus: false },
  );
  const leads = useApiQuery(
    api.leads.list,
    { query: { status: "new", limit: 1 } },
    { retry: false, refetchOnWindowFocus: false },
  );
  return { inbox: inbox.data?.unreadTotal ?? 0, leads: leads.data?.total ?? 0 };
}

function isActive(pathname: string, to: string) {
  return pathname === to || pathname.startsWith(`${to}/`);
}

function Badge({ count, tone = "attention" }: { count: number; tone?: "attention" | "inverse" }) {
  if (!count) return null;
  return (
    <span
      className={cn(
        "ms-auto inline-flex min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold tabular-nums",
        tone === "attention" ? "bg-attention text-[#2B1D00]" : "bg-primary text-primary-foreground",
      )}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

function RailLink({ item, pathname, badge }: { item: NavItem; pathname: string; badge: number }) {
  const { t } = useTranslation();
  const active = isActive(pathname, item.to);
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      className={cn(
        "group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground transition-colors",
        "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-primary focus-visible:outline-none",
        active && "bg-sidebar-accent font-medium text-sidebar-accent-foreground",
      )}
      aria-current={active ? "page" : undefined}
    >
      <span
        aria-hidden="true"
        className={cn(
          "absolute top-1.5 bottom-1.5 start-0 w-0.5 rounded-full bg-sidebar-primary opacity-0",
          active && "opacity-100",
        )}
      />
      <Icon className="size-4 shrink-0 text-sidebar-muted group-hover:text-sidebar-accent-foreground" />
      <span className="truncate">{t(item.labelKey)}</span>
      <Badge count={badge} />
    </Link>
  );
}

function UserMenu({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation();
  const { user, workspace } = useSession();
  const signOut = useSignOut();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex min-w-0 items-center gap-2 rounded-md text-start focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
            compact ? "p-1" : "w-full px-2 py-2 text-sidebar-foreground hover:bg-sidebar-accent",
          )}
          aria-label={user.name}
        >
          <UserAvatar name={user.name} />
          {compact ? null : (
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-sidebar-accent-foreground">
                {user.name}
              </span>
              <span className="block truncate text-xs text-sidebar-muted">{t(`roles.${user.role}`)}</span>
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={compact ? "end" : "start"} className="w-60">
        <DropdownMenuLabel className="font-normal">
          <span className="block font-medium">{user.name}</span>
          <span className="block text-xs text-muted-foreground">{user.email}</span>
          <span className="mt-1 block text-xs text-muted-foreground">{workspace.name}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void signOut()}>
          <LogOut className="size-4" />
          {t("nav.signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const { user, workspace } = useSession();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const badges = useBadges();
  const [moreOpen, setMoreOpen] = useState(false);
  const allowed = (item: NavItem) => !item.roles || item.roles.includes(user.role);
  const badgeFor = (item: NavItem) => (item.badge ? badges[item.badge] : 0);

  return (
    <div className="flex h-dvh min-h-0 bg-background">
      {/* Desktop navigation rail */}
      <aside className="hidden w-60 shrink-0 flex-col bg-sidebar lg:flex">
        <div className="flex items-center gap-2.5 px-4 pt-5 pb-4">
          <BrandMark />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-sidebar-accent-foreground">{t("appName")}</p>
            <p className="truncate text-xs text-sidebar-muted" title={workspace.name}>
              {workspace.name}
            </p>
          </div>
        </div>
        <nav aria-label="Main" className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2">
          {PRIMARY.filter(allowed).map((item) => (
            <RailLink key={item.to} item={item} pathname={pathname} badge={badgeFor(item)} />
          ))}
          <div className="my-3 border-t border-sidebar-border" />
          {SECONDARY.filter(allowed).map((item) => (
            <RailLink key={item.to} item={item} pathname={pathname} badge={0} />
          ))}
        </nav>
        <div className="border-t border-sidebar-border p-2">
          <UserMenu />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-card px-3 sm:px-4 lg:px-6">
          <div className="flex min-w-0 items-center gap-2 lg:hidden">
            <BrandMark className="size-7" />
            <span className="truncate text-sm font-semibold">{t("appName")}</span>
          </div>
          <div className="ms-auto flex items-center gap-1">
            <span className="hidden rounded-full border border-dashed px-2.5 py-0.5 text-xs text-muted-foreground sm:inline">
              {t("states.demoData")}
            </span>
            <NotificationBell />
            <div className="lg:hidden">
              <UserMenu compact />
            </div>
          </div>
        </header>

        <main
          id="main"
          className="min-h-0 flex-1 overflow-y-auto pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-0"
        >
          {children}
        </main>

        {/* Mobile tab bar */}
        <nav
          aria-label="Main"
          className="fixed inset-x-0 bottom-0 z-40 border-t bg-card pb-[env(safe-area-inset-bottom)] lg:hidden"
        >
          <ul className="grid grid-cols-5">
            {PRIMARY.filter((i) => MOBILE_TABS.includes(i.to)).map((item) => {
              const active = isActive(pathname, item.to);
              const Icon = item.icon;
              const count = badgeFor(item);
              return (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    className={cn(
                      "relative flex h-16 flex-col items-center justify-center gap-1 text-xs text-muted-foreground",
                      active && "font-medium text-primary",
                    )}
                    aria-current={active ? "page" : undefined}
                  >
                    <span className="relative">
                      <Icon className="size-5" />
                      {count ? (
                        <span className="absolute -top-1.5 -end-2.5 min-w-4 rounded-full bg-attention px-1 text-center text-[11px] leading-4 font-semibold text-[#2B1D00] tabular-nums">
                          {count > 99 ? "99+" : count}
                        </span>
                      ) : null}
                    </span>
                    {t(item.labelKey)}
                  </Link>
                </li>
              );
            })}
            <li>
              <button
                type="button"
                onClick={() => setMoreOpen(true)}
                className="flex h-16 w-full flex-col items-center justify-center gap-1 text-xs text-muted-foreground"
              >
                <Menu className="size-5" />
                {t("nav.more")}
              </button>
            </li>
          </ul>
        </nav>
        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetContent side="bottom" className="rounded-t-xl pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <SheetHeader>
              <SheetTitle>{workspace.name}</SheetTitle>
            </SheetHeader>
            <ul className="grid gap-1 px-4">
              {[...PRIMARY.filter((i) => !MOBILE_TABS.includes(i.to)), ...SECONDARY]
                .filter(allowed)
                .map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.to}>
                      <Button
                        asChild
                        variant="ghost"
                        className="h-11 w-full justify-start gap-3"
                        onClick={() => setMoreOpen(false)}
                      >
                        <Link to={item.to}>
                          <Icon className="size-4" />
                          {t(item.labelKey)}
                        </Link>
                      </Button>
                    </li>
                  );
                })}
            </ul>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
