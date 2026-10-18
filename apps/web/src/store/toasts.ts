import { create } from "zustand";

export type ToastTone = "success" | "info" | "error";

export interface Toast {
  id: number;
  tone: ToastTone;
  title: string;
  body?: string;
}

interface ToastState {
  toasts: Toast[];
  push: (toast: Omit<Toast, "id">, durationMs?: number) => void;
  dismiss: (id: number) => void;
}

let seq = 0;

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  push: (toast, durationMs = 8000) => {
    const id = ++seq;
    set({ toasts: [...get().toasts, { ...toast, id }] });
    setTimeout(() => get().dismiss(id), durationMs);
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));
