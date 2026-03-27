import type { RouteObject } from "react-router-dom";
import App from "../App";
import AdminDashboardPage from "../../pages/AdminDashboardPage";
import GovDashboardPage from "../../pages/GovDashboardPage";
import RoleGuard from "./RoleGuard";

export const protectedRoutes: RouteObject[] = [
  {
    path: "/dashboard-user",
    element: (
      <RoleGuard allowRoles={["citizen", "user"]}>
        <App />
      </RoleGuard>
    )
  },
  {
    path: "/dashboard-user/*",
    element: (
      <RoleGuard allowRoles={["citizen", "user"]}>
        <App />
      </RoleGuard>
    )
  },
  {
    path: "/dashboard-admin",
    element: (
      <RoleGuard allowRoles={["admin"]}>
        <AdminDashboardPage />
      </RoleGuard>
    )
  },
  {
    path: "/dashboard-gov",
    element: (
      <RoleGuard allowRoles={["gov"]}>
        <GovDashboardPage />
      </RoleGuard>
    )
  }
];
