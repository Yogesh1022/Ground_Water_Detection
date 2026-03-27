import type { RouteObject } from "react-router-dom";
import App from "../App";

export const protectedRoutes: RouteObject[] = [
  { path: "/dashboard-user", element: <App /> },
  { path: "/dashboard-user/*", element: <App /> }
];
