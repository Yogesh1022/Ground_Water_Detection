import { useMemo, useState } from "react";
import {
  BellRing,
  Home,
  MapPin,
  MessageSquarePlus,
  Radar,
  Search
} from "lucide-react";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import HomePage from "./pages/HomePage";
import DetectPage from "./pages/DetectPage";
import MapPage from "./pages/MapPage";
import ComplaintPage from "./pages/ComplaintPage";
import TrackPage from "./pages/TrackPage";
import AlertsPage from "./pages/AlertsPage";

const pageInfo = {
  home: { title: "Home", icon: Home },
  detect: { title: "Check Water Level", icon: Radar },
  map: { title: "Water Map", icon: MapPin },
  complaint: { title: "Report Problem", icon: MessageSquarePlus },
  track: { title: "Track Complaint", icon: Search },
  alerts: { title: "Alerts", icon: BellRing }
};

function App() {
  const [activePage, setActivePage] = useState("home");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const page = useMemo(() => pageInfo[activePage] || pageInfo.home, [activePage]);

  return (
    <div className="app-root">
      <Sidebar
        activePage={activePage}
        onNavigate={setActivePage}
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
          {activePage === "home" ? <HomePage onNavigate={setActivePage} /> : null}
          {activePage === "detect" ? <DetectPage /> : null}
          {activePage === "map" ? <MapPage /> : null}
          {activePage === "complaint" ? <ComplaintPage /> : null}
          {activePage === "track" ? <TrackPage /> : null}
          {activePage === "alerts" ? <AlertsPage /> : null}
        </div>
      </main>
    </div>
  );
}

export default App;
