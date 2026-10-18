import { create } from "zustand";

/** "live" = WebSocket connected; "connecting" = first attempt; "polling" = socket down, relying on 60s refetches. */
export type LiveStatus = "connecting" | "live" | "polling";
export type FlashDirection = "down" | "up";

const FLASH_MS = 2500;

interface LiveState {
  status: LiveStatus;
  /** `${productId}:${store}` -> most recent price move, shown briefly on that price. */
  flashes: Record<string, { direction: FlashDirection; id: number }>;
  setStatus: (status: LiveStatus) => void;
  flash: (key: string, direction: FlashDirection) => void;
}

let flashSeq = 0;

export const useLiveStore = create<LiveState>((set, get) => ({
  status: "connecting",
  flashes: {},
  setStatus: (status) => set({ status }),
  flash: (key, direction) => {
    const id = ++flashSeq;
    set({ flashes: { ...get().flashes, [key]: { direction, id } } });
    setTimeout(() => {
      // Only clear our own flash; a newer move on the same price keeps its own timer.
      if (get().flashes[key]?.id !== id) return;
      const rest = { ...get().flashes };
      delete rest[key];
      set({ flashes: rest });
    }, FLASH_MS);
  },
}));

export const flashKey = (productId: string, store: string) => `${productId}:${store}`;
