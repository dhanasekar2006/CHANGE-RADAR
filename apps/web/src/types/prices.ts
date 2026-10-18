// Mirrors apps/api/src/schemas/price.py. Prices are rupees as plain numbers.

export type HistoryRange = "1M" | "3M" | "6M";

export interface ProductSearchItem {
  id: string;
  name: string;
  image_url: string | null;
  category: string | null;
  best_price: number | null;
  store_count: number;
}

export interface SearchResponse {
  items: ProductSearchItem[];
  query: string;
  is_url: boolean;
}

export interface Listing {
  id: string;
  store: string;
  url: string;
  price: number | null;
  in_stock: boolean;
  last_checked_at: string | null;
  is_best: boolean;
}

export interface ProductDetail {
  id: string;
  name: string;
  image_url: string | null;
  category: string | null;
  listings: Listing[];
  best_price: number | null;
  best_store: string | null;
  last_checked_at: string | null;
}

export interface HistoryPoint {
  date: string;
  price: number;
  store: string;
}

export interface Deal {
  product_id: string;
  name: string;
  image_url: string | null;
  store: string;
  price: number;
  avg_30d: number;
  drop_amount: number;
  drop_pct: number;
}

export interface AlertChannel {
  type: "email" | "telegram" | "whatsapp";
  chat_id?: string;
  /** WhatsApp number in international format, e.g. +919876543210. */
  phone?: string;
}

export interface PriceAlert {
  id: string;
  product_id: string;
  product_name: string;
  image_url: string | null;
  target_price: number;
  channels: AlertChannel[];
  triggered_at: string | null;
  created_at: string;
  current_price: number | null;
}

export interface AlertInput {
  product_id: string;
  target_price: number;
  channels: AlertChannel[];
}

/** Published by the worker on Redis and relayed by /ws/prices. */
export interface PriceUpdateMessage {
  type: "price_update";
  product_id: string;
  listing_id?: string;
  store: string;
  price: number;
  old_price: number | null;
  in_stock?: boolean;
  checked_at: string;
}

export function isPriceUpdate(value: unknown): value is PriceUpdateMessage {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    v.type === "price_update" &&
    typeof v.product_id === "string" &&
    typeof v.store === "string" &&
    typeof v.price === "number" &&
    typeof v.checked_at === "string"
  );
}
