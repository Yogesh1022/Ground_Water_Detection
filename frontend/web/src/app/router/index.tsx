import { BrowserRouter, Routes, Route } from "react-router-dom";
import { publicRoutes } from "./routes.public";
import { protectedRoutes } from "./routes.protected";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {publicRoutes.map((route) => (
          <Route key={route.path} path={route.path} element={route.element} />
        ))}
        {protectedRoutes.map((route) => (
          <Route key={route.path} path={route.path} element={route.element} />
        ))}
        <Route path="*" element={<div className="text-center pt-20 text-white">404 - Page Not Found</div>} />
      </Routes>
    </BrowserRouter>
  );
}
