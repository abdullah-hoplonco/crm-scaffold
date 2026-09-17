import { Pause, Play, X } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CHAPTER_COUNT } from "./chapters";
import { placeCard, SHEET_BREAKPOINT, type Rect } from "./targets";
import type { TourEngine } from "./useTour";

function useViewport() {
  const [viewport, setViewport] = useState(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
  }));
  useLayoutEffect(() => {
    const onResize = () => setViewport({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return viewport;
}

/** An open menu or list: the client is mid-choice, and the card must not sit on top of the list. */
function useAppMenuOpen() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const check = () => {
      const next =
        document.querySelector('[role="menu"][data-state="open"], [role="listbox"][data-state="open"]') !== null;
      setOpen((current) => (current === next ? current : next));
    };
    const timer = window.setInterval(check, 200);
    return () => window.clearInterval(timer);
  }, []);
  return open;
}

/** The card that talks to the client. Floats beside the spotlight, or docks to the bottom on a phone. */
export function TourCard({ engine, rect }: { engine: TourEngine; rect: Rect | null }) {
  const { state, step, chapter, text } = engine;
  const cardRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const viewport = useViewport();

  useLayoutEffect(() => {
    const element = cardRef.current;
    if (!element) return;
    const measure = () => {
      const box = element.getBoundingClientRect();
      setSize((current) =>
        Math.abs(current.width - box.width) < 1 && Math.abs(current.height - box.height) < 1
          ? current
          : { width: box.width, height: box.height },
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Focus follows the card, so a keyboard user is never left behind on the page underneath.
  const stepKey = `${state.chapterIndex}:${state.stepIndex}:${state.finished}`;
  useLayoutEffect(() => {
    cardRef.current?.focus({ preventScroll: true });
  }, [stepKey]);

  const isSheet = viewport.width < SHEET_BREAKPOINT;
  const menuOpen = useAppMenuOpen();
  // On a phone the card is a bar. It sits just above the tab bar so the app stays reachable, and
  // moves to the top when the thing it is talking about lives in the lower half of the screen —
  // a dialog's own buttons, or the composer. Either way it never buries what it points at.
  const sheetAtTop = isSheet && rect !== null && rect.top + rect.height > viewport.height / 2;
  const placement = placeCard(rect, size, viewport, step?.placement ?? "auto");
  const stepCount = chapter?.steps.length ?? 0;
  const chapterLabel = text("card.chapter", { number: state.chapterIndex + 1, total: CHAPTER_COUNT });
  const title = state.finished
    ? text("card.doneTitle")
    : step
      ? text(`chapters.${chapter?.id}.steps.${step.id}.title`, { defaultValue: text(`chapters.${chapter?.id}.name`) })
      : "";
  const body = state.finished
    ? text("card.doneBody")
    : step
      ? text(`chapters.${chapter?.id}.steps.${step.id}.body`)
      : "";
  const isLastStep = stepCount > 0 && state.stepIndex >= stepCount - 1;
  const isLastChapter = state.chapterIndex >= CHAPTER_COUNT - 1;
  const hint = !state.finished && step && !engine.target && (step.target || step.route)
    ? text("card.gap")
    : !state.finished && step?.watch
      ? text("card.waiting")
      : null;

  return (
    <div
      ref={cardRef}
      role="dialog"
      aria-labelledby="tour-card-title"
      aria-describedby="tour-card-body"
      tabIndex={-1}
      data-tour-card="true"
      data-tour-chapter={state.finished ? "" : (chapter?.id ?? "")}
      data-tour-step={state.finished ? "" : (step?.id ?? "")}
      className={cn(
        "pointer-events-auto fixed z-[70] flex flex-col gap-3 border bg-card p-4 shadow-md outline-none",
        isSheet
          ? sheetAtTop
            ? "inset-x-0 top-0 bottom-auto rounded-b-xl border-x-0 border-t-0 pt-[calc(1rem+env(safe-area-inset-top))]"
            : "inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] top-auto rounded-t-xl border-x-0 border-b-0 pb-4"
          : "rounded-xl",
        // Out of the way, not gone: the chapter comes straight back when the menu closes.
        menuOpen && "invisible pointer-events-none",
      )}
      style={isSheet ? undefined : { top: placement.top, left: placement.left, width: placement.width }}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="pt-0.5 text-xs text-muted-foreground">{chapterLabel}</p>
        <div className="flex items-center gap-1">
          {stepCount > 1 && !state.finished ? (
            <span className="text-xs text-muted-foreground tabular-nums">
              {state.stepIndex + 1} / {stepCount}
            </span>
          ) : null}
          {state.mode === "presenter" && !state.finished ? (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={engine.togglePause}
              aria-label={state.paused ? text("card.play") : text("card.pause")}
              title={state.paused ? text("card.play") : text("card.pause")}
            >
              {state.paused ? <Play /> : <Pause />}
            </Button>
          ) : null}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={engine.close}
            aria-label={text("card.close")}
            title={text("card.close")}
          >
            <X />
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <h2 id="tour-card-title" className="text-base font-semibold">
          {title}
        </h2>
        <p id="tour-card-body" className="text-sm leading-relaxed text-muted-foreground">
          {body}
        </p>
        {hint ? <p className="text-xs leading-relaxed text-muted-foreground">{hint}</p> : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        {state.finished ? (
          <Button variant="outline" onClick={engine.restart}>
            {text("card.doneAgain")}
          </Button>
        ) : (
          <Button variant="ghost" onClick={engine.back} disabled={state.chapterIndex === 0 && state.stepIndex === 0}>
            {text("card.back")}
          </Button>
        )}
        <div className="flex items-center gap-2">
          {state.finished ? (
            <Button onClick={engine.close}>{text("card.doneClose")}</Button>
          ) : (
            <>
              <Button variant="ghost" onClick={engine.skip}>
                {text("card.skip")}
              </Button>
              <Button onClick={engine.next}>
                {isLastStep && isLastChapter ? text("card.finish") : text("card.next")}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
