import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";

const TONES = [
  "bg-[#DCEBEC] text-[#0B474C]",
  "bg-[#F6E7C8] text-[#6B4700]",
  "bg-[#E3E6F7] text-[#2E3E8F]",
  "bg-[#F3DCE6] text-[#7A2449]",
  "bg-[#E1EFE5] text-[#1C5A37]",
];

function toneFor(name: string) {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return TONES[hash % TONES.length];
}

export function UserAvatar({
  name,
  size = "md",
  className,
}: {
  name: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const label = name ?? "?";
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold",
        size === "sm" && "size-6 text-xs",
        size === "md" && "size-8 text-xs",
        size === "lg" && "size-11 text-sm",
        name ? toneFor(label) : "bg-muted text-muted-foreground",
        className,
      )}
    >
      {name ? initials(label) : "–"}
    </span>
  );
}
