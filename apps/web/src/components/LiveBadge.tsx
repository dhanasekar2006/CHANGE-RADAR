import { useLiveStore, type LiveStatus } from "@/store/live";

const STYLE: Record<LiveStatus, { dot: string; label: string; title: string }> = {
  live: { dot: "bg-good", label: "Live", title: "Prices update the moment they change." },
  connecting: { dot: "bg-ink-3 animate-pulse", label: "Connecting", title: "Opening the live price feed…" },
  polling: {
    dot: "bg-warn",
    label: "Polling",
    title: "Live feed unavailable; refreshing every 60 seconds and reconnecting.",
  },
};

export function LiveBadge() {
  const status = useLiveStore((s) => s.status);
  const { dot, label, title } = STYLE[status];
  return (
    <span title={title} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink-2">
      <span aria-hidden className={`h-2 w-2 rounded-full ${dot}`} />
      {label}
    </span>
  );
}
