import type { ReactNode } from "react";

const W = 400;
const H = 830;

/** A pointed (two-centred) arch: straight jambs up to the springing line, then two curves meeting at the apex. */
function arch(inset: number) {
  const l = 16 + inset;
  const r = W - 16 - inset;
  const spring = 300 + inset * 0.5;
  const apex = 24 + inset * 1.7;
  const mid = W / 2;
  return `M${l} ${H - 6} V${spring} C${l} ${spring - 150} ${mid - 70} ${apex + 70} ${mid} ${apex} C${mid + 70} ${apex + 70} ${r} ${spring - 150} ${r} ${spring} V${H - 6}`;
}

/**
 * A mihrab arch drawn in gold around the hero's live app. The phone sits below the springing line,
 * so the pointed head of the arch stays visible above it. The outlines draw themselves once on load
 * (.ks-draw in globals.css); with reduced motion they are simply shown.
 */
export function MihrabFrame({ children }: { children: ReactNode }) {
  return (
    <div className="relative mx-auto" style={{ width: W, height: H }}>
      <svg viewBox={`0 0 ${W} ${H}`} className="pointer-events-none absolute inset-0 h-full w-full text-gold" aria-hidden="true">
        <path className="ks-draw" pathLength={1} d={arch(0)} fill="none" stroke="currentColor" strokeWidth="2" />
        <path className="ks-draw ks-draw-late" pathLength={1} d={arch(14)} fill="none" stroke="currentColor" strokeWidth="1" opacity="0.6" />
        {/* eight-pointed star hanging in the head of the arch */}
        <g className="ks-fade" transform={`translate(${W / 2} 150)`} fill="none" stroke="currentColor" strokeWidth="1.5">
          <line x1="0" y1="-78" x2="0" y2="-22" opacity="0.6" />
          <rect x="-16" y="-16" width="32" height="32" />
          <rect x="-16" y="-16" width="32" height="32" transform="rotate(45)" />
          <circle r="5" fill="currentColor" stroke="none" />
        </g>
      </svg>
      <div className="absolute inset-x-[50px] top-[232px]">{children}</div>
    </div>
  );
}
