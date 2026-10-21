import clsx from "clsx";
import type { ReactNode } from "react";

import type { ArtKind } from "@/lib/productArt";

const BODY = "url(#pa-body)";
const SCREEN = "url(#pa-screen)";
const ACCENT = "url(#pa-accent)";
const GLOSS = "url(#pa-gloss)";

// Shaded product illustrations on a 120×120 grid: body gradients, screen glow, a gloss sweep and a
// ground shadow give depth. Colors come from design tokens, so dark mode follows.
const ART: Record<ArtKind, ReactNode> = {
  phone: (
    <>
      <rect x="36" y="8" width="48" height="100" rx="10" fill={BODY} />
      <rect x="39" y="11" width="42" height="94" rx="8" className="fill-ink" />
      <rect x="41" y="14" width="38" height="88" rx="6" fill={SCREEN} />
      <rect x="53" y="17" width="14" height="4" rx="2" className="fill-ink" />
      <circle cx="60" cy="46" r="11" fill={ACCENT} />
      <circle cx="60" cy="46" r="5" className="fill-surface" opacity="0.5" />
      <rect
        x="47"
        y="66"
        width="26"
        height="5"
        rx="2.5"
        className="fill-surface"
        opacity="0.85"
      />
      <rect
        x="47"
        y="76"
        width="16"
        height="5"
        rx="2.5"
        className="fill-surface"
        opacity="0.6"
      />
      <rect x="47" y="90" width="26" height="7" rx="3.5" fill={ACCENT} />
      <path d="M41 14h22L41 60z" fill={GLOSS} />
      <rect
        x="83.5"
        y="30"
        width="2"
        height="12"
        rx="1"
        className="fill-ink-2"
      />
    </>
  ),
  headphones: (
    <>
      <path
        d="M24 72V60a36 36 0 0 1 72 0v12"
        fill="none"
        strokeWidth="8"
        strokeLinecap="round"
        className="stroke-ink"
      />
      <path
        d="M24 72V60a36 36 0 0 1 72 0v12"
        fill="none"
        strokeWidth="3"
        strokeLinecap="round"
        className="stroke-ink-2"
        opacity="0.7"
        transform="translate(0 -1.5)"
      />
      <rect x="14" y="62" width="26" height="42" rx="12" fill={BODY} />
      <rect x="80" y="62" width="26" height="42" rx="12" fill={BODY} />
      <rect x="20" y="68" width="14" height="30" rx="7" fill={ACCENT} />
      <rect x="86" y="68" width="14" height="30" rx="7" fill={ACCENT} />
      <path d="M17 66h10l-8 30z" fill={GLOSS} />
      <path d="M83 66h10l-8 30z" fill={GLOSS} />
    </>
  ),
  laptop: (
    <>
      <rect x="20" y="22" width="80" height="56" rx="6" fill={BODY} />
      <rect x="25" y="27" width="70" height="46" rx="3" fill={SCREEN} />
      <path d="M30 66l15-16 11 9 15-20 19 27z" fill={ACCENT} opacity="0.85" />
      <circle cx="82" cy="38" r="5" className="fill-surface" opacity="0.7" />
      <path d="M25 27h40L25 66z" fill={GLOSS} />
      <path
        d="M8 80h104l-6 14a5 5 0 0 1-4.6 3H18.6a5 5 0 0 1-4.6-3z"
        fill={BODY}
      />
      <rect
        x="46"
        y="82"
        width="28"
        height="4"
        rx="2"
        className="fill-ink"
        opacity="0.5"
      />
    </>
  ),
  watch: (
    <>
      <rect x="44" y="4" width="32" height="112" rx="13" fill={BODY} />
      <rect x="29" y="29" width="62" height="62" rx="18" fill={BODY} />
      <rect x="34" y="34" width="52" height="52" rx="14" className="fill-ink" />
      <rect x="36" y="36" width="48" height="48" rx="12" fill={SCREEN} />
      <circle
        cx="60"
        cy="60"
        r="17"
        fill="none"
        strokeWidth="3"
        className="stroke-ink-3"
        opacity="0.5"
      />
      <path
        d="M60 48v13l9 6"
        fill="none"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="stroke-ink"
      />
      <circle cx="60" cy="60" r="3" fill={ACCENT} />
      <rect x="90" y="50" width="6" height="14" rx="3" className="fill-ink-2" />
      <path d="M36 36h30L36 66z" fill={GLOSS} />
    </>
  ),
  tv: (
    <>
      <rect x="8" y="18" width="104" height="68" rx="6" fill={BODY} />
      <rect x="12" y="22" width="96" height="60" rx="3" fill={SCREEN} />
      <circle cx="38" cy="42" r="8" fill={ACCENT} />
      <path
        d="M12 78l32-24 22 16 16-12 26 20v4H12z"
        fill={ACCENT}
        opacity="0.85"
      />
      <path d="M12 22h50L12 76z" fill={GLOSS} />
      <path d="M52 86h16l3 10H49z" className="fill-ink-2" />
      <rect x="32" y="96" width="56" height="6" rx="3" fill={BODY} />
    </>
  ),
  camera: (
    <>
      <rect x="10" y="34" width="100" height="64" rx="11" fill={BODY} />
      <path d="M38 34l6-13h32l6 13z" fill={BODY} />
      <circle cx="60" cy="68" r="27" className="fill-ink" />
      <circle cx="60" cy="68" r="22" fill={BODY} />
      <circle cx="60" cy="68" r="16" className="fill-ink" />
      <circle cx="60" cy="68" r="11" fill={ACCENT} />
      <circle cx="54" cy="62" r="4" className="fill-surface" opacity="0.85" />
      <circle cx="95" cy="44" r="4" fill={ACCENT} />
      <rect
        x="18"
        y="40"
        width="14"
        height="6"
        rx="3"
        className="fill-surface"
        opacity="0.5"
      />
      <path d="M14 38h40L14 90z" fill={GLOSS} />
    </>
  ),
  shoe: (
    <>
      <path
        d="M8 82V50c0-5 4-8 9-6l16 5c6 2 12-1 15-7l2-6 15 11c6 5 14 8 22 10l16 5c6 2 10 6 10 12v8z"
        fill={ACCENT}
      />
      <path
        d="M8 82V66c20 0 40 2 60 0s30 4 44 8v8z"
        className="fill-ink"
        opacity="0.12"
      />
      <rect
        x="6"
        y="80"
        width="108"
        height="16"
        rx="8"
        className="fill-surface"
      />
      <rect
        x="6"
        y="88"
        width="108"
        height="8"
        rx="4"
        className="fill-ink"
        opacity="0.25"
      />
      <path
        d="M52 49l8 8m0-14l8 8m2-2l8 8"
        fill="none"
        strokeWidth="3.5"
        strokeLinecap="round"
        className="stroke-surface"
      />
      <path d="M14 50l24 6-24 12z" fill={GLOSS} />
    </>
  ),
  speaker: (
    <>
      <rect x="28" y="6" width="64" height="108" rx="15" fill={BODY} />
      <circle cx="60" cy="34" r="11" className="fill-ink" />
      <circle cx="60" cy="34" r="6" fill={ACCENT} />
      <circle cx="60" cy="78" r="25" className="fill-ink" />
      <circle cx="60" cy="78" r="19" fill={BODY} />
      <circle cx="60" cy="78" r="12" fill={ACCENT} />
      <circle cx="60" cy="78" r="4" className="fill-surface" opacity="0.8" />
      <path d="M31 10h24L31 70z" fill={GLOSS} />
    </>
  ),
  box: (
    <>
      <path d="M60 12l44 19v54L60 108 16 85V31z" fill={BODY} />
      <path d="M60 12l44 19-44 19-44-19z" fill={ACCENT} />
      <path d="M60 50v58L16 85V31z" className="fill-ink" opacity="0.25" />
      <path d="M40 22l44 19v13L40 35z" className="fill-surface" opacity="0.9" />
      <path d="M60 12l44 19-44 19z" fill={GLOSS} />
    </>
  ),
};

function Stop({ offset, token }: { offset: string; token: string }) {
  return <stop offset={offset} style={{ stopColor: `rgb(var(--${token}))` }} />;
}

function Defs() {
  return (
    <defs>
      <linearGradient id="pa-body" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" token="ink-2" />
        <Stop offset="1" token="ink" />
      </linearGradient>
      <linearGradient id="pa-screen" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" token="accent-soft" />
        <Stop offset="1" token="surface" />
      </linearGradient>
      <linearGradient id="pa-accent" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" token="accent" />
        <Stop offset="1" token="accent-strong" />
      </linearGradient>
      <linearGradient id="pa-gloss" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="white" stopOpacity="0.35" />
        <stop offset="1" stopColor="white" stopOpacity="0" />
      </linearGradient>
      <radialGradient id="pa-shadow">
        <stop offset="0" stopColor="black" stopOpacity="0.28" />
        <stop offset="1" stopColor="black" stopOpacity="0" />
      </radialGradient>
    </defs>
  );
}

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
      <Defs />
      <g transform="translate(10 6) scale(0.83)">
        <ellipse cx="60" cy="112" rx="42" ry="6" fill="url(#pa-shadow)" />
        {ART[kind]}
      </g>
    </svg>
  );
}
