import { describe, expect, it } from "vitest";

import { appendHistoryPoint, applyPriceUpdate, isPriceChange } from "@/lib/liveUpdates";
import { isPriceUpdate, type HistoryPoint, type PriceUpdateMessage, type ProductDetail } from "@/types/prices";

const detail: ProductDetail = {
  id: "p1",
  name: "Sony WH-1000XM5",
  image_url: null,
  category: "Headphones",
  best_price: 24000,
  best_store: "amazon",
  last_checked_at: "2026-10-14T10:00:00Z",
  listings: [
    { id: "l1", store: "amazon", url: "http://a", price: 24000, in_stock: true, last_checked_at: "2026-10-14T10:00:00Z", is_best: true },
    { id: "l2", store: "flipkart", url: "http://f", price: 25000, in_stock: true, last_checked_at: "2026-10-14T09:00:00Z", is_best: false },
  ],
};

const msg = (overrides: Partial<PriceUpdateMessage> = {}): PriceUpdateMessage => ({
  type: "price_update",
  product_id: "p1",
  store: "flipkart",
  price: 23000,
  old_price: 25000,
  checked_at: "2026-10-14T10:30:00Z",
  ...overrides,
});

describe("applyPriceUpdate", () => {
  it("moves the Best badge when another store becomes cheapest", () => {
    const next = applyPriceUpdate(detail, msg());
    expect(next.best_price).toBe(23000);
    expect(next.best_store).toBe("flipkart");
    expect(next.listings.map((l) => [l.store, l.is_best])).toEqual([
      ["flipkart", true],
      ["amazon", false],
    ]);
    expect(next.last_checked_at).toBe("2026-10-14T10:30:00Z");
  });

  it("updates the checked time on an unchanged price", () => {
    const next = applyPriceUpdate(detail, msg({ store: "amazon", price: 24000, old_price: 24000, checked_at: "2026-10-14T10:45:00Z" }));
    expect(next.listings.find((l) => l.store === "amazon")?.last_checked_at).toBe("2026-10-14T10:45:00Z");
    expect(next.best_store).toBe("amazon");
  });

  it("does not crown an out-of-stock store", () => {
    const next = applyPriceUpdate(detail, msg({ price: 20000, in_stock: false }));
    expect(next.best_store).toBe("amazon");
    expect(next.listings.find((l) => l.store === "flipkart")?.in_stock).toBe(false);
  });

  it("ignores stale messages", () => {
    expect(applyPriceUpdate(detail, msg({ checked_at: "2026-10-14T08:00:00Z" }))).toBe(detail);
  });

  it("ignores other products and unknown stores", () => {
    expect(applyPriceUpdate(detail, msg({ product_id: "other" }))).toBe(detail);
    expect(applyPriceUpdate(detail, msg({ store: "croma" }))).toBe(detail);
  });

  it("matches by listing id when the message has one", () => {
    const next = applyPriceUpdate(detail, msg({ listing_id: "l1", store: "renamed", price: 22000 }));
    expect(next.listings.find((l) => l.id === "l1")?.price).toBe(22000);
  });
});

describe("history & change detection", () => {
  const history: HistoryPoint[] = [{ date: "2026-10-01T00:00:00Z", price: 25000, store: "flipkart" }];

  it("appends a point only when the price changed", () => {
    expect(appendHistoryPoint(history, msg())).toHaveLength(2);
    expect(appendHistoryPoint(history, msg({ price: 25000, old_price: 25000 }))).toBe(history);
  });

  it("appends the first ever price (no old price)", () => {
    expect(appendHistoryPoint([], msg({ old_price: null }))).toHaveLength(1);
  });

  it("does not duplicate a point it already has", () => {
    const once = appendHistoryPoint(history, msg());
    expect(appendHistoryPoint(once, msg())).toBe(once);
  });

  it("flags real price changes", () => {
    expect(isPriceChange(msg())).toBe(true);
    expect(isPriceChange(msg({ price: 25000 }))).toBe(false);
    expect(isPriceChange(msg({ old_price: null }))).toBe(false);
  });
});

describe("isPriceUpdate", () => {
  it("accepts the documented shape and rejects junk", () => {
    expect(isPriceUpdate(msg())).toBe(true);
    expect(isPriceUpdate({ type: "other" })).toBe(false);
    expect(isPriceUpdate({ ...msg(), price: "1" })).toBe(false);
    expect(isPriceUpdate(null)).toBe(false);
  });
});
