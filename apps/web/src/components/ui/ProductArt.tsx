import clsx from "clsx";
import type { ReactNode } from "react";

import type { ArtKind } from "@/lib/productArt";

// Flat product illustrations on a 120×120 grid. Colors come from design tokens so dark mode follows.
const ART: Record<ArtKind, ReactNode> = {
  phone: (
    <>
      <rect x="38" y="12" width="44" height="96" rx="9" className="fill-ink" />
      <rect
        x="42"
        y="18"
        width="36"
        height="84"
        rx="5"
        className="fill-accent-soft"
      />
      <rect x="52" y="14" width="16" height="4" rx="2" className="fill-ink-2" />
      <circle cx="60" cy="48" r="10" className="fill-accent" />
      <rect
        x="47"
        y="68"
        width="26"
        height="5"
        rx="2.5"
        className="fill-surface"
      />
      <rect
        x="47"
        y="78"
        width="16"
        height="5"
        rx="2.5"
        className="fill-surface"
      />
    </>
  ),
  headphones: (
    <>
      <path
        d="M26 70V60a34 34 0 0 1 68 0v10"
        fill="none"
        strokeWidth="7"
        strokeLinecap="round"
        className="stroke-ink"
      />
      <rect
        x="18"
        y="62"
        width="22"
        height="38"
        rx="10"
        className="fill-accent"
      />
      <rect
        x="80"
        y="62"
        width="22"
        height="38"
        rx="10"
        className="fill-accent"
      />
      <rect
        x="24"
        y="70"
        width="10"
        height="22"
        rx="5"
        className="fill-accent-soft"
      />
      <rect
        x="86"
        y="70"
        width="10"
        height="22"
        rx="5"
        className="fill-accent-soft"
      />
    </>
  ),
  laptop: (
    <>
      <rect x="22" y="26" width="76" height="52" rx="6" className="fill-ink" />
      <rect
        x="27"
        y="31"
        width="66"
        height="42"
        rx="3"
        className="fill-accent-soft"
      />
      <path d="M32 62l14-14 10 9 14-18 18 23z" className="fill-accent" />
      <path
        d="M10 82h100l-6 12a5 5 0 0 1-4.5 3h-79a5 5 0 0 1-4.5-3z"
        className="fill-ink-2"
      />
      <rect
        x="48"
        y="84"
        width="24"
        height="3"
        rx="1.5"
        className="fill-surface"
      />
    </>
  ),
  watch: (
    <>
      <rect
        x="45"
        y="6"
        width="30"
        height="108"
        rx="12"
        className="fill-ink-2"
      />
      <rect x="31" y="31" width="58" height="58" rx="16" className="fill-ink" />
      <rect
        x="36"
        y="36"
        width="48"
        height="48"
        rx="12"
        className="fill-accent-soft"
      />
      <path
        d="M60 46v15l10 6"
        fill="none"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="stroke-accent"
      />
      <rect x="89" y="52" width="5" height="12" rx="2.5" className="fill-ink" />
    </>
  ),
  tv: (
    <>
      <rect x="12" y="22" width="96" height="62" rx="6" className="fill-ink" />
      <rect
        x="17"
        y="27"
        width="86"
        height="52"
        rx="3"
        className="fill-accent-soft"
      />
      <circle cx="40" cy="44" r="7" className="fill-accent" />
      <path
        d="M17 79l30-22 20 14 14-10 22 18z"
        className="fill-accent"
        opacity="0.8"
      />
      <rect x="50" y="84" width="20" height="10" className="fill-ink-2" />
      <rect x="36" y="94" width="48" height="6" rx="3" className="fill-ink-2" />
    </>
  ),
  camera: (
    <>
      <rect x="12" y="34" width="96" height="62" rx="10" className="fill-ink" />
      <path d="M40 34l5-12h30l5 12z" className="fill-ink-2" />
      <circle cx="60" cy="65" r="25" className="fill-ink-2" />
      <circle cx="60" cy="65" r="18" className="fill-accent-soft" />
      <circle cx="60" cy="65" r="10" className="fill-accent" />
      <circle cx="54" cy="59" r="3" className="fill-surface" />
      <circle cx="94" cy="46" r="4" className="fill-accent" />
    </>
  ),
  shoe: (
    <>
      <path
        d="M10 80V52c0-4 4-6 8-5l16 4c6 2 12-2 14-8l2-6 14 10c6 5 14 8 22 10l16 5c6 2 10 6 10 12v6z"
        className="fill-accent"
      />
      <rect x="8" y="80" width="104" height="14" rx="7" className="fill-ink" />
      <path
        d="M52 50l8 8m0-14l8 8m2-2l8 8"
        fill="none"
        strokeWidth="3.5"
        strokeLinecap="round"
        className="stroke-surface"
      />
    </>
  ),
  speaker: (
    <>
      <rect
        x="30"
        y="10"
        width="60"
        height="100"
        rx="14"
        className="fill-ink"
      />
      <circle cx="60" cy="38" r="9" className="fill-ink-2" />
      <circle cx="60" cy="78" r="22" className="fill-ink-2" />
      <circle cx="60" cy="78" r="14" className="fill-accent" />
      <circle cx="60" cy="78" r="5" className="fill-accent-soft" />
    </>
  ),
  box: (
    <>
      <path d="M60 14l42 18v52L60 106 18 84V32z" className="fill-accent-soft" />
      <path d="M60 14l42 18-42 18-42-18z" className="fill-accent" />
      <path d="M60 50v56L18 84V32z" className="fill-ink-2" opacity="0.35" />
      <path d="M42 24l42 18v12L42 36z" className="fill-surface" opacity="0.9" />
    </>
  ),
};

/** Illustration for products without a photo. Decorative: the product name is always shown beside it. */
export function ProductArt({
  kind,
  className,
}: {
  kind: ArtKind;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 120 120"
      aria-hidden
      className={clsx("bg-surface-2", className)}
      preserveAspectRatio="xMidYMid meet"
    >
      <g transform="translate(12 12) scale(0.8)">{ART[kind]}</g>
    </svg>
  );
}
