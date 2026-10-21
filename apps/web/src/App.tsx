import { lazy, Suspense, type ComponentType } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { MonitorsGate } from "@/components/MonitorsGate";
import { PriceLayout } from "@/components/PriceLayout";
import { Skeleton } from "@/components/ui/Skeleton";

/** Route-level code splitting for pages that export a named component. */
function page<T extends Record<string, ComponentType>>(
  load: () => Promise<T>,
  name: keyof T,
) {
  return lazy(() => load().then((m) => ({ default: m[name] })));
}

const Alerts = page(() => import("@/pages/Alerts"), "Alerts");
const DesignSystem = page(() => import("@/pages/DesignSystem"), "DesignSystem");
const DiffViewer = page(() => import("@/pages/DiffViewer"), "DiffViewer");
const Home = page(() => import("@/pages/Home"), "Home");
const Insights = page(() => import("@/pages/Insights"), "Insights");
const Landing = page(() => import("@/pages/Landing"), "Landing");
const Login = page(() => import("@/pages/Login"), "Login");
const MonitorDetail = page(
  () => import("@/pages/MonitorDetail"),
  "MonitorDetail",
);
const MonitorForm = page(() => import("@/pages/MonitorForm"), "MonitorForm");
const Monitors = page(() => import("@/pages/Monitors"), "Monitors");
const PriceDashboard = page(
  () => import("@/pages/PriceDashboard"),
  "PriceDashboard",
);
const Product = page(() => import("@/pages/Product"), "Product");
const Project = page(() => import("@/pages/Project"), "Project");
const Settings = page(() => import("@/pages/Settings"), "Settings");
const Storefront = page(() => import("@/pages/Storefront"), "Storefront");

function PageFallback() {
  return (
    <div
      className="mx-auto max-w-[1200px] space-y-4 p-6"
      aria-busy="true"
      aria-label="Loading"
    >
      <Skeleton className="h-10 w-1/3 !rounded-row" />
      <Skeleton className="h-48 w-full !rounded-card" />
    </div>
  );
}

// The product is price tracking only. The generic page-monitoring screens (monitors, diffs,
// channels, workspaces; see pages/Dashboard.tsx, Layout.tsx) are intentionally not routed;
// /prices/monitors* (list, detail, create/edit, diff) is the routed ChangeRadar surface.
export function App() {
  return (
    <Suspense fallback={<PageFallback />}>
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
    </Suspense>
  );
}
