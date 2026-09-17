/**
 * Calendar boundaries in a workspace timezone (e.g. Asia/Dubai) without a date library. Reports count
 * "today" and "this month" the way the business sees them, not in UTC.
 */

const DAY_MS = 86_400_000;

interface WallClock {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

function wallClock(at: Date, timeZone: string): WallClock {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  }).formatToParts(at);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value ?? "0");
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
  };
}

/** Offset of the timezone from UTC at an instant, in ms (Asia/Dubai: +4 h). */
function offsetMs(at: Date, timeZone: string): number {
  const w = wallClock(at, timeZone);
  const asUtc = Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, w.second);
  return asUtc - Math.floor(at.getTime() / 1000) * 1000;
}

/** The UTC instant of a wall-clock time in the timezone. */
function zonedInstant(year: number, month: number, day: number, timeZone: string): Date {
  const guess = Date.UTC(year, month - 1, day);
  const first = guess - offsetMs(new Date(guess), timeZone);
  // Re-check at the candidate instant so a DST change between the two points is respected.
  return new Date(guess - offsetMs(new Date(first), timeZone));
}

/** Midnight at the start of the calendar day containing `at`, in the timezone. */
export function startOfZonedDay(at: Date, timeZone: string): Date {
  const w = wallClock(at, timeZone);
  return zonedInstant(w.year, w.month, w.day, timeZone);
}

/** Midnight at the end of the calendar day containing `at` (exclusive upper bound). */
export function endOfZonedDay(at: Date, timeZone: string): Date {
  const start = startOfZonedDay(at, timeZone);
  return startOfZonedDay(new Date(start.getTime() + DAY_MS + 6 * 3_600_000), timeZone);
}

/** Midnight on the first day of the calendar month containing `at`, in the timezone. */
export function startOfZonedMonth(at: Date, timeZone: string): Date {
  const w = wallClock(at, timeZone);
  return zonedInstant(w.year, w.month, 1, timeZone);
}

/** Start of a rolling period of `days` ending at `now`. */
export function periodStart(now: Date, days: number): Date {
  return new Date(now.getTime() - days * DAY_MS);
}
