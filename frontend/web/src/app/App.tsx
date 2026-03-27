import { useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  BellRing,
  Home,
  MapPin,
  MessageSquarePlus,
  Radar,
  Search
} from "lucide-react";
import Sidebar from "../features/dashboard-user/components/Sidebar";
import Topbar from "../features/dashboard-user/components/Topbar";
import HomePage from "../features/dashboard-user/pages/HomePage";
import DetectPage from "../features/dashboard-user/pages/DetectPage";
import MapPage from "../features/dashboard-user/pages/MapPage";
import ComplaintPage from "../features/dashboard-user/pages/ComplaintPage";
import TrackPage from "../features/dashboard-user/pages/TrackPage";
import AlertsPage from "../features/dashboard-user/pages/AlertsPage";
import NotFoundPage from "../pages/NotFoundPage";

const pageInfo = {
  home: { title: "Home", icon: Home },
  detect: { title: "Check Water Level", icon: Radar },
  map: { title: "Water Map", icon: MapPin },
  complaint: { title: "Report Problem", icon: MessageSquarePlus },
  track: { title: "Track Complaint", icon: Search },
  alerts: { title: "Alerts", icon: BellRing }
};

type PageKey = keyof typeof pageInfo;

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const getActivePageFromPath = (path: string): PageKey => {
    const base = "/dashboard-user";
    if (!path.startsWith(base)) return "home";

    const suffix = path.slice(base.length).replace(/^\//, "");
    if (suffix.startsWith("detect")) return "detect";
    if (suffix.startsWith("map")) return "map";
    if (suffix.startsWith("complaint")) return "complaint";
    if (suffix.startsWith("track")) return "track";
    if (suffix.startsWith("alerts")) return "alerts";
    return "home";
  };

  const activePage = getActivePageFromPath(location.pathname);
  const page = pageInfo[activePage];

  const handleNavigate = (pageKey: PageKey) => {
    if (pageKey === "home") {
      navigate("/dashboard-user");
    } else {
      navigate(`/dashboard-user/${pageKey}`);
    }
    setMobileOpen(false);
  };

  const renderPage = () => {
    switch (activePage) {
      case "home":
        return <HomePage onNavigate={handleNavigate} />;
      case "detect":
        return <DetectPage />;
      case "map":
        return <MapPage />;
      case "complaint":
        return <ComplaintPage />;
      case "track":
        return <TrackPage />;
      case "alerts":
        return <AlertsPage />;
      default:
        return <NotFoundPage />;
    }
  };

  return (
    <div className="app-root">
      <Sidebar
        activePage={activePage}
        onNavigate={handleNavigate}
        collapsed={sidebarCollapsed}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <main id="main" className={sidebarCollapsed ? "expanded" : ""}>
        <Topbar
          icon={page.icon}
          title={page.title}
          onToggleSidebar={() => setSidebarCollapsed((prev) => !prev)}
          onToggleMobile={() => setMobileOpen((prev) => !prev)}
        />

        <div className="content">
          {renderPage()}
        </div>
      </main>
    </div>
  );
}

export default App;
