/**
 * EXAMPLE: How to add the Groundwater Readings page to your React Router
 * 
 * File: src/app/App.tsx (or your main routing file)
 */

import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import HomePage from "../pages/HomePage";
import LoginPage from "../pages/LoginPage";
import AdminDashboardPage from "../pages/AdminDashboardPage";
import GovDashboardPage from "../pages/GovDashboardPage";
import GroundwaterReadingsPage from "../pages/GroundwaterReadingsPage"; // <- ADD THIS
import NotFoundPage from "../pages/NotFoundPage";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/admin-dashboard" element={<AdminDashboardPage />} />
        <Route path="/gov-dashboard" element={<GovDashboardPage />} />
        
        {/* ADD THIS ROUTE */}
        <Route path="/groundwater-readings" element={<GroundwaterReadingsPage />} />
        
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Router>
  );
}

export default App;

/**
 * EXAMPLE: How to add a navigation link to the groundwater readings page
 * 
 * File: src/components/layout/Navigation.tsx (or your navigation component)
 */

import { Link } from "react-router-dom";
import { Droplets } from "lucide-react"; // Or use any icon

export function Navigation() {
  return (
    <nav className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link to="/" className="flex items-center space-x-2 hover:text-blue-600">
              <span className="font-bold text-lg">AquaVidarbha</span>
            </Link>
            
            <Link
              to="/admin-dashboard"
              className="text-gray-600 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium"
            >
              Admin
            </Link>
            
            <Link
              to="/gov-dashboard"
              className="text-gray-600 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium"
            >
              Government
            </Link>
            
            {/* ADD THIS LINK */}
            <Link
              to="/groundwater-readings"
              className="flex items-center space-x-2 text-gray-600 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium"
            >
              <Droplets className="w-4 h-4" />
              <span>Groundwater Data</span>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
