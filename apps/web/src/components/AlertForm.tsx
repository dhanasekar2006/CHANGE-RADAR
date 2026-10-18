import { FormEvent, useState } from "react";
import { Link, useLocation } from "react-router-dom";

import { useCreateAlert } from "@/api/priceHooks";
import { useAuthed } from "@/hooks/useAuthed";
import { formatINR } from "@/lib/format";
import type { AlertChannel } from "@/types/prices";

const inputClass =
  "w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-sky-500";

// Same rule as the API: "+", country code, 8 to 15 digits in total. Spaces and dashes are allowed while typing.
const PHONE = /^\+[1-9]\d{7,14}$/;
const cleanPhone = (value: string) => value.replace(/[\s\-().]/g, "");

/** Quick targets relative to today's best price. "Any drop" is one paisa below it. */
const PRESETS = [
  { label: "Any drop", price: (best: number) => Math.round(best * 100 - 1) / 100 },
  { label: "5% lower", price: (best: number) => Math.round(best * 95) / 100 },
  { label: "10% lower", price: (best: number) => Math.round(best * 90) / 100 },
];

export function AlertForm({ productId, productName, bestPrice }: { productId: string; productName: string; bestPrice: number | null }) {
  const authed = useAuthed();
  const location = useLocation();
  const createAlert = useCreateAlert(productName, bestPrice);

  const [target, setTarget] = useState("");
  const [email, setEmail] = useState(true);
  const [whatsapp, setWhatsapp] = useState(false);
  const [phone, setPhone] = useState("");
  const [telegram, setTelegram] = useState(false);
  const [chatId, setChatId] = useState("");

  if (!authed) {
    return (
      <p className="text-sm text-slate-400">
        <Link to={`/login?next=${encodeURIComponent(location.pathname)}`} className="text-sky-400 hover:underline">
          Sign in
        </Link>{" "}
        to get an alert when this drops to your price.
      </p>
    );
  }

  const targetNumber = Number(target);
  const phoneValid = PHONE.test(cleanPhone(phone));
  const showPhoneError = whatsapp && phone.trim() !== "" && !phoneValid;
  const valid = targetNumber > 0 && (!telegram || chatId.trim() !== "") && (!whatsapp || phoneValid);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!valid) return;
    const channels: AlertChannel[] = [
      ...(email ? [{ type: "email" as const }] : []),
      ...(whatsapp ? [{ type: "whatsapp" as const, phone: cleanPhone(phone) }] : []),
      ...(telegram ? [{ type: "telegram" as const, chat_id: chatId.trim() }] : []),
    ];
    createAlert.mutate(
      { product_id: productId, target_price: targetNumber, channels },
      { onSuccess: () => setTarget("") },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <label className="block space-y-1">
        <span className="text-sm text-slate-400">Alert me when the price is at or below (₹)</span>
        <input
          type="number"
          min={1}
          step="any"
          inputMode="decimal"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          placeholder={bestPrice ? String(Math.round(bestPrice * 0.95)) : "e.g. 20000"}
          className={inputClass}
        />
      </label>
      {bestPrice !== null && bestPrice > 1 && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-500">Quick pick:</span>
          {PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => setTarget(String(preset.price(bestPrice)))}
              className="rounded-full border border-slate-700 px-2.5 py-1 text-slate-300 hover:border-sky-500 hover:text-sky-200"
            >
              {preset.label}
            </button>
          ))}
        </div>
      )}
      {bestPrice !== null && targetNumber >= bestPrice && targetNumber > 0 && (
        <p className="text-xs text-amber-400">
          It's already {formatINR(bestPrice)}, at or below this target, so you'll be alerted on the next check.
        </p>
      )}

      <fieldset className="space-y-2 text-sm">
        <legend className="mb-1 text-slate-400">Notify me by</legend>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={email} onChange={(e) => setEmail(e.target.checked)} /> Email
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={whatsapp} onChange={(e) => setWhatsapp(e.target.checked)} /> WhatsApp
        </label>
        {whatsapp && (
          <div className="space-y-1">
            <input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98765 43210"
              aria-label="WhatsApp number with country code"
              aria-invalid={showPhoneError}
              className={inputClass}
            />
            {showPhoneError ? (
              <p role="alert" className="text-xs text-red-400">
                Include the country code, e.g. +91 98765 43210.
              </p>
            ) : (
              <p className="text-xs text-slate-500">
                By adding your number you agree to receive WhatsApp messages about this alert.
              </p>
            )}
          </div>
        )}
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={telegram} onChange={(e) => setTelegram(e.target.checked)} /> Telegram
        </label>
        {telegram && (
          <input value={chatId} onChange={(e) => setChatId(e.target.value)} placeholder="Telegram chat id" className={inputClass} />
        )}
        <p className="text-xs text-slate-500">You'll always see an on-screen notice while this page is open.</p>
      </fieldset>

      {createAlert.isError && (
        <p role="alert" className="text-sm text-red-400">
          Couldn't create the alert. Please try again.
        </p>
      )}

      <button
        type="submit"
        disabled={!valid || createAlert.isPending}
        className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium hover:bg-sky-500 disabled:opacity-50"
      >
        {createAlert.isPending ? "Saving…" : "Set price alert"}
      </button>
    </form>
  );
}
