// Offline stand-in for the price API (VITE_USE_MOCK=true), so the UI can be
// developed and demoed without the backend. Same shapes as src/api/prices.ts;
// state lives in memory and resets on reload. Nothing here is imported unless
// the mock flag is on.
import type {
  AlertInput,
  Deal,
  HistoryPoint,
  HistoryRange,
  Listing,
  PriceAlert,
  PriceUpdateMessage,
  ProductDetail,
  SearchResponse,
} from "@/types/prices";

const DAY = 24 * 60 * 60 * 1000;
const RANGE_DAYS: Record<HistoryRange, number> = { "1M": 30, "3M": 90, "6M": 180 };

interface MockListing {
  id: string;
  productId: string;
  store: string;
  price: number;
  inStock: boolean;
  checkedAt: number;
  /** [timestamp, price] changes, ascending. */
  changes: [number, number][];
}

interface MockProduct {
  id: string;
  name: string;
  category: string;
}

// mulberry32: tiny seeded PRNG so the generated history is stable between reloads.
function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PRODUCTS: MockProduct[] = [
  { id: "mock-sony", name: "Sony WH-1000XM5 Wireless Headphones", category: "Headphones" },
  { id: "mock-iphone", name: "Apple iPhone 15 (128 GB)", category: "Phones" },
  { id: "mock-galaxy", name: "Samsung Galaxy S24 (256 GB)", category: "Phones" },
];

const BASE: Record<string, [string, number][]> = {
  "mock-sony": [["amazon", 26990], ["flipkart", 27490], ["croma", 28490]],
  "mock-iphone": [["amazon", 71900], ["flipkart", 72900]],
  "mock-galaxy": [["amazon", 79999], ["flipkart", 78999], ["croma", 80999]],
};

function buildListings(now: number): MockListing[] {
  const listings: MockListing[] = [];
  PRODUCTS.forEach((product, pi) => {
    BASE[product.id].forEach(([store, base], si) => {
      const random = rng(pi * 31 + si * 7 + 1);
      const changes: [number, number][] = [];
      let price = base;
      for (let day = 180; day > 0; day -= 4 + Math.floor(random() * 9)) {
        price = Math.round((base * (0.9 + random() * 0.18)) / 10) * 10;
        changes.push([now - day * DAY, price]);
      }
      listings.push({
        id: `${product.id}-${store}`,
        productId: product.id,
        store,
        price,
        inStock: random() > 0.1,
        checkedAt: now - Math.floor(random() * 20) * 60_000,
        changes,
      });
    });
  });
  return listings;
}

const now0 = Date.now();
const listings = buildListings(now0);
let alerts: PriceAlert[] = [];
let alertSeq = 0;

const delay = <T,>(value: T, ms = 250): Promise<T> => new Promise((resolve) => setTimeout(() => resolve(value), ms));
const iso = (t: number) => new Date(t).toISOString();

function bestOf(rows: MockListing[]): MockListing | undefined {
  return rows.filter((l) => l.inStock).sort((a, b) => a.price - b.price)[0];
}

function toDetail(product: MockProduct): ProductDetail {
  const rows = listings.filter((l) => l.productId === product.id);
  const best = bestOf(rows);
  const out: Listing[] = [...rows]
    .sort((a, b) => a.price - b.price)
    .map((l) => ({
      id: l.id,
      store: l.store,
      url: `https://${l.store}.example/${product.id}`,
      price: l.price,
      in_stock: l.inStock,
      last_checked_at: iso(l.checkedAt),
      is_best: l === best,
    }));
  return {
    id: product.id,
    name: product.name,
    image_url: null,
    category: product.category,
    listings: out,
    best_price: best?.price ?? null,
    best_store: best?.store ?? null,
    last_checked_at: iso(Math.max(...rows.map((r) => r.checkedAt))),
  };
}

function findProduct(id: string): MockProduct {
  const product = PRODUCTS.find((p) => p.id === id);
  if (!product) throw Object.assign(new Error("product not found"), { status: 404 });
  return product;
}

export const mockApi = {
  async search(q: string): Promise<SearchResponse> {
    const text = q.trim().toLowerCase();
    const items = PRODUCTS.filter((p) => !text || `${p.name} ${p.category}`.toLowerCase().includes(text)).map((p) => {
      const detail = toDetail(p);
      return {
        id: p.id,
        name: p.name,
        image_url: null,
        category: p.category,
        best_price: detail.best_price,
        store_count: detail.listings.length,
      };
    });
    return delay({ items, query: q, is_url: /^https?:\/\//.test(q.trim()) });
  },

  async product(id: string): Promise<ProductDetail> {
    return delay(toDetail(findProduct(id)));
  },

  async history(id: string, range: HistoryRange): Promise<HistoryPoint[]> {
    findProduct(id);
    const start = Date.now() - RANGE_DAYS[range] * DAY;
    const points: HistoryPoint[] = [];
    for (const l of listings.filter((row) => row.productId === id)) {
      const before = [...l.changes].reverse().find(([t]) => t < start);
      if (before) points.push({ date: iso(start), price: before[1], store: l.store });
      for (const [t, price] of l.changes) if (t >= start) points.push({ date: iso(t), price, store: l.store });
    }
    return delay(points.sort((a, b) => a.date.localeCompare(b.date)));
  },

  async deals(): Promise<Deal[]> {
    const deals: Deal[] = [];
    for (const product of PRODUCTS) {
      const best = bestOf(listings.filter((l) => l.productId === product.id));
      if (!best) continue;
      const recent = best.changes.filter(([t]) => t >= Date.now() - 30 * DAY).map(([, p]) => p);
      if (recent.length === 0) continue;
      const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
      if (best.price >= avg) continue;
      deals.push({
        product_id: product.id,
        name: product.name,
        image_url: null,
        store: best.store,
        price: best.price,
        avg_30d: Math.round(avg),
        drop_amount: Math.round(avg - best.price),
        drop_pct: Math.round(((avg - best.price) / avg) * 1000) / 10,
      });
    }
    return delay(deals.sort((a, b) => b.drop_pct - a.drop_pct));
  },

  async alerts(): Promise<PriceAlert[]> {
    return delay(alerts.map(withCurrent));
  },

  async createAlert(input: AlertInput): Promise<PriceAlert> {
    const product = findProduct(input.product_id);
    const alert: PriceAlert = {
      id: `mock-alert-${++alertSeq}`,
      product_id: product.id,
      product_name: product.name,
      image_url: null,
      target_price: input.target_price,
      channels: input.channels,
      triggered_at: null,
      created_at: new Date().toISOString(),
      current_price: toDetail(product).best_price,
    };
    alerts = [alert, ...alerts];
    return delay(alert);
  },

  async updateAlert(id: string, patch: Partial<AlertInput>): Promise<PriceAlert> {
    const existing = alerts.find((a) => a.id === id);
    if (!existing) throw Object.assign(new Error("alert not found"), { status: 404 });
    const rearm = patch.target_price !== undefined && patch.target_price !== existing.target_price;
    const next = {
      ...existing,
      target_price: patch.target_price ?? existing.target_price,
      channels: patch.channels ?? existing.channels,
      triggered_at: rearm ? null : existing.triggered_at,
    };
    alerts = alerts.map((a) => (a.id === id ? next : a));
    return delay(withCurrent(next));
  },

  async deleteAlert(id: string): Promise<void> {
    alerts = alerts.filter((a) => a.id !== id);
    return delay(undefined);
  },
};

function withCurrent(alert: PriceAlert): PriceAlert {
  return { ...alert, current_price: toDetail(findProduct(alert.product_id)).best_price };
}

/**
 * Emits a random price move every few seconds through the same callback the
 * real WebSocket uses, so live highlighting, charts and toasts can be seen
 * without a backend. Returns a stop function.
 */
export function startMockFeed(onMessage: (msg: PriceUpdateMessage) => void, everyMs = 7000): () => void {
  const timer = setInterval(() => {
    const listing = listings[Math.floor(Math.random() * listings.length)];
    const oldPrice = listing.price;
    const factor = 1 + (Math.random() < 0.6 ? -1 : 1) * (0.01 + Math.random() * 0.04);
    listing.price = Math.round((oldPrice * factor) / 10) * 10;
    listing.checkedAt = Date.now();
    listing.changes.push([listing.checkedAt, listing.price]);
    onMessage({
      type: "price_update",
      product_id: listing.productId,
      store: listing.store,
      price: listing.price,
      old_price: oldPrice,
      in_stock: listing.inStock,
      checked_at: iso(listing.checkedAt),
    });
  }, everyMs);
  return () => clearInterval(timer);
}
