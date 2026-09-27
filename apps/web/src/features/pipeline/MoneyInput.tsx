import { MoneyAed } from "@hco/shared";
import type { ComponentProps } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** "185,000", "Rs. 185,000" or "1 250.50" → "185000" / "1250.50"; null when it isn't an amount. */
export function parseAedInput(raw: string): string | null {
  const cleaned = raw.replace(/[\s,]/g, "").replace(/^(PKR|Rs\.?)/i, "");
  return MoneyAed.safeParse(cleaned).success && !cleaned.startsWith("-") ? cleaned : null;
}

/** Amount field with a fixed PKR prefix. */
export function MoneyInput({
  className,
  ...props
}: Omit<ComponentProps<typeof Input>, "type" | "inputMode">) {
  return (
    <div className={cn("relative", className)}>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground"
      >
        PKR
      </span>
      <Input type="text" inputMode="decimal" autoComplete="off" className="ps-12 tabular-nums" {...props} />
    </div>
  );
}
