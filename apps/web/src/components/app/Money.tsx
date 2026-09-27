import { formatAed } from "@/lib/format";
import { cn } from "@/lib/utils";

/** PKR amount with tabular figures, e.g. PKR 185,000. */
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
