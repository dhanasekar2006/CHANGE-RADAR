export function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "good" | "bad";
}) {
  const color =
    tone === "good"
      ? "text-emerald-400"
      : tone === "bad"
        ? "text-orange-400"
        : "text-slate-100";
  return (
    <div className="card p-4">
      <dt className="text-xs font-medium text-slate-400">{label}</dt>
      <dd className={`mt-1 text-xl font-semibold tabular-nums ${color}`}>{value}</dd>
    </div>
  );
}
