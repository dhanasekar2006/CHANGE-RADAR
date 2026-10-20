import clsx from "clsx";

export function StatCard({ label, value, tone }: { label: string; value: string; tone?: "good" | "bad" }) {
  return (
    <div className="rounded-row bg-surface-2 p-4">
      <dt className="text-[13px] font-semibold text-ink-2">{label}</dt>
      <dd
        className={clsx(
          "mt-1 text-xl font-extrabold tabular-nums",
          tone === "good" ? "text-good" : tone === "bad" ? "text-warn" : "text-ink",
        )}
      >
        {value}
      </dd>
    </div>
  );
}
