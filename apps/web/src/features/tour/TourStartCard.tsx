import { Check, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CHAPTERS, CHAPTER_COUNT } from "./chapters";
import { tourEnabled } from "./gate";
import { useTour } from "./store";

/**
 * The tour's front door, on the demo control panel: start it, pick a mode, and jump straight back
 * into any chapter. Everything it remembers about a past run it remembers per browser.
 */
export function TourStartCard() {
  const tour = useTour();
  if (!tourEnabled || !tour) return null;

  const { state, text, start, resume, goToChapter } = tour;
  const started = state.started && (state.chapterIndex > 0 || state.stepIndex > 0 || state.completed.length > 0);

  return (
    <section
      aria-labelledby="tour-start-title"
      className="flex flex-col gap-4 rounded-xl border bg-card p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 id="tour-start-title" className="text-base font-semibold">
          {text("start.title")}
        </h2>
        <p className="text-xs text-muted-foreground tabular-nums">
          {text("start.progress", { done: state.completed.length, total: CHAPTER_COUNT })}
        </p>
      </div>
      <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">{text("start.body")}</p>

      {started ? (
        <div className="flex flex-wrap items-start gap-3">
          <Button onClick={resume}>{text("start.resume", { number: state.chapterIndex + 1 })}</Button>
          <Button variant="outline" onClick={() => start(state.mode, 0)}>
            {text("start.restart")}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <div className="flex flex-col gap-1.5">
            <Button className="w-full sm:w-auto" onClick={() => start("presenter")}>
              {text("start.present")}
            </Button>
            <p className="text-xs text-muted-foreground sm:max-w-56">{text("start.presentHint")}</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => start("self-serve")}>
              {text("start.selfServe")}
            </Button>
            <p className="text-xs text-muted-foreground sm:max-w-56">{text("start.selfServeHint")}</p>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
          <h3 className="text-sm font-medium">{text("start.checklistTitle")}</h3>
          <p className="text-xs text-muted-foreground">{text("start.checklistHint")}</p>
        </div>
        <ol className="divide-y overflow-hidden rounded-lg border">
          {CHAPTERS.map((chapter, index) => {
            const done = state.completed.includes(chapter.id);
            const current = state.started && index === state.chapterIndex;
            return (
              <li key={chapter.id}>
                <button
                  type="button"
                  onClick={() => goToChapter(index)}
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-start hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:-outline-offset-2"
                >
                  <span className="w-4 shrink-0 text-xs text-muted-foreground tabular-nums">
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm">{text(`chapters.${chapter.id}.name`)}</span>
                  {done ? (
                    <span className="inline-flex shrink-0 items-center gap-1 text-xs text-success">
                      <Check aria-hidden="true" className="size-3.5" />
                      {text("start.done")}
                    </span>
                  ) : current ? (
                    <span className="shrink-0 text-xs text-primary">{text("start.inProgress")}</span>
                  ) : null}
                  <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground rtl:rotate-180" />
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
