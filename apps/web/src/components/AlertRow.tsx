import { useState } from "react";
import { Link } from "react-router-dom";

import { useDeleteAlert, useUpdateAlert } from "@/api/priceHooks";
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
  const reached =
    alert.current_price !== null && alert.current_price <= alert.target_price;

  function save() {
    const next = Number(draft);
    if (next > 0 && next !== alert.target_price)
      update.mutate({ id: alert.id, patch: { target_price: next } });
    setEditing(false);
  }

  return (
    <li
      className={`rounded-lg border border-slate-800 p-4 ${pending ? "opacity-60" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            to={`/prices/p/${alert.product_id}`}
            className="block truncate font-medium hover:underline"
          >
            {alert.product_name}
          </Link>
          <p className="mt-1 text-sm text-slate-400">
            Now{" "}
            <span className="font-medium text-slate-200">
              {formatINR(alert.current_price)}
            </span>
            {" · "}target{" "}
            {editing ? (
              <span className="inline-flex items-center gap-1">
                <input
                  type="number"
                  min={1}
                  autoFocus
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && save()}
                  aria-label="New target price"
                  className="w-28 rounded border border-slate-700 bg-slate-900 px-2 py-0.5 text-sm"
                />
                <button
                  onClick={save}
                  className="text-xs text-sky-400 hover:underline"
                >
                  Save
                </button>
              </span>
            ) : (
              <span className="font-medium text-slate-200">
                {formatINR(alert.target_price)}
              </span>
            )}
          </p>
          <p className="mt-1 text-xs">
            {alert.triggered_at ? (
              <span className="text-emerald-400">
                Triggered — change the target to re-arm it
              </span>
            ) : reached ? (
              <span className="text-amber-400">
                At target now; you'll be notified on the next check
              </span>
            ) : (
              <span className="text-slate-500">
                Waiting for the price to drop
              </span>
            )}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {alert.channels.length > 0
              ? `Notify via ${alert.channels.map(channelLabel).join(" · ")}`
              : "On-screen notice only"}
          </p>
        </div>
        <div className="flex shrink-0 gap-3 text-xs">
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              disabled={pending}
              className="text-slate-400 hover:text-slate-200"
            >
              Edit
            </button>
          )}
          <button
            onClick={() => remove.mutate(alert.id)}
            disabled={pending}
            className="text-slate-400 hover:text-red-400"
          >
            Remove
          </button>
        </div>
      </div>
    </li>
  );
}
