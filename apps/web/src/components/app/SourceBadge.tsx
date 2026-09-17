import type { LeadSource } from "@hco/shared";
import { FileSpreadsheet, Mail, MessageCircle, PenLine } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

const DOT: Record<LeadSource, string> = {
  whatsapp: "bg-channel-whatsapp",
  instagram: "bg-channel-instagram",
  facebook: "bg-channel-facebook",
  tiktok: "bg-channel-tiktok",
  email: "bg-channel-email",
  manual: "bg-channel-manual",
  csv: "bg-channel-csv",
};

function Glyph({ source }: { source: LeadSource }) {
  const cls = "size-3";
  switch (source) {
    case "whatsapp":
      return <MessageCircle className={cls} />;
    case "email":
      return <Mail className={cls} />;
    case "csv":
      return <FileSpreadsheet className={cls} />;
    case "manual":
      return <PenLine className={cls} />;
    default:
      return <span className={cn("size-2 rounded-full", DOT[source])} />;
  }
}

/** Where a lead or deal came from, with its channel colour. */
export function SourceBadge({
  source,
  className,
  compact = false,
}: {
  source: LeadSource;
  className?: string;
  compact?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border bg-card px-2 py-0.5 text-xs font-medium text-foreground/80",
        className,
      )}
      title={t(`sources.${source}`)}
    >
      <span
        className={cn(
          "inline-flex items-center",
          source === "whatsapp" && "text-channel-whatsapp",
          source === "email" && "text-channel-email",
          source === "manual" && "text-channel-manual",
          source === "csv" && "text-channel-csv",
        )}
      >
        <Glyph source={source} />
      </span>
      {compact ? null : t(`sources.${source}`)}
    </span>
  );
}

export function sourceColorClass(source: LeadSource) {
  return DOT[source];
}
