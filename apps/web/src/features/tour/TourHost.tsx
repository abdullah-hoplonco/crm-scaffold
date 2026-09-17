import { useRouterState } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { useEffect, useMemo } from "react";
import { tourEnabled } from "./gate";
import { CHAPTER_COUNT } from "./chapters";
import { Spotlight } from "./Spotlight";
import { isTourTab } from "./storage";
import { publishTour } from "./store";
import { TourCard } from "./TourCard";
import { useTourEngine, type TourHandle } from "./useTour";

/** Radix owns the keyboard while one of its popups is open; the tour stays out of the way. */
function popupOpen(): boolean {
  return (
    document.querySelector('[role="dialog"][data-state="open"]') !== null ||
    document.querySelector('[role="menu"][data-state="open"]') !== null ||
    document.querySelector('[role="listbox"][data-state="open"]') !== null
  );
}

/** Typing, or standing on a control that Enter already belongs to. */
function isBusy(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    ["input", "textarea", "select"].includes(target.tagName.toLowerCase()) ||
    target.closest("button, a, [role='button'], [role='menuitem'], [role='tab'], [role='option']") !== null
  );
}

/**
 * The tour itself: the dim layer, the spotlight, the card, and the keyboard. Mount it once, inside
 * the app layout. It renders nothing until a tour is running, and nothing at all outside demo mode.
 */
export function TourHost() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const engine = useTourEngine();
  const { state, step, chapter, close, next, back, resume, text } = engine;

  // Screens outside this tree (the demo panel) read the tour from the store, not from a provider.
  // Published on purpose without the spotlight geometry: those change every frame while scrolling.
  const handle = useMemo<TourHandle>(
    () => ({
      state,
      chapter,
      step,
      subject: state.subject,
      start: engine.start,
      resume: engine.resume,
      close: engine.close,
      restart: engine.restart,
      goToChapter: engine.goToChapter,
      next: engine.next,
      back: engine.back,
      skip: engine.skip,
      togglePause: engine.togglePause,
      hidePill: engine.hidePill,
      text: engine.text,
    }),
    [state, chapter, step, engine.start, engine.resume, engine.close, engine.restart, engine.goToChapter, engine.next, engine.back, engine.skip, engine.togglePause, engine.hidePill, engine.text],
  );
  useEffect(() => {
    publishTour(handle);
  }, [handle]);
  useEffect(() => () => publishTour(null), []);

  useEffect(() => {
    if (!state.running) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
      if (state.finished) {
        if (event.key === "Escape") {
          event.preventDefault();
          close();
        }
        return;
      }
      if (event.key === "Escape") {
        if (popupOpen()) return;
        event.preventDefault();
        close();
        return;
      }
      if (isBusy(event.target)) return;
      if (event.key === "ArrowRight") {
        if (popupOpen()) return;
        event.preventDefault();
        next();
        return;
      }
      if (event.key === "ArrowLeft") {
        if (popupOpen()) return;
        event.preventDefault();
        back();
        return;
      }
      if (event.key === "Enter") {
        if (popupOpen()) return;
        event.preventDefault();
        next();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [state.running, state.finished, close, next, back]);

  if (!tourEnabled) return null;

  const showPill =
    state.started && !state.running && !state.pillHidden && isTourTab() && pathname !== "/dev/demo";

  return (
    <>
      {state.running ? (
        <>
          <Spotlight rect={engine.rect} cut={!state.finished && step !== null && step.noHole !== true} />
          <TourCard engine={engine} rect={engine.rect} />
        </>
      ) : null}
      {showPill ? (
        <button
          type="button"
          onClick={resume}
          className="pointer-events-auto fixed end-4 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-[55] inline-flex items-center gap-1.5 rounded-full border bg-card px-3.5 py-2 text-sm font-medium shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none lg:bottom-6"
        >
          {text("resumePill")}
          <span className="text-xs text-muted-foreground tabular-nums">
            {state.chapterIndex + 1}/{CHAPTER_COUNT}
          </span>
          <ChevronRight aria-hidden="true" className="size-4 rtl:rotate-180" />
        </button>
      ) : null}
    </>
  );
}
