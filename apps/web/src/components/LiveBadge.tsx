import { useLiveStore, type LiveStatus } from "@/store/live";

const STYLE: Record<LiveStatus, { dot: string; label: string; title: string }> = {
  live: { dot: "bg-emerald-400", label: "Live", title: "Prices update the moment they change." },
  connecting: { dot: "bg-slate-500 animate-pulse", label: "Connecting", title: "Opening the live price feed…" },
  polling: {
    dot: "bg-amber-400",
    label: "Polling",
    title: "Live feed unavailable; refreshing every 60 seconds and reconnecting.",
  },
};

export function LiveBadge() {
  const status = useLiveStore((s) => s.status);
  const { dot, label, title } = STYLE[status];
  return (
    <span title={title} className="inline-flex items-center gap-1.5 rounded-full border border-slate-800 bg-white px-2.5 py-1 text-xs font-medium text-slate-300">
      <span className={`h-2 w-2 rounded-full ${dot}`} />
      {label}
    </span>
  );
}
