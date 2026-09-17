import { cn } from "@/lib/utils";

/** Hoplon shield mark. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className={cn("size-8 shrink-0", className)}>
      <rect width="64" height="64" rx="14" fill="#0F5F66" />
      <path
        d="M32 12c8 4 14 5 18 5v14c0 11-7 18-18 22-11-4-18-11-18-22V17c4 0 10-1 18-5z"
        fill="none"
        stroke="#F4F6F6"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <path d="M24 32h16M32 24v16" stroke="#E3A21A" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}
