import { lazy, Suspense } from "react";

const AdminDashboardFeaturePage = lazy(() =>
  import("../features/dashboard-admin").then((module) => ({
    default: module.AdminDashboardFeaturePage,
  }))
);

export default function AdminDashboardPage() {
  return (
    <Suspense fallback={<div className="pt-20 text-center text-slate-200">Loading admin dashboard...</div>}>
      <AdminDashboardFeaturePage />
    </Suspense>
  );
}
