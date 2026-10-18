import { Outlet } from "react-router-dom";

import { useAlerts } from "@/api/priceHooks";
import { Navbar } from "@/components/Navbar";
import { Toaster } from "@/components/Toaster";
import { useAuthed } from "@/hooks/useAuthed";
import { useLivePrices } from "@/hooks/useLivePrices";

export function PriceLayout() {
  const authed = useAuthed();

  useLivePrices();
  // Kept loaded for the whole session so live updates can check them for target hits.
  useAlerts(authed);

  return (
    <div className="pro min-h-full">
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Outlet />
      </main>
      <Toaster />
    </div>
  );
}
