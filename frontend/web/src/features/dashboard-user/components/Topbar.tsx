import { Menu, PanelLeft } from "lucide-react";

function Topbar({ icon: Icon, title, onToggleSidebar, onToggleMobile }) {
  return (
    <div className="topbar">
      <div className="topbar-left">
        <button className="topbar-toggle" onClick={onToggleSidebar}>
          <PanelLeft size={18} />
        </button>
        <div className="page-title">
          <Icon size={18} /> {title}
        </div>
      </div>

      <div className="topbar-right">
        <span className="badge-live">LIVE DATA</span>
        <button className="topbar-btn" onClick={onToggleMobile}>
          <Menu size={16} />
        </button>
      </div>
    </div>
  );
}

export default Topbar;
