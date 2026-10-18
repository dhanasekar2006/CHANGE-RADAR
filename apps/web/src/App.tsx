import { Navigate, Route, Routes } from "react-router-dom";

import { PriceLayout } from "@/components/PriceLayout";
import { Alerts } from "@/pages/Alerts";
import { Home } from "@/pages/Home";
import { Landing } from "@/pages/Landing";
import { Login } from "@/pages/Login";
import { PriceDashboard } from "@/pages/PriceDashboard";
import { Product } from "@/pages/Product";
import { Project } from "@/pages/Project";
import { Storefront } from "@/pages/Storefront";

// The product is price tracking only. The generic page-monitoring screens (monitors, diffs,
// channels, workspaces; see pages/Dashboard.tsx, Layout.tsx) are intentionally not routed.
export function App() {
  return (
    <Routes>
      <Route path="/" element={<Storefront />} />
      <Route path="/project" element={<Project />} />
      <Route path="/landing" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      {/* Browsing is public; alerts need a signed-in user. */}
      <Route path="/prices" element={<PriceLayout />}>
        <Route index element={<PriceDashboard />} />
        <Route path="search" element={<Home />} />
        <Route path="p/:productId" element={<Product />} />
        <Route path="alerts" element={<Alerts />} />
      </Route>
      <Route path="*" element={<Navigate to="/prices" replace />} />
    </Routes>
  );
}
