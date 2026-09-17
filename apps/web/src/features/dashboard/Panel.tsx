import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** A dashboard section: title, what the numbers cover, then the content. */
export function Panel({
  id,
  title,
  scope,
  children,
  className,
}: {
  id: string;
  title: string;
  scope?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      aria-labelledby={id}
      className={cn("flex min-w-0 flex-col rounded-xl border bg-card", className)}
    >
      <header className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 px-4 pt-4 sm:px-5 sm:pt-5">
        <h2 id={id} className="text-[15px] font-semibold">
          {title}
        </h2>
        {scope ? <p className="text-xs text-muted-foreground">{scope}</p> : null}
      </header>
      <div className="flex flex-1 flex-col px-4 pt-3 pb-4 sm:px-5 sm:pb-5">{children}</div>
    </section>
  );
}
