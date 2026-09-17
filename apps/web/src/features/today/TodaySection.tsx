import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
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
        <h2 id={`${id}-title`} className="text-[15px] font-semibold">
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
