import { api } from "@hco/shared";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { callApi } from "@/lib/api/client";
import { runTourAction } from "./actions";
import { CHAPTERS, routePath } from "./chapters";
import { emptyProgress, emptySubject, markTourTab, readProgress, writeProgress } from "./storage";
import { findTarget, isVisible, rectOf, type Rect } from "./targets";
import type { TourChapter, TourMode, TourState, TourStep, TourSubject, TourWatch } from "./types";

/** Presenter mode moves on by itself after this long, unless the step waits for the client. */
const DEFAULT_HOLD_MS = 9000;
const WATCH_INTERVAL_MS = 350;
/** Re-look for the target about five times a second; the screen may not have rendered it yet. */
const TARGET_RECHECK_FRAMES = 12;

export interface TourEngine {
  state: TourState;
  chapter: TourChapter | null;
  step: TourStep | null;
  /** The element the spotlight is on right now, or null when this step's screen is not on show. */
  target: Element | null;
  rect: Rect | null;
  subject: TourSubject;
  start: (mode: TourMode, chapterIndex?: number) => void;
  /** Open the card again on the step the client stopped at, without redoing it. */
  resume: () => void;
  close: () => void;
  restart: () => void;
  goToChapter: (chapterIndex: number) => void;
  next: () => void;
  back: () => void;
  skip: () => void;
  togglePause: () => void;
  hidePill: () => void;
  text: (key: string, options?: Record<string, string | number>) => string;
}

/** What other screens get from the store: everything except the live spotlight geometry. */
export type TourHandle = Omit<TourEngine, "target" | "rect">;

function sameRect(a: Rect | null, b: Rect | null): boolean {
  if (!a || !b) return a === b;
  return (
    Math.abs(a.top - b.top) < 0.5 &&
    Math.abs(a.left - b.left) < 0.5 &&
    Math.abs(a.width - b.width) < 0.5 &&
    Math.abs(a.height - b.height) < 0.5
  );
}

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

/** Ids the app puts in the address bar. The tour learns them by watching the client use the app. */
function captureIds(pathname: string): Partial<TourSubject> | null {
  const [, section, id] = pathname.split("/");
  if (!section || !id) return null;
  if (section === "leads") return { leadId: id };
  if (section === "inbox") return { conversationId: id };
  if (section === "deals") return { dealId: id };
  if (section === "quotes" && id !== "new") return { quoteId: id };
  return null;
}

/** Only fills the gaps: what the tour worked out for itself always wins. */
function mergeSubject(subject: TourSubject, patch: Partial<TourSubject>): TourSubject {
  return {
    leadId: subject.leadId ?? patch.leadId ?? null,
    leadName: subject.leadName ?? patch.leadName ?? null,
    leadPhone: subject.leadPhone ?? patch.leadPhone ?? null,
    conversationId: subject.conversationId ?? patch.conversationId ?? null,
    dealId: subject.dealId ?? patch.dealId ?? null,
    quoteId: subject.quoteId ?? patch.quoteId ?? null,
  };
}

/**
 * How full the board is: the first open stage, and the open stages together. Read from the API
 * rather than the DOM, because a phone shows one stage at a time and counting cards on screen lies.
 */
async function boardCounts(): Promise<{ firstOpen: number; openTotal: number } | null> {
  try {
    const board = await callApi(api.pipeline.board, { query: {} });
    const open = board.columns.filter((column) => column.stage.type === "open");
    return {
      firstOpen: open[0]?.deals.length ?? 0,
      openTotal: open.reduce((total, column) => total + column.deals.length, 0),
    };
  } catch {
    return null;
  }
}

/** One number or flag per watch kind, read from the DOM, the address bar or the API. */
async function readWatch(watch: TourWatch, pathname: string): Promise<number | boolean | null> {
  switch (watch.kind) {
    case "route":
      return pathname.startsWith(watch.prefix);
    case "appears":
      return findTarget(watch.selector) !== null;
    case "gone":
      return findTarget(watch.selector) === null;
    case "stageDrop": {
      const counts = await boardCounts();
      return counts === null ? null : counts.firstOpen;
    }
    case "openDrop": {
      const counts = await boardCounts();
      return counts === null ? null : counts.openTotal;
    }
  }
}

export function useTourEngine(): TourEngine {
  const { t } = useTranslation("tour");
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  const [state, setState] = useState<TourState>(() => {
    const stored = readProgress() ?? emptyProgress();
    return { ...stored, running: false, paused: false, pillHidden: false, finished: false };
  });
  const [found, setFound] = useState<{ key: string; element: Element | null }>({
    key: "",
    element: null,
  });
  const [rect, setRect] = useState<Rect | null>(null);
  const [runId, setRunId] = useState(0);

  const chapter = CHAPTERS[state.chapterIndex] ?? null;
  const step = chapter?.steps[state.stepIndex] ?? null;
  const stepKey = state.running && step ? `${runId}:${state.chapterIndex}:${state.stepIndex}` : "";
  // A target belongs to the step it was found for; anything older is not on screen any more.
  const target = found.key === stepKey ? found.element : null;

  const pathnameRef = useRef(pathname);
  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);
  const reduced = useMemo(() => prefersReducedMotion(), []);

  const text = useCallback(
    (key: string, options?: Record<string, string | number>) => t(key, options),
    [t],
  );

  // Remember where the client got to, for the checklist and for next time.
  useEffect(() => {
    if (!state.started) return;
    writeProgress({
      mode: state.mode,
      chapterIndex: state.chapterIndex,
      stepIndex: state.stepIndex,
      completed: state.completed,
      subject: state.subject,
      started: true,
    });
  }, [state.started, state.mode, state.chapterIndex, state.stepIndex, state.completed, state.subject]);

  const start = useCallback((mode: TourMode, chapterIndex = 0) => {
    markTourTab();
    setRunId((id) => id + 1);
    setState((current) => ({
      ...current,
      mode,
      chapterIndex,
      stepIndex: 0,
      running: true,
      finished: false,
      paused: false,
      pillHidden: false,
      started: true,
      ...(chapterIndex === 0
        ? { subject: emptySubject(), completed: [] }
        : { subject: current.subject }),
    }));
  }, []);

  const resume = useCallback(() => {
    markTourTab();
    setState((current) => ({
      ...current,
      running: true,
      finished: false,
      pillHidden: false,
      started: true,
    }));
  }, []);

  const close = useCallback(() => setState((current) => ({ ...current, running: false })), []);

  const restart = useCallback(() => start(state.mode, 0), [start, state.mode]);

  const goToChapter = useCallback(
    (chapterIndex: number) => start(state.mode, chapterIndex),
    [start, state.mode],
  );

  const next = useCallback(() => {
    setState((current) => {
      const currentChapter = CHAPTERS[current.chapterIndex];
      if (!currentChapter) return { ...current, running: false, finished: true };
      const lastStep = current.stepIndex >= currentChapter.steps.length - 1;
      const completed = lastStep && !current.completed.includes(currentChapter.id)
        ? [...current.completed, currentChapter.id]
        : current.completed;
      if (!lastStep) return { ...current, stepIndex: current.stepIndex + 1, completed, paused: false };
      const following = CHAPTERS[current.chapterIndex + 1];
      if (!following) return { ...current, completed, finished: true };
      return { ...current, completed, chapterIndex: current.chapterIndex + 1, stepIndex: 0, paused: false };
    });
  }, []);

  const back = useCallback(() => {
    setState((current) => {
      if (current.finished) return { ...current, finished: false };
      if (current.stepIndex > 0) return { ...current, stepIndex: current.stepIndex - 1, paused: false };
      const previous = CHAPTERS[current.chapterIndex - 1];
      if (!previous) return current;
      return {
        ...current,
        chapterIndex: current.chapterIndex - 1,
        stepIndex: Math.max(previous.steps.length - 1, 0),
        paused: false,
      };
    });
  }, []);

  const skip = useCallback(() => {
    setState((current) => {
      const currentChapter = CHAPTERS[current.chapterIndex];
      const completed = currentChapter && !current.completed.includes(currentChapter.id)
        ? [...current.completed, currentChapter.id]
        : current.completed;
      const following = CHAPTERS[current.chapterIndex + 1];
      if (!following) return { ...current, completed, finished: true };
      return { ...current, completed, chapterIndex: current.chapterIndex + 1, stepIndex: 0, paused: false };
    });
  }, []);

  const togglePause = useCallback(() => setState((current) => ({ ...current, paused: !current.paused })), []);
  const hidePill = useCallback(() => setState((current) => ({ ...current, pillHidden: true })), []);

  // Do the one thing this step needs doing to the workspace (send the lead, open the thread...).
  const ranRef = useRef(new Set<string>());
  useEffect(() => {
    const action = step?.action;
    const stepId = step?.id;
    if (!state.running || !action || !stepId) return;
    const key = `${runId}:${chapter?.id}:${stepId}`;
    if (ranRef.current.has(key)) return;
    ranRef.current.add(key);
    void (async () => {
      try {
        const result = await runTourAction(action, state.subject);
        setState((current) => ({ ...current, subject: { ...current.subject, ...result.subject } }));
        if (result.toast) {
          const description = result.toast.text ? result.toast.text : null;
          toast.success(text("toast.title"), {
            description: description ?? undefined,
            duration: 12000,
          });
        }
      } catch {
        toast.error(text("toast.failed"));
      }
    })();
  }, [state.running, state.subject, step, chapter, runId, text]);

  // Keep the client on the screen this step is about.
  useEffect(() => {
    if (!state.running || !step?.route) return;
    const path = routePath(step.route, state.subject);
    if (!path || path.split("?")[0] === pathname) return;
    switch (step.route.kind) {
      case "leads":
        void navigate({ to: "/leads" });
        break;
      case "lead":
        if (state.subject.leadId) {
          void navigate({ to: "/leads/$leadId", params: { leadId: state.subject.leadId } });
        }
        break;
      case "conversation":
        if (state.subject.conversationId) {
          void navigate({
            to: "/inbox/$conversationId",
            params: { conversationId: state.subject.conversationId },
          });
        }
        break;
      case "pipeline":
        void navigate({ to: "/pipeline" });
        break;
      case "dashboard":
        void navigate({ to: "/dashboard" });
        break;
      case "newQuote":
        if (state.subject.dealId) {
          void navigate({ to: "/quotes/new", search: { dealId: state.subject.dealId } });
        }
        break;
      case "quote":
        if (state.subject.quoteId) {
          void navigate({ to: "/quotes/$quoteId", params: { quoteId: state.subject.quoteId } });
        }
        break;
    }
  }, [state.running, state.subject, step, pathname, navigate]);

  // One loop for the spotlight: find the element, then follow it as the page scrolls and settles.
  // Both jobs are the same measurement, and both have to survive screens that mount late.
  useEffect(() => {
    if (!state.running || !step) return;
    const key = `${runId}:${state.chapterIndex}:${state.stepIndex}`;
    let element: Element | null = null;
    let measured: Rect | null = null;
    let frames = 0;
    // Empty so the first frame after a route change always reads the new path, however briefly it is up.
    let lastPath = "";
    // The first frame of a step always publishes its own measurement, even when that is "nothing",
    // so a step whose target is missing never keeps the last step's spotlight.
    let primed = false;
    let frame = 0;
    const tick = () => {
      frame = window.requestAnimationFrame(tick);
      if (lastPath !== pathname) {
        lastPath = pathname;
        const captured = captureIds(pathname);
        if (captured) {
          setState((current) => ({ ...current, subject: mergeSubject(current.subject, captured) }));
        }
      }
      if (frames++ % TARGET_RECHECK_FRAMES === 0 || (element !== null && !element.isConnected)) {
        const next = findTarget(step.target);
        if (next !== element) {
          element = next;
          measured = null;
          setFound({ key, element: next });
        }
      }
      const nextRect = element && isVisible(element) ? rectOf(element) : null;
      if (!primed || !sameRect(measured, nextRect)) {
        primed = true;
        measured = nextRect;
        setRect(nextRect);
      }
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [state.running, step, runId, state.chapterIndex, state.stepIndex, pathname]);

  // Bring the spotlight into view once per step, but never fight the client's scrolling.
  const scrolledRef = useRef("");
  useEffect(() => {
    if (!target) return;
    const key = `${runId}:${state.chapterIndex}:${state.stepIndex}`;
    if (scrolledRef.current === key) return;
    scrolledRef.current = key;
    const box = target.getBoundingClientRect();
    const offscreen =
      box.top < 12 ||
      box.bottom > window.innerHeight - 12 ||
      box.left < 0 ||
      box.right > window.innerWidth;
    if (offscreen) {
      target.scrollIntoView({
        block: "center",
        inline: "nearest",
        behavior: reduced ? "auto" : "smooth",
      });
    }
  }, [target, runId, state.chapterIndex, state.stepIndex, reduced]);

  // Move on when the client has done the thing.
  const baselineRef = useRef<number | null>(null);
  useEffect(() => {
    if (!state.running || !step?.watch) return;
    const watch = step.watch;
    baselineRef.current = null;
    let busy = false;
    // A "gone" watch is only satisfied once the control has actually been on screen. A panel that has
    // not rendered yet is not a control that has left, and treating it as one skips the client's step.
    let wasThere = false;
    const timer = window.setInterval(() => {
      if (busy) return;
      busy = true;
      void readWatch(watch, pathnameRef.current)
        .then((value) => {
          if (value === null) return;
          if (typeof value === "boolean") {
            if (watch.kind === "gone") {
              if (!value) wasThere = true;
              else if (wasThere) next();
              return;
            }
            if (value) next();
            return;
          }
          if (value <= 0) return;
          if (baselineRef.current === null) baselineRef.current = value;
          else if (value < baselineRef.current) next();
        })
        .finally(() => {
          busy = false;
        });
    }, WATCH_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [state.running, step, runId, next]);

  // Presenter mode: the chapters move on by themselves, unless the step waits for a click.
  useEffect(() => {
    if (!state.running || state.mode !== "presenter" || state.paused || state.finished) return;
    if (!step || step.watch) return;
    const hold = step.holdMs ?? DEFAULT_HOLD_MS;
    if (hold <= 0) return;
    const timer = window.setTimeout(next, hold);
    return () => window.clearTimeout(timer);
  }, [state.running, state.mode, state.paused, state.finished, step, runId, next]);

  return {
    state,
    chapter,
    step,
    target,
    rect,
    subject: state.subject,
    start,
    resume,
    close,
    restart,
    goToChapter,
    next,
    back,
    skip,
    togglePause,
    hidePill,
    text,
  };
}
