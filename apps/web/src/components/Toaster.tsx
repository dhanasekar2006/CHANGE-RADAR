import { useToastStore, type ToastTone } from "@/store/toasts";

const TONE: Record<ToastTone, string> = {
  success: "border-slate-700 border-l-4 border-l-emerald-600 bg-white text-slate-100",
  info: "border-slate-700 border-l-4 border-l-sky-600 bg-white text-slate-100",
  error: "border-slate-700 border-l-4 border-l-red-600 bg-white text-slate-100",
};

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div aria-live="polite" className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-80 flex-col gap-2">
      {toasts.map((toast) => (
        <div key={toast.id} className={`pointer-events-auto rounded-lg border p-3 text-sm shadow-lg ${TONE[toast.tone]}`}>
          <div className="flex items-start justify-between gap-2">
            <p className="font-medium">{toast.title}</p>
            <button onClick={() => dismiss(toast.id)} aria-label="Dismiss" className="opacity-60 hover:opacity-100">
              ×
            </button>
          </div>
          {toast.body && <p className="mt-1 opacity-80">{toast.body}</p>}
        </div>
      ))}
    </div>
  );
}
