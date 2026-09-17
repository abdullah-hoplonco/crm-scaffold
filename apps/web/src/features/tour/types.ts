/** Types for the guided client tour. See `chapters.ts` for the story itself. */

/** Who is driving: the salesperson presenting, or the client on their own. */
export type TourMode = "presenter" | "self-serve";

/** What the tour has learned about the demo record it created, so later chapters can reuse it. */
export interface TourSubject {
  leadId: string | null;
  leadName: string | null;
  leadPhone: string | null;
  conversationId: string | null;
  dealId: string | null;
  quoteId: string | null;
}

export interface TourProgress {
  mode: TourMode;
  chapterIndex: number;
  stepIndex: number;
  /** Chapter ids the client has been through, for the checklist. */
  completed: string[];
  subject: TourSubject;
  /** False until the tour has been started once: nothing is written to storage before that. */
  started: boolean;
}

/** A screen the tour knows how to open. Resolved against the subject so late chapters need no ids of their own. */
export type TourRoute =
  | { kind: "leads" }
  | { kind: "lead" }
  | { kind: "conversation" }
  | { kind: "pipeline" }
  | { kind: "dashboard" }
  | { kind: "newQuote" }
  | { kind: "quote" };

/** What a step does to the workspace when it starts. Everything else is the client's own clicking. */
export type TourAction = "instagramLead" | "leadWhatsapp" | "ensureDeal" | "ensureQuote";

/**
 * What counts as "the client did it", so the tour can move on without being asked.
 * All of them are read from the DOM or the address bar: the tour never guesses at app state.
 */
export type TourWatch =
  | { kind: "route"; prefix: string }
  | { kind: "appears"; selector: string }
  | { kind: "gone"; selector: string }
  /** Cards in the first open pipeline column, fewer than when the step started. */
  | { kind: "stageDrop"; column: string }
  /** Cards across every open column, fewer than when the step started (the deal left the board). */
  | { kind: "openDrop" };

export interface TourStep {
  id: string;
  /** Where this step happens. Null means "wherever the client already is". */
  route: TourRoute | null;
  /** Selectors for the spotlight, best first. The first one visible on screen wins. */
  target?: string | string[];
  /** Do not cut a hole: the target sits above the scrim on its own (toasts). */
  noHole?: boolean;
  /** Force the card to one side of the spotlight instead of the roomiest one. */
  placement?: "auto" | "above" | "below";
  action?: TourAction;
  watch?: TourWatch;
  /** Presenter mode only: move on by itself after this long. Steps with a watch wait for the client. */
  holdMs?: number;
}

export interface TourChapter {
  id: string;
  steps: TourStep[];
}

export interface TourState extends TourProgress {
  running: boolean;
  /** Session-only: presenter has paused the auto-advance. */
  paused: boolean;
  /** Session-only: the client hid the "continue" pill. */
  pillHidden: boolean;
  /** Session-only: the last step was finished; the card shows the closing note. */
  finished: boolean;
}
