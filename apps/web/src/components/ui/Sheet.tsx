import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";

import { IconButton } from "@/components/ui/Button";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

/** Bottom sheet for small screens: Escape or a backdrop tap closes it, focus returns to the opener. */
export function Sheet({ open, onClose, title, children }: SheetProps) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      opener?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-end bg-ink/40" onClick={onClose}>
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full overflow-y-auto rounded-t-card bg-surface p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-soft outline-none"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-ink">{title}</h2>
          <IconButton label="Close" onClick={onClose}>
            <X size={20} strokeWidth={1.75} aria-hidden />
          </IconButton>
        </div>
        {children}
      </div>
    </div>
  );
}
