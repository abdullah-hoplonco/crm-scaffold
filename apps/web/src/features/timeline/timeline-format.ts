import { differenceInCalendarDays, format } from "date-fns";
import { inWorkspaceTz } from "@/lib/format";

/** Day key in the workspace timezone, used to group timeline entries. */
export function dayKey(iso: string): string {
  return format(inWorkspaceTz(iso), "yyyy-MM-dd");
}

/** "Today", "Yesterday", "Tuesday 15 September" or "15 September 2025". */
export function dayHeading(
  iso: string,
  labels: { today: string; yesterday: string },
  now = new Date(),
): string {
  const date = inWorkspaceTz(iso);
  const today = inWorkspaceTz(now);
  const diff = differenceInCalendarDays(today, date);
  if (diff === 0) return labels.today;
  if (diff === 1) return labels.yesterday;
  if (date.getFullYear() !== today.getFullYear()) return format(date, "d MMMM yyyy");
  return format(date, "EEEE d MMMM");
}

/** "14:05" in the workspace timezone. */
export function timeOfDay(iso: string): string {
  return format(inWorkspaceTz(iso), "HH:mm");
}
