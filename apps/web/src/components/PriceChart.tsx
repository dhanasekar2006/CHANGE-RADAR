import { useMemo, useState } from "react";

import { formatINR } from "@/lib/format";
import { bestPriceSeries, buildStoreSeries, priceAt, type StepPoint } from "@/lib/priceStats";
import type { HistoryPoint, HistoryRange } from "@/types/prices";

const DAY = 24 * 60 * 60 * 1000;
const RANGE_DAYS: Record<HistoryRange, number> = { "1M": 30, "3M": 90, "6M": 180 };
// Literal class names so Tailwind keeps them; index i is shared by the line and its legend dot.
const LINE = ["stroke-accent", "stroke-good", "stroke-warn", "stroke-ink-2", "stroke-ink-3"];
const DOT = ["bg-accent", "bg-good", "bg-warn", "bg-ink-2", "bg-ink-3"];

const W = 720;
const H = 280;
const M = { left: 72, right: 16, top: 16, bottom: 28 };
const PLOT_W = W - M.left - M.right;
const PLOT_H = H - M.top - M.bottom;

const dateLabel = (t: number) => new Date(t).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

/**
 * Step chart of every store's price over the range, with a soft fill under the cheapest price.
 * Prices only change at the recorded points, so each line holds flat until the next change (and
 * out to "now"). Hover or touch to read each store's price at that moment.
 */
export function PriceChart({ history, range, now }: { history: HistoryPoint[]; range: HistoryRange; now: number }) {
  const [hoverT, setHoverT] = useState<number | null>(null);

  const { series, best, tMin, yMin, yMax } = useMemo(() => {
    const built = buildStoreSeries(history);
    const prices = built.flatMap((s) => s.points.map((p) => p.price));
    const lo = Math.min(...prices);
    const hi = Math.max(...prices);
    const pad = hi === lo ? Math.max(1, lo * 0.05) : (hi - lo) * 0.08;
    return {
      series: built,
      best: bestPriceSeries(built),
      tMin: now - RANGE_DAYS[range] * DAY,
      yMin: lo - pad,
      yMax: hi + pad,
    };
  }, [history, range, now]);

  const x = (t: number) => M.left + ((t - tMin) / (now - tMin)) * PLOT_W;
  const y = (price: number) => M.top + (1 - (price - yMin) / (yMax - yMin)) * PLOT_H;

  const stepPath = (points: StepPoint[]) => {
    const pts = points.filter((p) => p.t <= now);
    if (pts.length === 0) return "";
    let d = `M${x(Math.max(pts[0].t, tMin))},${y(pts[0].price)}`;
    for (const p of pts.slice(1)) d += ` H${x(p.t)} V${y(p.price)}`;
    return `${d} H${x(now)}`;
  };

  const bestLine = stepPath(best);
  const bestStart = best.length > 0 ? x(Math.max(best[0].t, tMin)) : M.left;
  const area = bestLine ? `${bestLine} V${M.top + PLOT_H} H${bestStart} Z` : "";

  const yTicks = [0, 1, 2, 3].map((i) => yMin + ((yMax - yMin) * i) / 3);
  const xTicks = [0, 1, 2, 3].map((i) => tMin + ((now - tMin) * i) / 3);

  const onMove = (event: React.PointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const px = ((event.clientX - rect.left) / rect.width) * W;
    const ratio = Math.min(1, Math.max(0, (px - M.left) / PLOT_W));
    setHoverT(tMin + ratio * (now - tMin));
  };

  const at = hoverT ?? now;
  const tooltipLeft = hoverT === null ? 0 : Math.min(86, Math.max(14, (x(hoverT) / W) * 100));

  return (
    <div>
      <div className="relative">
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
              <line x1={M.left} x2={W - M.right} y1={y(tick)} y2={y(tick)} className="stroke-line" />
              <text x={M.left - 8} y={y(tick) + 4} textAnchor="end" fontSize="11" className="fill-ink-2">
                {formatINR(Math.round(tick))}
              </text>
            </g>
          ))}
          {xTicks.map((tick, i) => (
            <text
              key={tick}
              x={x(tick)}
              y={H - 8}
              fontSize="11"
              className="fill-ink-2"
              textAnchor={i === 0 ? "start" : i === xTicks.length - 1 ? "end" : "middle"}
            >
              {dateLabel(tick)}
            </text>
          ))}

          {area && <path d={area} className="fill-accent/10" />}
          {series.map((s, i) => (
            <path
              key={s.store}
              d={stepPath(s.points)}
              fill="none"
              strokeWidth={i === 0 ? 2.5 : 2}
              strokeLinejoin="round"
              strokeLinecap="round"
              className={LINE[i % LINE.length]}
            />
          ))}

          {hoverT !== null && (
            <line x1={x(hoverT)} x2={x(hoverT)} y1={M.top} y2={M.top + PLOT_H} strokeDasharray="4 3" className="stroke-ink-3" />
          )}
        </svg>

        {hoverT !== null && (
          <div
            aria-hidden
            style={{ left: `${tooltipLeft}%` }}
            className="pointer-events-none absolute top-0 -translate-x-1/2 rounded-row bg-ink px-3 py-2 text-xs text-surface shadow-soft"
          >
            <p className="font-bold">{dateLabel(hoverT)}</p>
            {series.map((s) => (
              <p key={s.store} className="capitalize tabular-nums">
                {s.store}: {formatINR(priceAt(s.points, hoverT))}
              </p>
            ))}
          </div>
        )}
      </div>

      <ul className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-[13px] text-ink-2">
        <li>{hoverT === null ? "Now" : dateLabel(hoverT)}</li>
        {series.map((s, i) => (
          <li key={s.store} className="flex items-center gap-1.5">
            <span aria-hidden className={`h-2 w-2 rounded-full ${DOT[i % DOT.length]}`} />
            <span className="capitalize">{s.store}</span>
            <span className="font-bold tabular-nums text-ink">{formatINR(priceAt(s.points, at))}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
