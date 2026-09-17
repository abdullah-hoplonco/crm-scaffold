import type { TourChapter, TourRoute, TourStep, TourSubject } from "./types";

/**
 * The guided tour: one enquiry, seven chapters, in the order a real one moves.
 * Every target is a `data-tour` hook that the screen already carries, so the spotlight always
 * lands on the real control. Steps list fallbacks; the first target visible on screen wins.
 */
export const CHAPTERS: TourChapter[] = [
  {
    id: "enquiry",
    steps: [
      {
        id: "arrives",
        route: { kind: "leads" },
        action: "instagramLead",
        target: '[data-sonner-toast][data-mounted="true"]',
        noHole: true,
        placement: "below",
        holdMs: 9000,
      },
      {
        id: "listed",
        route: { kind: "leads" },
        target: '[data-tour="leads-list"] li:first-child',
        holdMs: 9000,
      },
      {
        id: "speed",
        route: { kind: "leads" },
        target: [
          '[data-tour="leads-list"] li:first-child [data-tour="speed-chip"]',
          '[data-tour="leads-list"] li:first-child',
        ],
        holdMs: 10000,
      },
    ],
  },
  {
    id: "assigned",
    steps: [
      {
        id: "owner",
        route: { kind: "leads" },
        target: [
          '[data-tour="leads-list"] li:first-child [data-tour="lead-assignee"]',
          '[data-tour="leads-list"] li:first-child',
        ],
        holdMs: 9000,
      },
      {
        id: "task",
        route: { kind: "lead" },
        target: ['[data-tour="lead-tasks"] [data-tour="task-list"] li:first-child', '[data-tour="lead-tasks"]'],
        holdMs: 10000,
      },
    ],
  },
  {
    id: "whatsapp",
    steps: [
      {
        id: "thread",
        route: { kind: "conversation" },
        action: "leadWhatsapp",
        target: '[data-tour="thread-messages"]',
        holdMs: 10000,
      },
      {
        id: "window",
        route: { kind: "conversation" },
        target: '[data-tour="service-window"]',
        holdMs: 10000,
      },
      {
        id: "composer",
        route: { kind: "conversation" },
        target: '[data-tour="composer"]',
        holdMs: 10000,
      },
    ],
  },
  {
    id: "deal",
    steps: [
      {
        id: "convert",
        route: { kind: "lead" },
        target: '[data-tour="lead-convert"]',
        watch: { kind: "appears", selector: '[data-tour="convert-dialog"]' },
      },
      {
        id: "dialog",
        route: null,
        target: '[data-tour="convert-dialog"]',
        watch: { kind: "route", prefix: "/deals/" },
      },
      {
        id: "board",
        route: { kind: "pipeline" },
        // A phone has no columns, so the card itself is the fallback the moment the stage columns are absent.
        target: [
          '[data-tour="stage-open"] [data-tour="deal-card"]',
          '[data-tour="deal-card"]',
          '[data-tour="stage-open"]',
        ],
        holdMs: 10000,
      },
    ],
  },
  {
    id: "pipeline",
    steps: [
      {
        id: "drag",
        route: { kind: "pipeline" },
        target: ['[data-tour="stage-open"] [data-tour="deal-card"]', '[data-tour="move-to"]'],
        watch: { kind: "stageDrop", column: "stage-open" },
      },
      {
        id: "won",
        route: { kind: "pipeline" },
        // On a phone the deal has left the stage that is on show, so the switcher — the client's next
        // move — is the target, not the "Move to" of whichever card happens to be first in this stage.
        target: [
          '[data-tour="stage-won"]',
          '[data-tour="stage-tabs"]',
          '[data-tour="move-to"]',
          '[data-tour="deal-card"]',
        ],
        watch: { kind: "openDrop" },
      },
    ],
  },
  {
    id: "quote",
    steps: [
      {
        id: "build",
        route: { kind: "newQuote" },
        action: "ensureDeal",
        target: '[data-tour="quote-lines"]',
        holdMs: 11000,
      },
      {
        id: "totals",
        route: null,
        // Save draft is the move here, and the tour brings it into view; the totals themselves sit
        // beside it in the preview, or with the line items on a narrow screen.
        target: ['[data-tour="quote-save"]', '[data-tour="quote-totals"]', '[data-tour="quote-preview"]'],
        // Saving the draft is what opens the saved quote. Watching the address bar would be wrong here:
        // the builder's own /quotes/new starts with the same prefix and would move the card on at once.
        watch: { kind: "appears", selector: '[data-tour="quote-download"]' },
      },
      {
        id: "pdf",
        route: { kind: "quote" },
        action: "ensureQuote",
        target: '[data-tour="quote-download"]',
        holdMs: 10000,
      },
      {
        id: "send",
        route: null,
        target: ['[data-tour="quote-send"]', '[data-tour="quote-send-desktop"]'],
        // Either send control going is the send: the desktop panel on a laptop, the phone bar on a phone.
        // Asking for the desktop panel alone would fire at once on a phone, where it is never on screen.
        watch: { kind: "gone", selector: '[data-tour="quote-send"], [data-tour="quote-send-desktop"]' },
      },
      {
        id: "landed",
        route: { kind: "conversation" },
        target: ['[data-tour="thread-document"]', '[data-tour="thread-messages"]'],
        holdMs: 11000,
      },
    ],
  },
  {
    id: "owner",
    steps: [
      {
        id: "money",
        route: { kind: "dashboard" },
        target: '[data-tour="dashboard-headline"]',
        holdMs: 10000,
      },
      {
        id: "sources",
        route: { kind: "dashboard" },
        // The source panel is not spread-props, so it is addressed by its own labelled section.
        target: [
          'section[aria-labelledby="leads-by-source"]',
          "#leads-by-source",
          '[data-tour="dashboard-sources"]',
        ],
        holdMs: 11000,
      },
    ],
  },
];

export const CHAPTER_COUNT = CHAPTERS.length;

export function chapterAt(index: number): TourChapter | undefined {
  return CHAPTERS[index];
}

export function stepAt(chapterIndex: number, stepIndex: number): TourStep | undefined {
  const chapter = CHAPTERS[chapterIndex];
  if (!chapter) return undefined;
  return chapter.steps[stepIndex];
}

/** The path this route would open, or null when the tour does not have the id it needs yet. */
export function routePath(route: TourRoute, subject: TourSubject): string | null {
  switch (route.kind) {
    case "leads":
      return "/leads";
    case "lead":
      return subject.leadId ? `/leads/${subject.leadId}` : null;
    case "conversation":
      return subject.conversationId ? `/inbox/${subject.conversationId}` : null;
    case "pipeline":
      return "/pipeline";
    case "dashboard":
      return "/dashboard";
    case "newQuote":
      return subject.dealId ? `/quotes/new?dealId=${subject.dealId}` : null;
    case "quote":
      return subject.quoteId ? `/quotes/${subject.quoteId}` : null;
  }
}
