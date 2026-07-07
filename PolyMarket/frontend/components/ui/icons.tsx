import type { SVGProps } from "react";

const base = (p: SVGProps<SVGSVGElement>) => ({
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  ...p,
});

export const IconChevronRight = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="m9 18 6-6-6-6" /></svg>
);
export const IconWallet = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><rect x="3" y="6" width="18" height="13" rx="2.5" /><path d="M3 10h18M17 14h.01" /></svg>
);
export const IconClock = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
);
// Monochrome folded-origami mark echoing Polymarket's brand glyph.
export const IconPolymarket = (p: SVGProps<SVGSVGElement>) => (
  <svg width={22} height={22} viewBox="0 0 24 24" fill="none" {...p}>
    <path d="M3.2 6.4 12 2l8.8 4.4-3 1.6L12 5.1 6.2 8z" fill="currentColor" />
    <path d="M3.2 6.4 6.2 8v8l-3 1.6z" fill="currentColor" opacity="0.55" />
    <path d="M20.8 6.4 17.8 8v8l3 1.6z" fill="currentColor" opacity="0.85" />
    <path d="M6.2 16 12 18.9 17.8 16l3 1.6L12 22l-8.8-4.4z" fill="currentColor" opacity="0.7" />
  </svg>
);
export const IconArrowUpRight = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M7 17 17 7M8 7h9v9" /></svg>
);
