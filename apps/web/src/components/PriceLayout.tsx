import { Outlet } from "react-router-dom";

import { useAlerts } from "@/api/priceHooks";
import { BottomNav, MobileTopBar, Sidebar } from "@/components/AppNav";
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
      <Sidebar />
      <div className="lg:pl-64">
        <MobileTopBar />
        <main className="mx-auto max-w-[1200px] px-4 pb-28 pt-6 sm:px-6 lg:px-10 lg:pb-12 lg:pt-10">
          <Outlet />
        </main>
      </div>
      <BottomNav />
      <Toaster />
    </div>
  );
}
