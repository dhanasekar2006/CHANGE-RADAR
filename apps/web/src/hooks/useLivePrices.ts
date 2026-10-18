import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { applyLiveUpdate } from "@/api/applyLiveUpdate";
import { USE_MOCK, priceSocketUrl } from "@/api/config";
import { useLiveStore } from "@/store/live";
import { isPriceUpdate } from "@/types/prices";

const BASE_DELAY_MS = 1_000;
const MAX_DELAY_MS = 30_000;

/** Exponential backoff with jitter: ~1s, 2s, 4s ... capped at 30s. */
export function reconnectDelay(attempt: number, random: () => number = Math.random): number {
  const ceiling = Math.min(MAX_DELAY_MS, BASE_DELAY_MS * 2 ** attempt);
  return ceiling / 2 + random() * (ceiling / 2);
}

/**
 * Keeps one WebSocket to /ws/prices open for the lifetime of the price layout
 * and feeds each message into the query cache. While it's down the status is
 * "polling" and the 60s refetch intervals keep the data fresh; on reconnect
 * everything is refetched once to cover whatever was missed.
 */
export function useLivePrices(): void {
  const queryClient = useQueryClient();
  const setStatus = useLiveStore((s) => s.setStatus);

  useEffect(() => {
    if (USE_MOCK) {
      setStatus("live");
      let stop: (() => void) | undefined;
      let cancelled = false;
      void import("@/data/mock").then(({ startMockFeed }) => {
        if (!cancelled) stop = startMockFeed((msg) => applyLiveUpdate(queryClient, msg));
      });
      return () => {
        cancelled = true;
        stop?.();
      };
    }

    let socket: WebSocket | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let attempt = 0;
    let hadOutage = false;
    let disposed = false;

    const connect = () => {
      if (disposed) return;
      setStatus(attempt === 0 ? "connecting" : "polling");

      try {
        socket = new WebSocket(priceSocketUrl());
      } catch {
        scheduleReconnect();
        return;
      }

      socket.onopen = () => {
        attempt = 0;
        setStatus("live");
        if (hadOutage) {
          hadOutage = false;
          void queryClient.invalidateQueries({ predicate: (q) => ["product", "history", "deals", "search"].includes(String(q.queryKey[0])) });
        }
      };

      socket.onmessage = (event) => {
        try {
          const data: unknown = JSON.parse(String(event.data));
          if (isPriceUpdate(data)) applyLiveUpdate(queryClient, data);
        } catch {
          // Ignore malformed frames; the next valid one still applies.
        }
      };

      socket.onclose = () => {
        socket = null;
        if (!disposed) scheduleReconnect();
      };
      // Errors are always followed by close, which owns the retry.
      socket.onerror = () => socket?.close();
    };

    const scheduleReconnect = () => {
      hadOutage = true;
      setStatus("polling");
      timer = setTimeout(connect, reconnectDelay(attempt++));
    };

    const reconnectNow = () => {
      if (disposed || socket) return;
      clearTimeout(timer);
      attempt = 0;
      connect();
    };

    connect();
    window.addEventListener("online", reconnectNow);

    return () => {
      disposed = true;
      clearTimeout(timer);
      window.removeEventListener("online", reconnectNow);
      socket?.close();
    };
  }, [queryClient, setStatus]);
}
