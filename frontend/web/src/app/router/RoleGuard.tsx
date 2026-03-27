import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";

type RoleGuardProps = {
  children: ReactNode;
  allowRoles?: string[];
};

export default function RoleGuard({ children, allowRoles }: RoleGuardProps) {
  const location = useLocation();
  const token = sessionStorage.getItem("aqua_token");
  const role = (sessionStorage.getItem("aqua_role") || "").toLowerCase();

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (allowRoles && allowRoles.length > 0 && !allowRoles.map((item) => item.toLowerCase()).includes(role)) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}
