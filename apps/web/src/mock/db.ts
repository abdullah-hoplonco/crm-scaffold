import { buildDemoDataset } from "@hco/demo-data";
import type { Tables } from "@hco/shared";

/**
 * The showcase "database": every table in one JSON document in localStorage, so all tabs of the
 * same browser share it (the demo control panel in one window, the rep in another).
 */
export interface MockState {
  version: 1;
  /** When the dataset's timestamps were last aligned with the clock. */
  anchoredAt: string;
  tables: Tables;
  /** Signed-in user of the current request. Persisted per tab (see session.ts), never in shared storage. */
  sessionUserId: string | null;
}

const DATA_KEY = "hco-crm:mock-db:v1";
const REV_KEY = "hco-crm:mock-db:rev";
/** A returning visitor after this long gets the story shifted forward so "today" still looks like today. */
const REANCHOR_AFTER_MS = 6 * 60 * 60 * 1000;

let memory: { rev: string | null; state: MockState } | null = null;

function storage(): Storage | null {
  try {
    const s = window.localStorage;
    s.getItem(REV_KEY);
    return s;
  } catch {
    return null;
  }
}

export function freshState(now = new Date(), sessionUserId: string | null = null): MockState {
  return { version: 1, anchoredAt: now.toISOString(), tables: buildDemoDataset({ now }), sessionUserId };
}

/** Current state (a shared, read-only reference: clone before mutating). */
export function loadState(): MockState {
  const s = storage();
  const rev = s?.getItem(REV_KEY) ?? null;
  if (memory && memory.rev === rev) return memory.state;
  if (s) {
    try {
      const raw = s.getItem(DATA_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as MockState;
        if (parsed.version === 1) {
          memory = { rev, state: reanchor(parsed) };
          if (memory.state !== parsed) saveState(memory.state);
          return memory.state;
        }
      }
    } catch {
      // Corrupt or unreadable: fall through to a fresh dataset.
    }
  }
  if (memory) return memory.state;
  const state = freshState();
  saveState(state);
  return state;
}

export function saveState(state: MockState): void {
  const s = storage();
  const rev = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  memory = { rev: s ? rev : null, state };
  if (!s) return;
  try {
    s.setItem(DATA_KEY, JSON.stringify(state));
    s.setItem(REV_KEY, rev);
  } catch {
    // Storage full or blocked: keep working in memory for this tab.
    memory = { rev: s.getItem(REV_KEY), state };
  }
}

/**
 * Fresh demo tables for a reset. Returns the new tables and the id of the user with the same email as
 * `currentUserId` so the person who pressed reset stays signed in.
 */
export function freshTablesKeepingUser(current: MockState, currentUserId: string | null) {
  const email = current.tables.users.find((u) => u.id === currentUserId)?.email ?? null;
  const next = freshState();
  const userId = next.tables.users.find((u) => u.email === email)?.id ?? null;
  return { tables: next.tables, userId };
}

const ISO_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;
const DATE_ONLY_KEYS = new Set(["expectedCloseDate", "validUntil"]);

function reanchor(state: MockState): MockState {
  const now = Date.now();
  const delta = now - new Date(state.anchoredAt).getTime();
  if (delta < REANCHOR_AFTER_MS) return state;
  const dayShift = Math.round(delta / 86_400_000) * 86_400_000;
  const shift = (value: unknown, key: string | null): unknown => {
    if (typeof value === "string") {
      if (ISO_DATETIME.test(value)) return new Date(new Date(value).getTime() + delta).toISOString();
      if (key && DATE_ONLY_KEYS.has(key) && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return new Date(new Date(`${value}T00:00:00Z`).getTime() + dayShift).toISOString().slice(0, 10);
      }
      return value;
    }
    if (Array.isArray(value)) return value.map((v) => shift(v, null));
    if (value && typeof value === "object") {
      return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, shift(v, k)]));
    }
    return value;
  };
  const tables = shift(state.tables, null) as MockState["tables"];
  for (const counter of tables.quoteCounters) counter.year = new Date(now).getUTCFullYear();
  return { ...state, anchoredAt: new Date(now).toISOString(), tables };
}
