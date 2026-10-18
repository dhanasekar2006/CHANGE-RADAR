import { useMemo, useState } from "react";

import { formatINR } from "@/lib/format";
import { buildStoreSeries, priceAt, type StoreSeries } from "@/lib/priceStats";
import type { HistoryPoint, HistoryRange } from "@/types/prices";

const DAY = 24 * 60 * 60 * 1000;
const RANGE_DAYS: Record<HistoryRange, number> = { "1M": 30, "3M": 90, "6M": 180 };
const COLORS = ["#1d4ed8", "#475569", "#0f766e", "#b45309", "#6d28d9"];

const W = 720;
const H = 280;
const M = { left: 72, right: 16, top: 16, bottom: 28 };
const PLOT_W = W - M.left - M.right;
const PLOT_H = H - M.top - M.bottom;

const dateLabel = (t: number) => new Date(t).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

/**
 * Step chart of every store's price over the range. Prices only change at the
 * recorded points, so each line holds flat until the next change (and out to
 * "now"). Hover to read each store's price at that moment.
 */
export function PriceChart({ history, range, now }: { history: HistoryPoint[]; range: HistoryRange; now: number }) {
  const [hoverT, setHoverT] = useState<number | null>(null);

  const { series, tMin, yMin, yMax } = useMemo(() => {
    const built = buildStoreSeries(history);
    const prices = built.flatMap((s) => s.points.map((p) => p.price));
    const lo = Math.min(...prices);
    const hi = Math.max(...prices);
    const pad = hi === lo ? Math.max(1, lo * 0.05) : (hi - lo) * 0.08;
    return { series: built, tMin: now - RANGE_DAYS[range] * DAY, yMin: lo - pad, yMax: hi + pad };
  }, [history, range, now]);

  const x = (t: number) => M.left + ((t - tMin) / (now - tMin)) * PLOT_W;
  const y = (price: number) => M.top + (1 - (price - yMin) / (yMax - yMin)) * PLOT_H;

  const path = (s: StoreSeries) => {
    const pts = s.points.filter((p) => p.t <= now);
    if (pts.length === 0) return "";
    let d = `M${x(Math.max(pts[0].t, tMin))},${y(pts[0].price)}`;
    for (const p of pts.slice(1)) d += ` H${x(p.t)} V${y(p.price)}`;
    return `${d} H${x(now)}`;
  };

  const yTicks = [0, 1, 2, 3].map((i) => yMin + ((yMax - yMin) * i) / 3);
  const xTicks = [0, 1, 2, 3].map((i) => tMin + ((now - tMin) * i) / 3);

  const onMove = (event: React.PointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const px = ((event.clientX - rect.left) / rect.width) * W;
    const ratio = Math.min(1, Math.max(0, (px - M.left) / PLOT_W));
    setHoverT(tMin + ratio * (now - tMin));
  };

  const at = hoverT ?? now;

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Price history for the last ${range}`}
        className="w-full touch-none select-none"
        onPointerMove={onMove}
        onPointerLeave={() => setHoverT(null)}
      >
        {yTicks.map((tick) => (
          <g key={tick}>
            <line x1={M.left} x2={W - M.right} y1={y(tick)} y2={y(tick)} stroke="#e5e7eb" />
            <text x={M.left - 8} y={y(tick) + 4} textAnchor="end" fontSize="11" fill="#64748b">
              {formatINR(Math.round(tick))}
            </text>
          </g>
        ))}
        {xTicks.map((tick, i) => (
          <text key={tick} x={x(tick)} y={H - 8} fontSize="11" fill="#64748b" textAnchor={i === 0 ? "start" : i === xTicks.length - 1 ? "end" : "middle"}>
            {dateLabel(tick)}
          </text>
        ))}

        {series.map((s, i) => (
          <path key={s.store} d={path(s)} fill="none" stroke={COLORS[i % COLORS.length]} strokeWidth={2} strokeLinejoin="round" />
        ))}

        {hoverT !== null && (
          <line x1={x(hoverT)} x2={x(hoverT)} y1={M.top} y2={M.top + PLOT_H} stroke="#94a3b8" strokeDasharray="4 3" />
        )}
      </svg>

      <ul className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-slate-400">
        <li className="text-slate-500">{hoverT === null ? "Now" : dateLabel(hoverT)}</li>
        {series.map((s, i) => (
          <li key={s.store} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
            <span className="capitalize">{s.store}</span>
            <span className="font-medium text-slate-200">{formatINR(priceAt(s.points, at))}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
