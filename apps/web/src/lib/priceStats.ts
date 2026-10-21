import type { HistoryPoint } from "@/types/prices";

export interface StepPoint {
  t: number; // epoch ms
  price: number;
}

interface StoreSeries {
  store: string;
  points: StepPoint[]; // ascending; each price holds until the next point (the last until "now")
}

export interface PriceStats {
  lowest: number;
  highest: number;
  average: number; // time-weighted
  current: number;
}

export type AdviceTone = "good" | "fair" | "wait" | "unknown";

interface BuyAdvice {
  tone: AdviceTone;
  headline: string;
  detail: string;
}

const MIN_HISTORY_MS = 24 * 60 * 60 * 1000;

export function buildStoreSeries(history: HistoryPoint[]): StoreSeries[] {
  const byStore = new Map<string, StepPoint[]>();
  for (const p of history) {
    const list = byStore.get(p.store) ?? [];
    list.push({ t: new Date(p.date).getTime(), price: p.price });
    byStore.set(p.store, list);
  }
  return [...byStore.entries()]
    .map(([store, points]) => ({ store, points: points.sort((a, b) => a.t - b.t) }))
    .sort((a, b) => a.store.localeCompare(b.store));
}

/** The cheapest price across stores over time: at each change, the minimum of every store's price then in effect. */
export function bestPriceSeries(series: StoreSeries[]): StepPoint[] {
  const events = series
    .flatMap((s) => s.points.map((p) => ({ ...p, store: s.store })))
    .sort((a, b) => a.t - b.t);

  const inEffect = new Map<string, number>();
  const best: StepPoint[] = [];
  for (const event of events) {
    inEffect.set(event.store, event.price);
    const price = Math.min(...inEffect.values());
    const last = best[best.length - 1];
    if (last && last.t === event.t) last.price = price;
    else if (!last || last.price !== price) best.push({ t: event.t, price });
  }
  return best;
}

export function computeStats(best: StepPoint[], now: number): PriceStats | null {
  if (best.length === 0) return null;

  let weighted = 0;
  let span = 0;
  best.forEach((point, i) => {
    const end = i + 1 < best.length ? best[i + 1].t : now;
    const duration = Math.max(0, end - point.t);
    weighted += point.price * duration;
    span += duration;
  });

  const prices = best.map((p) => p.price);
  return {
    lowest: Math.min(...prices),
    highest: Math.max(...prices),
    average: span > 0 ? weighted / span : prices[prices.length - 1],
    current: prices[prices.length - 1],
  };
}

/** Whether `current` is a good price relative to the range's own history. */
export function buyAdvice(stats: PriceStats | null, best: StepPoint[], rangeLabel: string, now: number): BuyAdvice {
  if (!stats || best.length === 0 || now - best[0].t < MIN_HISTORY_MS || stats.highest === stats.lowest) {
    return {
      tone: "unknown",
      headline: "Not enough history yet",
      detail: "We need a price change over a day or more before we can say whether this is a good time to buy.",
    };
  }

  const { current, average, lowest } = stats;
  const belowAvg = ((average - current) / average) * 100;

  if (current <= lowest * 1.02) {
    return {
      tone: "good",
      headline: "Good time to buy",
      detail: `At or within 2% of the lowest price in the last ${rangeLabel}.`,
    };
  }
  if (belowAvg >= 5) {
    return {
      tone: "good",
      headline: "Good time to buy",
      detail: `${belowAvg.toFixed(1)}% below the ${rangeLabel} average.`,
    };
  }
  if (belowAvg <= -5) {
    return {
      tone: "wait",
      headline: "Consider waiting",
      detail: `${Math.abs(belowAvg).toFixed(1)}% above the ${rangeLabel} average.`,
    };
  }
  return { tone: "fair", headline: "Fair price", detail: `Close to the ${rangeLabel} average.` };
}

/** Price in effect at time `t` for a step series, or null before its first point. */
export function priceAt(points: StepPoint[], t: number): number | null {
  let price: number | null = null;
  for (const p of points) {
    if (p.t > t) break;
    price = p.price;
  }
  return price;
}
