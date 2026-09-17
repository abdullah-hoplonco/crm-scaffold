import { CHAPTERS } from "./chapters";
import type { TourMode, TourProgress, TourSubject } from "./types";

/**
 * Where the tour remembers how far the client got. Demo-only, per browser, and never allowed to
 * throw: a browser with storage turned off just starts the tour from the top.
 */
const KEY = "hco-crm:tour";
const TAB_KEY = "hco-crm:tour:tab";

const EMPTY_SUBJECT: TourSubject = {
  leadId: null,
  leadName: null,
  leadPhone: null,
  conversationId: null,
  dealId: null,
  quoteId: null,
};

export function emptySubject(): TourSubject {
  return { ...EMPTY_SUBJECT };
}

export function emptyProgress(mode: TourMode = "self-serve"): TourProgress {
  return { mode, chapterIndex: 0, stepIndex: 0, completed: [], subject: emptySubject(), started: false };
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value ? value : null;
}

function asSubject(value: unknown): TourSubject {
  if (!value || typeof value !== "object") return { ...EMPTY_SUBJECT };
  const raw = value as Record<string, unknown>;
  return {
    leadId: asString(raw.leadId),
    leadName: asString(raw.leadName),
    leadPhone: asString(raw.leadPhone),
    conversationId: asString(raw.conversationId),
    dealId: asString(raw.dealId),
    quoteId: asString(raw.quoteId),
  };
}

export function readProgress(): TourProgress | null {
  try {
    const stored = window.localStorage.getItem(KEY);
    if (!stored) return null;
    const parsed: unknown = JSON.parse(stored);
    if (!parsed || typeof parsed !== "object") return null;
    const raw = parsed as Record<string, unknown>;
    const mode: TourMode = raw.mode === "self-serve" ? "self-serve" : "presenter";
    const chapterIndex = Math.min(Math.max(Number(raw.chapterIndex) || 0, 0), CHAPTERS.length - 1);
    const chapter = CHAPTERS[chapterIndex];
    const stepIndex = Math.min(Math.max(Number(raw.stepIndex) || 0, 0), Math.max((chapter?.steps.length ?? 1) - 1, 0));
    const completed = Array.isArray(raw.completed)
      ? raw.completed.filter((id): id is string => typeof id === "string")
      : [];
    if (raw.started !== true) return null;
    return { mode, chapterIndex, stepIndex, completed, subject: asSubject(raw.subject), started: true };
  } catch {
    return null;
  }
}

export function writeProgress(progress: TourProgress): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(progress));
  } catch {
    // Private windows and full quotas: the tour still works, it just forgets.
  }
}

/**
 * Which tab started the tour. The demo panel opens reps in other windows, and the tour must not
 * follow the salesperson into them.
 */
export function markTourTab(): void {
  try {
    window.sessionStorage.setItem(TAB_KEY, "1");
  } catch {
    // Storage off: the "continue" pill simply stays away.
  }
}

export function isTourTab(): boolean {
  try {
    return window.sessionStorage.getItem(TAB_KEY) === "1";
  } catch {
    return false;
  }
}
