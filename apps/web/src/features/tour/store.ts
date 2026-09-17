import { useSyncExternalStore } from "react";
import type { TourHandle } from "./useTour";

/**
 * One tour per app. `TourHost` owns the engine and publishes it here, so a screen can offer
 * "start the tour" without being a child of the host — the host can sit anywhere in the layout.
 */
let current: TourHandle | null = null;
const listeners = new Set<() => void>();

export function publishTour(engine: TourHandle | null): void {
  current = engine;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function snapshot(): TourHandle | null {
  return current;
}

/** The tour, from anywhere in the app. Null until `TourHost` has mounted. */
export function useTour(): TourHandle | null {
  return useSyncExternalStore(subscribe, snapshot);
}
