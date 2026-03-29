export function resolveDashboardPathForRole(role?: string): string {
  const normalized = (role || "").toLowerCase();

  if (normalized === "admin") {
    return "/dashboard-admin";
  }

  if (normalized === "gov") {
    return "/dashboard-gov";
  }

  return "/dashboard-user";
}
