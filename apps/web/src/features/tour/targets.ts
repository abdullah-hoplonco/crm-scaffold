/** Finding the one real element the tour is talking about, and measuring it. DOM only: no app state. */

export interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export const CARD_WIDTH = 360;
const GAP = 14;
const MARGIN = 12;

/** Below this width the card becomes a bottom sheet, as on a phone. */
export const SHEET_BREAKPOINT = 640;

function selectors(target: string | string[] | undefined): string[] {
  if (!target) return [];
  return Array.isArray(target) ? target : [target];
}

export function isVisible(element: Element): boolean {
  if (!element.isConnected) return false;
  const style = window.getComputedStyle(element);
  if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") return false;
  const rect = element.getBoundingClientRect();
  return rect.width >= 2 && rect.height >= 2;
}

/** The first element matching the first selector that is actually on screen. Hidden duplicates (lg:hidden) lose. */
export function findTarget(target: string | string[] | undefined): Element | null {
  for (const selector of selectors(target)) {
    let matches: Element[];
    try {
      matches = Array.from(document.querySelectorAll(selector));
    } catch {
      continue;
    }
    const visible = matches.find(isVisible);
    if (visible) return visible;
  }
  return null;
}

export function rectOf(element: Element): Rect {
  const rect = element.getBoundingClientRect();
  return { top: rect.top, left: rect.left, width: rect.width, height: rect.height };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

export interface CardPlacement {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
}

/** Beside the spotlight when there is room, pinned to the viewport when there is not. */
export function placeCard(
  rect: Rect | null,
  card: { width: number; height: number },
  viewport: { width: number; height: number },
  preference: "auto" | "above" | "below",
): CardPlacement {
  const width = Math.min(CARD_WIDTH, viewport.width - MARGIN * 2);
  const height = card.height || 190;
  const maxHeight = Math.max(180, viewport.height - MARGIN * 2);
  const centred = {
    top: Math.max(MARGIN, Math.round((viewport.height - height) / 2)),
    left: Math.round((viewport.width - width) / 2),
    width,
    maxHeight,
  };
  if (!rect) return centred;

  const room = {
    below: viewport.height - (rect.top + rect.height) - GAP - MARGIN,
    above: rect.top - GAP - MARGIN,
    right: viewport.width - (rect.left + rect.width) - GAP - MARGIN,
    left: rect.left - GAP - MARGIN,
  };
  const order: ReadonlyArray<keyof typeof room> =
    preference === "above" ? ["above", "below", "right", "left"] : ["below", "above", "right", "left"];
  const preferred: keyof typeof room = preference === "above" ? "above" : "below";
  const side =
    order.find((candidate) => room[candidate] >= height) ??
    order.reduce((best, candidate) => (room[candidate] > room[best] ? candidate : best), preferred);

  const maxLeft = viewport.width - width - MARGIN;
  const maxTop = viewport.height - height - MARGIN;
  let top: number;
  let left: number;
  if (side === "below" || side === "above") {
    top = side === "below" ? rect.top + rect.height + GAP : rect.top - GAP - height;
    left = clamp(rect.left, MARGIN, maxLeft);
  } else {
    left = side === "right" ? rect.left + rect.width + GAP : rect.left - GAP - width;
    top = clamp(rect.top, MARGIN, maxTop);
  }
  return { top: clamp(top, MARGIN, maxTop), left: clamp(left, MARGIN, maxLeft), width, maxHeight };
}
