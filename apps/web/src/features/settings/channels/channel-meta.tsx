import type { ChannelConnection, ChannelConnectionType, ConnectionStatus } from "@hco/shared";
import { CircleAlert, FlaskConical, Hourglass, Mail, Megaphone, MessageCircle, Music2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { cn } from "@/lib/utils";

export type ConnectableType = Exclude<ChannelConnectionType, "simulator">;

const GLYPH = {
  whatsapp_cloud: {
    icon: MessageCircle,
    solid: "bg-channel-whatsapp text-white",
    soft: "text-channel-whatsapp",
  },
  meta_leadads: { icon: Megaphone, solid: "bg-channel-facebook text-white", soft: "text-channel-facebook" },
  tiktok_leads: { icon: Music2, solid: "bg-channel-tiktok text-white", soft: "text-channel-tiktok" },
  gmail: { icon: Mail, solid: "bg-channel-email text-white", soft: "text-channel-email" },
  simulator: { icon: FlaskConical, solid: "bg-primary text-primary-foreground", soft: "text-primary" },
} satisfies Record<ChannelConnectionType, { icon: typeof Mail; solid: string; soft: string }>;

/** Channel icon tile: filled in the channel colour when live, quiet when not. */
export function ChannelGlyph({
  type,
  live,
  size = "md",
}: {
  type: ChannelConnectionType;
  live: boolean;
  size?: "sm" | "md";
}) {
  const glyph = GLYPH[type];
  const Icon = glyph.icon;
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-lg",
        size === "md" ? "size-10" : "size-8",
        live ? glyph.solid : cn("border bg-muted", glyph.soft),
      )}
    >
      <Icon className={size === "md" ? "size-5" : "size-4"} />
    </span>
  );
}

export function StatusPill({
  status,
  className,
}: {
  status: ConnectionStatus | "not_connected" | "always_on";
  className?: string;
}) {
  const { t } = useTranslation("settings");
  const tone = {
    connected: "bg-success-soft text-success",
    always_on: "bg-success-soft text-success",
    pending: "bg-warning-soft text-[#6B4700]",
    error: "bg-danger-soft text-destructive",
    disconnected: "bg-muted text-muted-foreground",
    not_connected: "bg-muted text-muted-foreground",
  }[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        tone,
        className,
      )}
    >
      {status === "pending" ? (
        <Hourglass className="size-3" aria-hidden="true" />
      ) : status === "error" ? (
        <CircleAlert className="size-3" aria-hidden="true" />
      ) : (
        <span
          aria-hidden="true"
          className={cn(
            "size-1.5 rounded-full",
            status === "connected" || status === "always_on" ? "bg-success" : "bg-muted-foreground/60",
          )}
        />
      )}
      {t(`channels.status.${status}`)}
    </span>
  );
}

/** Small "Demo connection" marker used in every connect flow. */
export function DemoConnectionBadge() {
  const { t } = useTranslation("settings");
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-primary/40 bg-accent/50 px-2 py-0.5 text-[11px] font-medium text-accent-foreground">
      <FlaskConical className="size-3" aria-hidden="true" />
      {t("channels.demoConnection")}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Connection config (non-secret display settings stored with each connection)
// ---------------------------------------------------------------------------

const WhatsappConfig = z.object({
  displayPhone: z.string().optional(),
  verifiedName: z.string().optional(),
  qualityRating: z.string().optional(),
});
const MetaConfig = z.object({
  pageName: z.string().optional(),
  forms: z.number().optional(),
  formNames: z.array(z.string()).optional(),
  instagramHandle: z.string().optional(),
});
const TiktokConfig = z.object({ note: z.string().optional(), advertiserName: z.string().optional() });
const NoteConfig = z.object({ note: z.string().optional() });

function read<T extends z.ZodType>(
  schema: T,
  connection: ChannelConnection | undefined,
): Partial<z.output<T>> {
  const parsed = schema.safeParse(connection?.config ?? {});
  return parsed.success ? (parsed.data as Partial<z.output<T>>) : {};
}

export const whatsappConfig = (c: ChannelConnection | undefined) => read(WhatsappConfig, c);
export const metaConfig = (c: ChannelConnection | undefined) => read(MetaConfig, c);
export const tiktokConfig = (c: ChannelConnection | undefined) => read(TiktokConfig, c);
export const noteConfig = (c: ChannelConnection | undefined) => read(NoteConfig, c);

/** Meta reports WhatsApp number quality as GREEN / YELLOW / RED; people know it as high / medium / low. */
export function qualityTone(rating: string | undefined): { key: "high" | "medium" | "low"; dot: string } {
  switch (rating?.toUpperCase()) {
    case "YELLOW":
      return { key: "medium", dot: "bg-attention" };
    case "RED":
      return { key: "low", dot: "bg-destructive" };
    default:
      return { key: "high", dot: "bg-success" };
  }
}

/** A handle-like slug for demo Instagram accounts, e.g. "Al Waha Properties" → "alwahaproperties". */
export function handleFrom(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 24);
}
