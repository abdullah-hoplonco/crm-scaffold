import { useEffect, useState } from "react";
import { inWorkspaceTz } from "@/lib/format";

/** The current time, refreshed every `intervalMs` so "waiting 12 min" labels stay true. */
export function useNow(intervalMs = 60_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

export type DurationParts = { unit: "minutes" | "hours" | "days"; count: number };

/** A duration in the largest unit that reads naturally: 25 min, 5 h, 3 days. */
export function durationParts(ms: number): DurationParts {
  const minutes = Math.max(1, Math.floor(ms / 60_000));
  if (minutes < 60) return { unit: "minutes", count: minutes };
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return { unit: "hours", count: hours };
  return { unit: "days", count: Math.floor(hours / 24) };
}

export function partOfDay(now: Date): "morning" | "afternoon" | "evening" {
  const hour = inWorkspaceTz(now).getHours();
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  return "evening";
}

/** "Priya" from "Priya Nair"; keeps an honorific: "Dr. Hessa" from "Dr. Hessa Al Suwaidi". */
export function greetingName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  const [first = fullName, second] = parts;
  return /^dr\.?$/i.test(first) && second ? `${first} ${second}` : first;
}
