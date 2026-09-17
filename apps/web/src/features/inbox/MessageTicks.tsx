import type { MessageStatus } from "@hco/shared";
import { AlertCircle, Check, CheckCheck, Clock3 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

/** Delivery ticks for outbound WhatsApp messages: sent ✓, delivered ✓✓, read ✓✓ in teal, failed in red. */
export function MessageTicks({ status, className }: { status: MessageStatus; className?: string }) {
  const { t } = useTranslation("inbox");
  const label = t(`status.${status}`);
  const common = cn("size-3.5 shrink-0", className);
  switch (status) {
    case "queued":
      return <Clock3 role="img" aria-label={label} className={cn(common, "size-3 text-muted-foreground")} />;
    case "sent":
      return <Check role="img" aria-label={label} className={cn(common, "text-muted-foreground")} />;
    case "delivered":
      return <CheckCheck role="img" aria-label={label} className={cn(common, "text-muted-foreground")} />;
    case "read":
      return <CheckCheck role="img" aria-label={label} className={cn(common, "text-primary")} strokeWidth={2.5} />;
    case "failed":
      return <AlertCircle role="img" aria-label={label} className={cn(common, "text-destructive")} />;
  }
}
