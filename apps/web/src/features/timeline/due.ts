import { TZDate } from "@date-fns/tz";
import { differenceInCalendarDays, format } from "date-fns";
import { formatDuration, inWorkspaceTz, WORKSPACE_TZ } from "@/lib/format";

/** A wall-clock time on a calendar day in Dubai, as an ISO timestamp. */
export function dubaiAt(
  day: { year: number; month: number; date: number },
  hours: number,
  minutes = 0,
): string {
  return new TZDate(day.year, day.month, day.date, hours, minutes, WORKSPACE_TZ).toISOString();
}

function dubaiDay(offsetDays: number, now = new Date()) {
  const today = inWorkspaceTz(now);
  const d = new TZDate(today.getFullYear(), today.getMonth(), today.getDate() + offsetDays, WORKSPACE_TZ);
  return { year: d.getFullYear(), month: d.getMonth(), date: d.getDate() };
}

export function todayAtFive(now = new Date()): string {
  return dubaiAt(dubaiDay(0, now), 17);
}

/** The "Today 5 pm" preset makes no sense after 5 pm in Dubai. */
export function isPastFiveToday(now = new Date()): boolean {
  return new Date(todayAtFive(now)).getTime() <= now.getTime();
}

export function tomorrowAtTen(now = new Date()): string {
  return dubaiAt(dubaiDay(1, now), 10);
}

/** A calendar day picked in the browser plus "HH:mm", read as Dubai time. */
export function pickedDue(date: Date, time: string): string {
  const [h = 10, m = 0] = time.split(":").map(Number);
  return dubaiAt({ year: date.getFullYear(), month: date.getMonth(), date: date.getDate() }, h, m);
}

/** "Mon 21 Sep, 10:00" in Dubai time. */
export function formatDueShort(iso: string): string {
  return format(inWorkspaceTz(iso), "EEE d MMM, HH:mm");
}

export type DueLabel =
  { kind: "overdue"; text: string } | { kind: "today" | "tomorrow" | "soon" | "later"; text: string };

/** How a due time reads in a task list: overdue by how long, or when in Dubai time. */
export function describeDue(
  dueAt: string,
  labels: {
    overdueDays: (days: number) => string;
    overdueFor: (duration: string) => string;
    today: (time: string) => string;
    tomorrow: (time: string) => string;
  },
  now = new Date(),
): DueLabel {
  const due = inWorkspaceTz(dueAt);
  const ms = now.getTime() - due.getTime();
  if (ms > 0) {
    const days = Math.floor(ms / 86_400_000);
    return {
      kind: "overdue",
      text: days >= 1 ? labels.overdueDays(days) : labels.overdueFor(formatDuration(ms)),
    };
  }
  const time = format(due, "HH:mm");
  const diff = differenceInCalendarDays(due, inWorkspaceTz(now));
  if (diff === 0) return { kind: "today", text: labels.today(time) };
  if (diff === 1) return { kind: "tomorrow", text: labels.tomorrow(time) };
  if (diff < 7) return { kind: "soon", text: `${format(due, "EEE")}, ${time}` };
  return { kind: "later", text: `${format(due, "d MMM")}, ${time}` };
}
