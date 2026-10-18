export function LogoMark({
  className = "h-8 w-8",
  fillClass = "fill-sky-600",
}: {
  className?: string;
  /** Tailwind fill class for the tile, so light pages can recolor the mark. */
  fillClass?: string;
}) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={className}>
      <rect width="32" height="32" rx="9" className={fillClass} />
      <circle cx="16" cy="16" r="3" className="fill-white" />
      <circle cx="16" cy="16" r="7.5" fill="none" className="stroke-white/70" strokeWidth="1.6" />
      <circle cx="16" cy="16" r="12" fill="none" className="stroke-white/35" strokeWidth="1.4" />
      <path d="M16 16 L24.5 7.5" className="stroke-white" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ name = "VilaiWatch" }: { name?: string }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark />
      <span className="text-base font-semibold tracking-tight">{name}</span>
    </span>
  );
}
