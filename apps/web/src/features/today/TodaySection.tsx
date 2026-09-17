import { ChevronDown, type LucideIcon } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { durationParts } from "./time";

/** One block of the Today list: an icon, a title with its count, then rows separated by hairlines. */
export function TodaySection({
  id,
  icon: Icon,
  title,
  count,
  tone = "default",
  children,
  className,
}: {
  id: string;
  icon: LucideIcon;
  title: string;
  count: number;
  tone?: "default" | "attention";
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className={cn("scroll-mt-4 overflow-hidden rounded-xl border bg-card", className)}
    >
      <header className="flex items-center gap-2.5 border-b px-4 py-3">
        <span
          className={cn(
            "flex size-7 items-center justify-center rounded-full",
            tone === "attention" ? "bg-warning-soft text-warning" : "bg-accent text-accent-foreground",
          )}
        >
          <Icon className="size-3.5" aria-hidden="true" />
        </span>
        <h2 id={`${id}-title`} className="text-sm font-semibold">
          {title}
        </h2>
        <span className="ms-auto rounded-full bg-muted px-2 py-0.5 text-xs font-semibold tabular-nums">
          {count}
        </span>
      </header>
      {children}
    </section>
  );
}

/** "25 min", "5 h", "3 days" */
export function useDurationLabel() {
  const { t } = useTranslation("dashboard");
  return (ms: number) => {
    const { unit, count } = durationParts(ms);
    return t(`duration.${unit}`, { count });
  };
}

/** Long lists (an owner sees everyone's replies) start short on a phone-sized screen. */
const COLLAPSED_ROWS = 5;

export function useCollapsedList<T>(items: T[]) {
  const [expanded, setExpanded] = useState(false);
  const hidden = expanded ? 0 : Math.max(0, items.length - COLLAPSED_ROWS);
  return {
    visible: hidden ? items.slice(0, COLLAPSED_ROWS) : items,
    hidden,
    expand: () => setExpanded(true),
  };
}

export function ShowMoreButton({ hidden, onClick }: { hidden: number; onClick: () => void }) {
  const { t } = useTranslation("dashboard");
  if (!hidden) return null;
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-center gap-1.5 border-t px-4 py-2.5 text-sm font-medium text-primary hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset"
    >
      {t("today.showMore", { count: hidden })}
      <ChevronDown className="size-4" aria-hidden="true" />
    </button>
  );
}
