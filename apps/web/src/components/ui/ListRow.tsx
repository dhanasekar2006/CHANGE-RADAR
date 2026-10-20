import { ChevronRight, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

interface ListRowProps {
  icon?: LucideIcon;
  label: string;
  value?: ReactNode;
  /** Route to open; shows a chevron. */
  to?: string;
  /** A control (e.g. a Toggle) shown at the end of the row. */
  action?: ReactNode;
}

export function ListRow({ icon: Icon, label, value, to, action }: ListRowProps) {
  const body = (
    <>
      {Icon && (
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-2 text-ink">
          <Icon size={20} strokeWidth={1.75} aria-hidden />
        </span>
      )}
      <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-ink">{label}</span>
      {value !== undefined && <span className="text-[13px] text-ink-2">{value}</span>}
      {action}
      {to && <ChevronRight size={20} strokeWidth={1.75} aria-hidden className="shrink-0 text-ink-3" />}
    </>
  );
  const cls = "flex min-h-[56px] items-center gap-3 rounded-row px-2 py-2";
  return to ? (
    <Link to={to} className={`${cls} transition-colors duration-150 hover:bg-surface-2`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}
