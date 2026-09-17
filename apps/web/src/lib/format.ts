import { TZDate } from "@date-fns/tz";
import { formatAed, formatPhone } from "@hco/core";
import { differenceInCalendarDays, format, formatDistanceToNowStrict, isSameDay } from "date-fns";

export { formatAed, formatPhone };

/** All dates are stored in UTC and shown in the workspace timezone. */
export const WORKSPACE_TZ = "Asia/Dubai";

export function inWorkspaceTz(iso: string | Date): TZDate {
  return new TZDate(typeof iso === "string" ? new Date(iso) : iso, WORKSPACE_TZ);
}

/** "14:05" today, "Yesterday", "Tue", or "12 Sep" — for lists. */
export function formatListTime(iso: string, now = new Date()): string {
  const d = inWorkspaceTz(iso);
  const n = inWorkspaceTz(now);
  if (isSameDay(d, n)) return format(d, "HH:mm");
  const days = differenceInCalendarDays(n, d);
  if (days === 1) return "Yesterday";
  if (days < 7 && days > 0) return format(d, "EEE");
  return format(d, "d MMM");
}

/** "17 Sep 2026, 14:05" */
export function formatDateTime(iso: string): string {
  return format(inWorkspaceTz(iso), "d MMM yyyy, HH:mm");
}

/** "17 Sep 2026" for timestamps or YYYY-MM-DD dates. */
export function formatDate(value: string): string {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00Z`) : new Date(value);
  return format(inWorkspaceTz(date), "d MMM yyyy");
}

/** "5 min ago", "3 days ago" */
export function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff >= 0 && diff < 45_000) return "just now";
  return formatDistanceToNowStrict(new Date(iso), { addSuffix: true });
}

/** "2 h 14 min" for a duration in ms. */
export function formatDuration(ms: number): string {
  const totalMinutes = Math.max(0, Math.floor(ms / 60_000));
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

export function initials(name: string): string {
  const parts = name
    .replace(/^Dr\.\s+/i, "")
    .trim()
    .split(/\s+/);
  return (
    (parts[0]?.[0] ?? "") + (parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "")
  ).toUpperCase();
}
