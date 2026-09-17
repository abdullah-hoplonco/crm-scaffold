import type { SimulationResult } from "@hco/shared/api/demo";
import { useSyncExternalStore } from "react";

/**
 * What the presenter did in this window: the simulated events log and which rep window they opened.
 * Kept in sessionStorage so it survives navigating around the app, but never shared with other windows.
 */

export interface DemoLogEntry extends SimulationResult {
  id: string;
  at: string;
}

interface DemoSession {
  entries: DemoLogEntry[];
  /** Email of the rep whose window was opened last, for the "Try this" script. */
  openedRepEmail: string | null;
}

const KEY = "hco-crm:demo-panel";
const MAX_ENTRIES = 40;
const EMPTY: DemoSession = { entries: [], openedRepEmail: null };

const listeners = new Set<() => void>();
let current: DemoSession = read();
/** Ids logged in the last few seconds, so only new entries animate in. */
const freshIds = new Set<string>();

function read(): DemoSession {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<DemoSession>;
    return {
      entries: Array.isArray(parsed.entries) ? parsed.entries : [],
      openedRepEmail: typeof parsed.openedRepEmail === "string" ? parsed.openedRepEmail : null,
    };
  } catch {
    return EMPTY;
  }
}

function write(next: DemoSession) {
  current = next;
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage blocked: the log still works in memory for this page load.
  }
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useDemoSession(): DemoSession {
  return useSyncExternalStore(subscribe, () => current);
}

export function logSimulations(results: SimulationResult[]) {
  const at = new Date().toISOString();
  const added = results.map((result, i) => ({
    ...result,
    id: `${at}-${i}-${Math.random().toString(36).slice(2, 7)}`,
    at,
  }));
  for (const entry of added) freshIds.add(entry.id);
  window.setTimeout(() => {
    for (const entry of added) freshIds.delete(entry.id);
  }, 4000);
  write({ ...current, entries: [...added.reverse(), ...current.entries].slice(0, MAX_ENTRIES) });
}

export function isFreshEntry(id: string): boolean {
  return freshIds.has(id);
}

export function clearDemoLog() {
  write({ ...current, entries: [] });
}

export function rememberOpenedRep(email: string) {
  write({ ...current, openedRepEmail: email });
}
