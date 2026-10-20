import { Mail, MessageCircle, Send } from "lucide-react";
import { FormEvent, useState } from "react";
import { Link, useLocation } from "react-router-dom";

import { useCreateAlert } from "@/api/priceHooks";
import { Button } from "@/components/ui/Button";
import { ListRow } from "@/components/ui/ListRow";
import { Toggle } from "@/components/ui/Toggle";
import { useAuthed } from "@/hooks/useAuthed";
import { formatINR } from "@/lib/format";
import type { AlertChannel } from "@/types/prices";

const inputClass =
  "h-12 w-full rounded-row border border-line bg-surface px-4 text-[15px] text-ink outline-none placeholder:text-ink-3 focus:border-accent";

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
      <p className="text-[15px] text-ink-2">
        <Link to={`/login?next=${encodeURIComponent(location.pathname)}`} className="font-bold text-accent-strong hover:underline">
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="block space-y-2">
        <span className="text-[15px] font-semibold text-ink">Alert me when the price is at or below (₹)</span>
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
        <div className="flex flex-wrap items-center gap-2 text-[13px]">
          <span className="text-ink-2">Quick pick:</span>
          {PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => setTarget(String(preset.price(bestPrice)))}
              className="min-h-[36px] rounded-full border border-line px-3 font-semibold text-ink hover:border-accent"
            >
              {preset.label}
            </button>
          ))}
        </div>
      )}
      {bestPrice !== null && targetNumber >= bestPrice && targetNumber > 0 && (
        <p className="text-[13px] text-warn">
          It's already {formatINR(bestPrice)}, at or below this target, so you'll be alerted on the next check.
        </p>
      )}

      <fieldset className="space-y-1">
        <legend className="mb-1 text-[15px] font-semibold text-ink">Notify me by</legend>
        <ListRow icon={Mail} label="Email" action={<Toggle label="Email" checked={email} onChange={setEmail} />} />
        <ListRow icon={MessageCircle} label="WhatsApp" action={<Toggle label="WhatsApp" checked={whatsapp} onChange={setWhatsapp} />} />
        {whatsapp && (
          <div className="space-y-1 px-2">
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
              <p role="alert" className="text-[13px] text-warn">
                Include the country code, e.g. +91 98765 43210.
              </p>
            ) : (
              <p className="text-[13px] text-ink-2">
                By adding your number you agree to receive WhatsApp messages about this alert.
              </p>
            )}
          </div>
        )}
        <ListRow icon={Send} label="Telegram" action={<Toggle label="Telegram" checked={telegram} onChange={setTelegram} />} />
        {telegram && (
          <div className="px-2">
            <input
              value={chatId}
              onChange={(e) => setChatId(e.target.value)}
              placeholder="Telegram chat id"
              aria-label="Telegram chat id"
              className={inputClass}
            />
          </div>
        )}
        <p className="px-2 pt-1 text-[13px] text-ink-2">You'll always see an on-screen notice while this page is open.</p>
      </fieldset>

      {createAlert.isError && (
        <p role="alert" className="text-[15px] text-warn">
          Couldn't create the alert. Please try again.
        </p>
      )}

      <Button type="submit" disabled={!valid || createAlert.isPending} className="w-full">
        {createAlert.isPending ? "Saving…" : "Set price alert"}
      </Button>
    </form>
  );
}
