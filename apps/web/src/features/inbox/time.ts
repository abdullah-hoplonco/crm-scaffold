import { roundDuration } from "@hco/core/leads/speed";
import { differenceInCalendarDays, format } from "date-fns";
import type { TFunction } from "i18next";
import { inWorkspaceTz } from "@/lib/format";

/** Calendar day in Dubai, used to group messages. */
export function dubaiDayKey(iso: string): string {
  return format(inWorkspaceTz(iso), "yyyy-MM-dd");
}

/** "14:05" in Dubai time. */
export function clockTime(iso: string): string {
  return format(inWorkspaceTz(iso), "HH:mm");
}

/** "Today", "Yesterday", "Tuesday", or "Tue 8 September" for day separators. */
export function dayLabel(iso: string, now: Date, t: TFunction): string {
  const day = inWorkspaceTz(iso);
  const today = inWorkspaceTz(now);
  const days = differenceInCalendarDays(today, day);
  if (days === 0) return t("common:time.today");
  if (days === 1) return t("common:time.yesterday");
  if (days > 1 && days < 7) return format(day, "EEEE");
  return format(day, day.getFullYear() === today.getFullYear() ? "EEE d MMMM" : "EEE d MMMM yyyy");
}

/** "8 min", "2 h", "3 days" via i18n plurals (keys duration.minute / hour / day in the inbox namespace). */
export function shortDuration(ms: number, t: TFunction): string {
  const { unit, value } = roundDuration(ms);
  return t(`inbox:duration.${unit}`, { count: value });
}
