import type { Channel } from "@hco/shared";
import { Mail, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

/** Small round channel marker that sits on the corner of an avatar. */
export function ChannelGlyph({ channel, className }: { channel: Channel; className?: string }) {
  const Icon = channel === "whatsapp" ? MessageCircle : Mail;
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex size-4 items-center justify-center rounded-full text-white ring-2 ring-card",
        channel === "whatsapp" ? "bg-channel-whatsapp" : "bg-channel-email",
        className,
      )}
    >
      <Icon className="size-2.5" strokeWidth={2.75} />
    </span>
  );
}
