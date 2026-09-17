import type { LeadSource } from "@hco/shared";

/**
 * Chart fills derived from the design tokens. Ordered data (funnel stages, lead → deal → won) uses
 * tints of one hue mixed toward the card surface. The steps were checked with the dataviz ordinal
 * validator on white: lightness always steps down by at least 0.06 and the lightest step keeps 2:1
 * contrast against the card.
 */
function tint(cssVar: string, percent: number): string {
  if (percent >= 100) return `var(${cssVar})`;
  return `color-mix(in oklab, var(${cssVar}) ${percent}%, var(--card))`;
}

const SOURCE_STEPS = { noDeal: 62, deal: 82, won: 100 } as const;
export type SourceStep = keyof typeof SOURCE_STEPS;

export function sourceFill(source: LeadSource, step: SourceStep): string {
  return tint(`--channel-${source}`, SOURCE_STEPS[step]);
}

/** Legend swatches for the source chart, in ink so they don't suggest any one channel. */
export function inkFill(step: SourceStep): string {
  return tint("--foreground", SOURCE_STEPS[step]);
}

/** Funnel stages darken from the first stage to the won stage. */
export function stageFill(index: number, total: number): string {
  const percent = total <= 1 ? 100 : Math.round(45 + (55 * index) / (total - 1));
  return tint("--primary", percent);
}

export function primaryFill(percent = 100): string {
  return tint("--primary", percent);
}

/** Bar width as a percentage of the largest value, with a visible sliver for small non-zero values. */
export function barWidth(value: number, max: number): string {
  if (value <= 0 || max <= 0) return "0%";
  return `max(4px, ${((value / max) * 100).toFixed(2)}%)`;
}
