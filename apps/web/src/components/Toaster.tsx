import { Toast } from "@/components/ui/Toast";
import { useToastStore } from "@/store/toasts";

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 bottom-24 z-50 flex flex-col gap-2 sm:inset-x-auto sm:right-4 sm:w-80 lg:bottom-4"
    >
      {toasts.map((t) => (
        <Toast key={t.id} tone={t.tone} title={t.title} body={t.body} onDismiss={() => dismiss(t.id)} />
      ))}
    </div>
  );
}
