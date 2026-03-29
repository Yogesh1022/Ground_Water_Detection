import type { RouteObject } from "react-router-dom";
import LandingPage from "../../features/landing/pages/LandingPage";
import LoginPage from "../../pages/LoginPage";

export const publicRoutes: RouteObject[] = [
  { path: "/", element: <LandingPage /> },
  { path: "/login", element: <LoginPage /> }
];
