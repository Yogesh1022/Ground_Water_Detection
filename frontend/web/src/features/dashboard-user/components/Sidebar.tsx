import {
  Home,
  Radar,
  MapPin,
  MessageSquarePlus,
  Search,
  BellRing,
  ArrowLeft,
  Droplets,
  User
} from "lucide-react";

const navSections = [
  {
    title: "Main",
    items: [
      { key: "home", label: "Home", icon: Home },
      { key: "detect", label: "Check Water Level", icon: Radar },
      { key: "map", label: "Water Map", icon: MapPin }
    ]
  },
  {
    title: "Complaints",
    items: [
      { key: "complaint", label: "Report Problem", icon: MessageSquarePlus },
      { key: "track", label: "Track Complaint", icon: Search }
    ]
  },
  {
    title: "Updates",
    items: [{ key: "alerts", label: "Alerts", icon: BellRing, badge: "3" }]
  }
];

function Sidebar({ activePage, onNavigate, collapsed, mobileOpen, onCloseMobile }) {
  return (
    <aside id="sidebar" className={`${collapsed ? "collapsed" : ""} ${mobileOpen ? "open" : ""}`.trim()}>
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <Droplets size={22} color="#06080d" />
        </div>
        <div className="sidebar-brand">
          <div className="sidebar-brand-name">
            Aqua
            <span className="brand-gradient">Vidarbha</span>
          </div>
          <div className="sidebar-brand-sub mono">WATER DASHBOARD</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navSections.map((section) => (
          <div key={section.title}>
            <span className="nav-section">{section.title}</span>
            {section.items.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.key}
                  className={`nav-item ${activePage === item.key ? "active" : ""}`}
                  onClick={() => {
                    onNavigate(item.key);
                    onCloseMobile();
                  }}
                >
                  <Icon size={20} />
                  <span className="nav-label">{item.label}</span>
                  {item.badge ? <span className="nav-badge">{item.badge}</span> : null}
                </button>
              );
            })}
          </div>
        ))}

        <a href="/" className="nav-item back-link">
          <ArrowLeft size={20} />
          <span className="nav-label">Back to Home</span>
        </a>
      </nav>

      <div className="sidebar-bottom">
        <div className="user-card">
          <div className="user-avatar">
            <User size={18} color="#06080d" />
          </div>
          <div className="user-info">
            <div className="user-name">Public User</div>
            <div className="user-role mono">CITIZEN</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
