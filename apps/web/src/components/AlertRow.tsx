import { Check, Eye, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

import { useDeleteAlert, useUpdateAlert } from "@/api/priceHooks";
import { Badge } from "@/components/ui/Badge";
import { Button, IconButton } from "@/components/ui/Button";
import { isReached } from "@/lib/alertStatus";
import { formatINR } from "@/lib/format";
import type { AlertChannel, PriceAlert } from "@/types/prices";

function channelLabel(channel: AlertChannel): string {
  if (channel.type === "whatsapp") return `WhatsApp ••${(channel.phone ?? "").slice(-4)}`;
  return channel.type === "email" ? "Email" : "Telegram";
}

export function AlertRow({ alert }: { alert: PriceAlert }) {
  const update = useUpdateAlert();
  const remove = useDeleteAlert();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(alert.target_price));

  const pending = alert.id.startsWith("pending-");
  const reached = isReached(alert);

  function save() {
    const next = Number(draft);
    if (next > 0 && next !== alert.target_price) update.mutate({ id: alert.id, patch: { target_price: next } });
    setEditing(false);
  }

  return (
    <li className={`rounded-card bg-surface p-5 shadow-soft ${pending ? "opacity-60" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <Link to={`/prices/p/${alert.product_id}`} className="block truncate text-[15px] font-bold text-ink hover:underline">
            {alert.product_name}
          </Link>
          <p className="text-[13px] text-ink-2">
            Now <span className="font-extrabold tabular-nums text-ink">{formatINR(alert.current_price)}</span>
            {" · "}target{" "}
            {editing ? (
              <span className="inline-flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  autoFocus
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && save()}
                  aria-label="New target price"
                  className="min-h-[36px] w-28 rounded-row border border-line bg-surface-2 px-3 text-sm text-ink"
                />
                <button onClick={save} className="min-h-[36px] text-xs font-bold text-accent-strong hover:underline">
                  Save
                </button>
              </span>
            ) : (
              <span className="font-extrabold tabular-nums text-ink">{formatINR(alert.target_price)}</span>
            )}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {reached ? (
              <Badge tone="good">
                <Check size={14} strokeWidth={1.75} aria-hidden />
                Target reached
              </Badge>
            ) : (
              <Badge tone="neutral">
                <Eye size={14} strokeWidth={1.75} aria-hidden />
                Watching
              </Badge>
            )}
            <span className="text-xs text-ink-2">
              {alert.triggered_at
                ? "Triggered. Change the target to re-arm it."
                : reached
                  ? "At target now; you'll be notified on the next check."
                  : "Waiting for the price to drop."}
            </span>
          </div>
          <p className="text-xs text-ink-2">
            {alert.channels.length > 0 ? `Notify via ${alert.channels.map(channelLabel).join(" · ")}` : "On-screen notice only"}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          {!editing && (
            <Button variant="secondary" onClick={() => setEditing(true)} disabled={pending} className="!min-h-[44px]">
              <Pencil size={16} strokeWidth={1.75} aria-hidden />
              Edit
            </Button>
          )}
          <IconButton label="Remove" onClick={() => remove.mutate(alert.id)} disabled={pending}>
            <Trash2 size={20} strokeWidth={1.75} aria-hidden />
          </IconButton>
        </div>
      </div>
    </li>
  );
}
