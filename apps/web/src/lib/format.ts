const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" });

export function formatINR(amount: number | null | undefined): string {
  return amount == null ? "—" : inr.format(amount);
}

/** "just now", "5 min ago", "3 h ago", "2 d ago". Future timestamps (clock skew) read as "just now". */
export function timeAgo(iso: string | null | undefined, now: number = Date.now()): string {
  if (!iso) return "never";
  const seconds = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return `${Math.floor(hours / 24)} d ago`;
}

export function formatPct(value: number): string {
  return `${value.toFixed(1)}%`;
}
