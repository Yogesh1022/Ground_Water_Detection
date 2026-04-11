import { lazy, Suspense } from "react";

const GovDashboardFeaturePage = lazy(() => import("../features/dashboard-gov"));

export default function GovDashboardPage() {
  return (
    <Suspense fallback={<div className="pt-20 text-center text-slate-200">Loading government dashboard...</div>}>
      <GovDashboardFeaturePage />
    </Suspense>
  );
}