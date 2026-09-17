import type { CSSProperties } from "react";
import type { Rect } from "./targets";

/** Deep Ink at half strength: the page stays readable, the highlight is unambiguous. */
const SCRIM = "rgba(15, 43, 49, 0.5)";
const PAD = 6;

function Panel({ style }: { style: CSSProperties }) {
  return <div className="absolute" style={{ background: SCRIM, ...style }} />;
}

/**
 * Dims everything except the target. The cut-out is four panels rather than one big shadow, so it
 * costs nothing to move and never affects layout or scrolling.
 */
export function Spotlight({ rect, cut }: { rect: Rect | null; cut: boolean }) {
  if (!rect || !cut) {
    return <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[60]" style={{ background: SCRIM }} />;
  }
  const top = Math.max(rect.top - PAD, 0);
  const left = Math.max(rect.left - PAD, 0);
  const bottom = rect.top + rect.height + PAD;
  const right = rect.left + rect.width + PAD;
  const height = rect.height + PAD * 2;
  const width = rect.width + PAD * 2;

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[60]">
      <Panel style={{ top: 0, left: 0, right: 0, height: top }} />
      <Panel style={{ top: bottom, left: 0, right: 0, bottom: 0 }} />
      <Panel style={{ top, left: 0, width: left, height }} />
      <Panel style={{ top, left: right, right: 0, height }} />
      <div
        data-tour-hole="true"
        className="absolute rounded-lg ring-1 ring-white/50"
        style={{ top, left, width, height }}
      />
    </div>
  );
}
