import { formatAed } from "@/lib/format";
import { cn } from "@/lib/utils";

/** AED amount with tabular figures, e.g. AED 18,500. */
export function Money({
  value,
  compact,
  className,
}: {
  value: string;
  compact?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("tabular-nums whitespace-nowrap", className)}>{formatAed(value, { compact })}</span>
  );
}
