import { cn } from "@/lib/utils";

const LEGAL_WORDS = /\b(llc|l\.l\.c|fz-?llc|fze|fzco|ltd|limited|group|trading|co|plc|inc)\b\.?/gi;

/** "Gulf Horizon Logistics LLC" → "GH". Legal suffixes are skipped. */
export function companyInitials(name: string): string {
  const words = name
    .replace(LEGAL_WORDS, " ")
    .split(/\s+/)
    .filter((w) => /[\p{L}\p{N}]/u.test(w));
  return ((words[0]?.[0] ?? "") + (words[1]?.[0] ?? "")).toUpperCase() || "?";
}

/** Square initials tile for a company (people get round avatars). */
export function CompanyMark({
  name,
  size = "md",
  className,
}: {
  name: string;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center justify-center border border-primary/15 bg-accent font-semibold text-accent-foreground",
        size === "xs" && "size-5 rounded-[5px] text-xs",
        size === "sm" && "size-7 rounded-md text-xs",
        size === "md" && "size-9 rounded-md text-xs",
        size === "lg" && "size-14 rounded-lg text-base",
        className,
      )}
    >
      {companyInitials(name)}
    </span>
  );
}
