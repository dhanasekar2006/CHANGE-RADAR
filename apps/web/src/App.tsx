import { Navigate, Route, Routes } from "react-router-dom";

import { MonitorsGate } from "@/components/MonitorsGate";
import { PriceLayout } from "@/components/PriceLayout";
import { Alerts } from "@/pages/Alerts";
import { DiffViewer } from "@/pages/DiffViewer";
import { DesignSystem } from "@/pages/DesignSystem";
import { Home } from "@/pages/Home";
import { Insights } from "@/pages/Insights";
import { Landing } from "@/pages/Landing";
import { Login } from "@/pages/Login";
import { PriceDashboard } from "@/pages/PriceDashboard";
import { MonitorDetail } from "@/pages/MonitorDetail";
import { MonitorForm } from "@/pages/MonitorForm";
import { Monitors } from "@/pages/Monitors";
import { Product } from "@/pages/Product";
import { Settings } from "@/pages/Settings";
import { Project } from "@/pages/Project";
import { Storefront } from "@/pages/Storefront";

// The product is price tracking only. The generic page-monitoring screens (monitors, diffs,
// channels, workspaces; see pages/Dashboard.tsx, Layout.tsx) are intentionally not routed;
// /prices/monitors* (list, detail, create/edit, diff) is the routed ChangeRadar surface.
export function App() {
  return (
    <Routes>
      <Route path="/" element={<Storefront />} />
      <Route path="/project" element={<Project />} />
      {import.meta.env.DEV && (
        <Route path="/design" element={<DesignSystem />} />
      )}
      <Route path="/landing" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      {/* Browsing is public; alerts need a signed-in user. */}
      <Route path="/prices" element={<PriceLayout />}>
        <Route index element={<PriceDashboard />} />
        <Route path="search" element={<Home />} />
        <Route path="p/:productId" element={<Product />} />
        <Route path="insights" element={<Insights />} />
        <Route path="settings" element={<Settings />} />
        <Route element={<MonitorsGate />}>
          <Route path="monitors" element={<Monitors />} />
          <Route path="monitors/new" element={<MonitorForm />} />
          <Route path="monitors/:monitorId" element={<MonitorDetail />} />
          <Route path="monitors/:monitorId/edit" element={<MonitorForm />} />
          <Route path="changes/:changeId" element={<DiffViewer />} />
        </Route>
        <Route path="alerts" element={<Alerts />} />
      </Route>
      <Route path="*" element={<Navigate to="/prices" replace />} />
    </Routes>
  );
}
