import clsx from "clsx";
import { X } from "lucide-react";

import type { ToastTone } from "@/store/toasts";

const stripe: Record<ToastTone, string> = {
  success: "bg-good",
  info: "bg-accent",
  error: "bg-warn",
};

interface ToastProps {
  tone: ToastTone;
  title: string;
  body?: string;
  onDismiss: () => void;
}

export function Toast({ tone, title, body, onDismiss }: ToastProps) {
  return (
    <div className="pointer-events-auto flex gap-3 rounded-row bg-surface p-4 text-sm shadow-soft ring-1 ring-line">
      <span aria-hidden className={clsx("w-1 shrink-0 rounded-full", stripe[tone])} />
      <div className="min-w-0 flex-1">
        <p className="font-bold text-ink">{title}</p>
        {body && <p className="mt-1 text-ink-2">{body}</p>}
      </div>
      <button type="button" onClick={onDismiss} aria-label="Dismiss" className="h-6 w-6 shrink-0 text-ink-3 hover:text-ink">
        <X size={20} strokeWidth={1.75} aria-hidden />
      </button>
    </div>
  );
}
