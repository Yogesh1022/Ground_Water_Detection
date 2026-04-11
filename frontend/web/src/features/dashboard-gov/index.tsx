import { useEffect, useMemo, useState } from "react";
import {
  Brain,
  ClipboardList,
  FileBarChart,
  Home,
  Landmark,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  PanelLeft,
  ScrollText,
  Loader2,
  Truck,
  Users,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Bar, Doughnut, Line, Scatter } from "react-chartjs-2";
import { getGovProfile } from "../gov/api/govApi";
import ChartErrorBoundary from "../../components/ChartErrorBoundary";
import "../../styles/gov-dashboard.css";

type GovPage = "overview" | "requests" | "districts" | "forecast" | "assign" | "tankers" | "reports" | "activity";

type GovNavItem = {
  key: GovPage;
  label: string;
  icon: typeof LayoutDashboard;
  section: "Command" | "Management" | "System";
  badge?: string;
};

const navItems: GovNavItem[] = [
  { key: "overview", label: "Command Center", icon: LayoutDashboard, section: "Command" },
  { key: "requests", label: "All Requests", icon: ClipboardList, section: "Command", badge: "14" },
  { key: "districts", label: "District Analytics", icon: MapPin, section: "Command" },
  { key: "forecast", label: "AI Forecasts", icon: Brain, section: "Command" },
  { key: "assign", label: "Task Assignment", icon: Users, section: "Management" },
  { key: "tankers", label: "Tanker Schedule", icon: Truck, section: "Management" },
  { key: "reports", label: "Generate Reports", icon: FileBarChart, section: "Management" },
  { key: "activity", label: "Activity Log", icon: ScrollText, section: "System" },
];

const pageTitle: Record<GovPage, string> = {
  overview: "Command Center",
  requests: "All Requests",
  districts: "District Analytics",
  forecast: "AI Forecasts",
  assign: "Task Assignment",
  tankers: "Tanker Schedule",
  reports: "Generate Reports",
  activity: "Activity Log",
};

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { labels: { color: "#64748b", font: { family: "JetBrains Mono" } } },
  },
  scales: {
    x: { grid: { color: "rgba(255,255,255,.04)" }, ticks: { color: "#64748b" } },
    y: { grid: { color: "rgba(255,255,255,.04)" }, ticks: { color: "#64748b" } },
  },
};

function getRiskBadge(depth: number): string {
  if (depth <= -68) return "g-risk-critical";
  if (depth <= -55) return "g-risk-high";
  return "g-risk-moderate";
}

export default function GovDashboardFeaturePage() {
  const navigate = useNavigate();
  const [activePage, setActivePage] = useState<GovPage>("overview");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [officerName, setOfficerName] = useState(sessionStorage.getItem("aqua_user") || "District Officer");
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState("");

  useEffect(() => {
    const role = sessionStorage.getItem("aqua_role");
    const token = sessionStorage.getItem("aqua_token");
    if (role !== "gov" || !token) {
      navigate("/login", { replace: true });
      return;
    }

    const fetchProfile = async () => {
      setProfileLoading(true);
      setProfileError("");
      try {
        const profile = await getGovProfile();
        const displayName = profile.name || profile.email || "District Officer";
        setOfficerName(displayName);
        sessionStorage.setItem("aqua_user", displayName);
        sessionStorage.setItem("aqua_user_email", profile.email || "");
        sessionStorage.setItem("aqua_user_id", String(profile.id || ""));
      } catch (error) {
        setProfileError(error instanceof Error ? error.message : "Failed to load gov profile.");
      } finally {
        setProfileLoading(false);
      }
    };

    void fetchProfile();
  }, [navigate]);

  const commandCenterData = useMemo(
    () => ({
      category: {
        labels: ["Well/Borewell", "No Tanker", "Pipeline", "Hand Pump", "Quality"],
        datasets: [
          {
            data: [22, 18, 12, 9, 7],
            backgroundColor: ["#fb7185", "#fbbf24", "#3b82f6", "#22d3ee", "#a855f7"],
            borderWidth: 0,
          },
        ],
      },
      crisis: {
        labels: ["Yavatmal", "Amravati", "Akola", "Buldhana", "Washim", "Wardha", "Nagpur"],
        datasets: [
          {
            data: [9.2, 8.4, 7.1, 6.8, 6.2, 4.5, 3.8],
            backgroundColor: ["#fb7185", "#fb7185", "#fbbf24", "#fbbf24", "#fbbf24", "#22d3ee", "#34d399"],
            borderRadius: 8,
          },
        ],
      },
    }),
    [],
  );

  const districtData = useMemo(
    () => ({
      groundwater: {
        labels: ["Yavatmal", "Amravati", "Akola", "Buldhana", "Washim", "Wardha", "Nagpur", "Chandrapur", "Bhandara"],
        datasets: [
          {
            data: [72.1, 63.4, 58.7, 55.8, 52.3, 41.2, 36.5, 32.1, 28.4],
            backgroundColor: "rgba(59,130,246,.65)",
            borderRadius: 6,
          },
        ],
      },
      rainfallDepth: {
        datasets: [
          {
            label: "District points",
            data: [
              { x: 580, y: -35 },
              { x: 620, y: -38 },
              { x: 490, y: -55 },
              { x: 450, y: -60 },
              { x: 720, y: -28 },
              { x: 680, y: -32 },
              { x: 410, y: -68 },
              { x: 380, y: -72 },
              { x: 530, y: -48 },
            ],
            backgroundColor: "rgba(59,130,246,.75)",
            pointRadius: 6,
          },
        ],
      },
    }),
    [],
  );

  const forecastData = useMemo(
    () => ({
      depth90: {
        labels: ["Mar", "Apr", "May", "Jun", "Jul", "Aug"],
        datasets: [
          {
            label: "Historical",
            data: [-63.4, -65, null, null, null, null],
            borderColor: "#22d3ee",
            tension: 0.4,
            pointRadius: 3,
            borderDash: [4, 4],
          },
          {
            label: "Forecast",
            data: [null, -65, -71, -75, -70, -62],
            borderColor: "#a855f7",
            backgroundColor: "rgba(168,85,247,.08)",
            fill: true,
            tension: 0.4,
            pointRadius: 3,
          },
        ],
      },
      shap: {
        labels: ["Prev Month Depth", "Rainfall Lag", "Soil Moisture", "Season", "Rolling Avg", "NDVI", "Temp Max"],
        datasets: [
          {
            data: [0.31, 0.24, 0.18, 0.11, 0.08, 0.05, 0.03],
            backgroundColor: "rgba(168,85,247,.7)",
            borderRadius: 5,
          },
        ],
      },
    }),
    [],
  );

  const logout = () => {
    sessionStorage.clear();
    navigate("/login");
  };

  const renderOverview = () => (
    <>
      <div className="g-kpi-row">
        <article className="g-kpi"><div className="g-kpi-value tone-rose">14</div><div className="g-kpi-label">Open Requests</div><div className="g-kpi-hint">+3 today</div></article>
        <article className="g-kpi"><div className="g-kpi-value tone-amber">6</div><div className="g-kpi-label">In Progress</div><div className="g-kpi-hint">2 overdue</div></article>
        <article className="g-kpi"><div className="g-kpi-value tone-green">48</div><div className="g-kpi-label">Resolved (Month)</div><div className="g-kpi-hint">94% rate</div></article>
        <article className="g-kpi"><div className="g-kpi-value tone-rose">3</div><div className="g-kpi-label">Critical Zones</div><div className="g-kpi-hint">1 escalated</div></article>
        <article className="g-kpi"><div className="g-kpi-value tone-blue">12</div><div className="g-kpi-label">Tankers Active</div><div className="g-kpi-hint">3 routes today</div></article>
      </div>

      <div className="g-grid-2">
        <section className="g-card">
          <div className="g-card-head">Requests by Category</div>
          <div className="g-chart-wrap">
            <ChartErrorBoundary fallbackText="Category chart unavailable.">
              <Doughnut data={commandCenterData.category} options={{ responsive: true, maintainAspectRatio: false }} />
            </ChartErrorBoundary>
          </div>
        </section>
        <section className="g-card">
          <div className="g-card-head">District Crisis Index</div>
          <div className="g-chart-wrap">
            <ChartErrorBoundary fallbackText="Crisis index chart unavailable.">
              <Bar data={commandCenterData.crisis} options={chartOptions} />
            </ChartErrorBoundary>
          </div>
        </section>
      </div>

      <div className="g-grid-2">
        <section className="g-card">
          <div className="g-card-head">Priority Requests</div>
          <table className="g-table">
            <thead><tr><th>ID</th><th>Issue</th><th>Village</th><th>Priority</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>
              <tr><td>#R-1042</td><td>Well dried up</td><td>Warud</td><td><span className="g-tag p-high">HIGH</span></td><td><span className="g-status s-open">OPEN</span></td><td><button className="g-btn g-btn-primary">Assign</button></td></tr>
              <tr><td>#R-1041</td><td>No tanker 7 days</td><td>Morshi</td><td><span className="g-tag p-high">HIGH</span></td><td><span className="g-status s-critical">CRITICAL</span></td><td><button className="g-btn g-btn-danger">Escalate</button></td></tr>
              <tr><td>#R-1039</td><td>Pipeline burst</td><td>Daryapur</td><td><span className="g-tag p-med">MED</span></td><td><span className="g-status s-review">REVIEW</span></td><td><button className="g-btn g-btn-ghost">View</button></td></tr>
            </tbody>
          </table>
        </section>

        <section className="g-card">
          <div className="g-card-head">Recent Activity</div>
          <div className="g-activity-item"><span className="g-activity-dot tone-green" /> #R-1038 resolved, tanker dispatched · 10:32 AM</div>
          <div className="g-activity-item"><span className="g-activity-dot tone-blue" /> Task assigned to Field Engineer Patil · 09:15 AM</div>
          <div className="g-activity-item"><span className="g-activity-dot tone-rose" /> AI alert: Yavatmal crossed -72m · 06:00 AM</div>
          <div className="g-activity-item"><span className="g-activity-dot tone-amber" /> #R-1041 escalated to collector · Yesterday</div>
        </section>
      </div>
    </>
  );

  const renderRequests = () => (
    <section className="g-card">
      <div className="g-card-title-row"><div className="g-card-head">All Citizen Requests</div><button className="g-btn g-btn-primary">Export</button></div>
      <div className="g-filter-row">
        <button className="g-pill active">ALL (68)</button>
        <button className="g-pill">OPEN (14)</button>
        <button className="g-pill">IN REVIEW (6)</button>
        <button className="g-pill">CRITICAL (3)</button>
        <button className="g-pill">RESOLVED (45)</button>
      </div>
      <table className="g-table">
        <thead><tr><th>Report ID</th><th>Citizen</th><th>Issue</th><th>Location</th><th>Priority</th><th>Status</th><th>Assigned</th></tr></thead>
        <tbody>
          <tr><td>#R-1042</td><td>R. Deshmukh</td><td>Well Dry</td><td>Warud, Amravati</td><td><span className="g-tag p-high">HIGH</span></td><td><span className="g-status s-open">OPEN</span></td><td>-</td></tr>
          <tr><td>#R-1041</td><td>S. Wankhede</td><td>No Tanker</td><td>Morshi, Amravati</td><td><span className="g-tag p-high">HIGH</span></td><td><span className="g-status s-critical">CRITICAL</span></td><td>Escalated</td></tr>
          <tr><td>#R-1040</td><td>P. Kale</td><td>Hand Pump</td><td>Chandur, Amravati</td><td><span className="g-tag p-med">MED</span></td><td><span className="g-status s-assigned">ASSIGNED</span></td><td>Patil</td></tr>
        </tbody>
      </table>
    </section>
  );

  const renderDistricts = () => {
    const rows = [
      { district: "Yavatmal", depth: -72.1, wells: 85, reports: 21, tankers: 18 },
      { district: "Amravati", depth: -63.4, wells: 72, reports: 14, tankers: 12 },
      { district: "Akola", depth: -58.7, wells: 61, reports: 8, tankers: 7 },
      { district: "Wardha", depth: -41.2, wells: 44, reports: 4, tankers: 3 },
    ];

    return (
      <>
        <div className="g-grid-2">
          <section className="g-card">
            <div className="g-card-head">Groundwater Levels by District</div>
            <div className="g-chart-wrap">
              <ChartErrorBoundary fallbackText="Groundwater chart unavailable.">
                <Bar data={districtData.groundwater} options={{ ...chartOptions, indexAxis: "y" as const }} />
              </ChartErrorBoundary>
            </div>
          </section>
          <section className="g-card">
            <div className="g-card-head">Rainfall vs Depth Scatter</div>
            <div className="g-chart-wrap">
              <ChartErrorBoundary fallbackText="Scatter chart unavailable.">
                <Scatter data={districtData.rainfallDepth} options={chartOptions} />
              </ChartErrorBoundary>
            </div>
          </section>
        </div>

        <section className="g-card">
          <div className="g-card-head">District Summary</div>
          <table className="g-table">
            <thead><tr><th>District</th><th>Avg Depth</th><th>Wells</th><th>Reports</th><th>Risk</th><th>Tankers</th></tr></thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.district}>
                  <td>{row.district}</td>
                  <td>{row.depth}m</td>
                  <td>{row.wells}</td>
                  <td>{row.reports}</td>
                  <td><span className={`g-status ${getRiskBadge(row.depth)}`}>{row.depth <= -68 ? "CRITICAL" : row.depth <= -55 ? "HIGH" : "MODERATE"}</span></td>
                  <td>{row.tankers}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </>
    );
  };

  const renderForecast = () => (
    <>
      <div className="g-grid-2">
        <section className="g-card">
          <div className="g-card-head">90-Day Groundwater Forecast</div>
          <div className="g-chart-wrap g-chart-tall">
            <ChartErrorBoundary fallbackText="Forecast chart unavailable.">
              <Line data={forecastData.depth90} options={chartOptions} />
            </ChartErrorBoundary>
          </div>
          <div className="g-note"><strong>Ensemble:</strong> XGBoost + RF + LSTM + GRU · R² 0.89 · RMSE 0.43m</div>
        </section>
        <section className="g-card">
          <div className="g-card-head">SHAP Feature Importance</div>
          <div className="g-chart-wrap g-chart-tall">
            <ChartErrorBoundary fallbackText="SHAP chart unavailable.">
              <Bar data={forecastData.shap} options={{ ...chartOptions, indexAxis: "y" as const }} />
            </ChartErrorBoundary>
          </div>
        </section>
      </div>

      <section className="g-card">
        <div className="g-card-head">Predicted Crisis Zones (Next 90 Days)</div>
        <table className="g-table">
          <thead><tr><th>District</th><th>Current</th><th>Predicted</th><th>Confidence</th><th>Action</th></tr></thead>
          <tbody>
            <tr><td>Yavatmal</td><td>-72.1m</td><td className="tone-rose">-78.4m</td><td>96%</td><td>Emergency tanker + well deepening</td></tr>
            <tr><td>Amravati</td><td>-63.4m</td><td className="tone-rose">-71.2m</td><td>94%</td><td>Pre-position tankers</td></tr>
            <tr><td>Akola</td><td>-58.7m</td><td className="tone-amber">-64.1m</td><td>87%</td><td>Weekly monitoring</td></tr>
          </tbody>
        </table>
      </section>
    </>
  );

  const renderAssign = () => (
    <div className="g-grid-2">
      <section className="g-card">
        <div className="g-card-head">Assign New Task</div>
        <div className="g-form-grid">
          <input className="g-input" placeholder="Report ID (e.g. R-1042)" />
          <input className="g-input" placeholder="Assign to (Engineer/Team)" />
          <input className="g-input" type="date" />
          <select className="g-input"><option>High</option><option>Medium</option><option>Low</option></select>
        </div>
        <textarea className="g-input" rows={4} placeholder="Instructions for field team..." />
        <button className="g-btn g-btn-primary">Assign Task</button>
      </section>

      <section className="g-card">
        <div className="g-card-head">Team Workload</div>
        <table className="g-table">
          <thead><tr><th>Team</th><th>Active</th><th>Done</th><th>Status</th></tr></thead>
          <tbody>
            <tr><td>Eng. Patil</td><td>3</td><td>12</td><td><span className="g-status s-review">BUSY</span></td></tr>
            <tr><td>Lab Sharma</td><td>1</td><td>8</td><td><span className="g-status s-resolved">FREE</span></td></tr>
            <tr><td>Field Team A</td><td>4</td><td>22</td><td><span className="g-status s-critical">FULL</span></td></tr>
          </tbody>
        </table>
      </section>
    </div>
  );

  const renderTankers = () => (
    <section className="g-card">
      <div className="g-card-title-row"><div className="g-card-head">Active Tanker Routes</div><button className="g-btn g-btn-primary">Add Route</button></div>
      <table className="g-table">
        <thead><tr><th>Tanker</th><th>Route</th><th>Villages</th><th>Schedule</th><th>Capacity</th><th>Status</th></tr></thead>
        <tbody>
          <tr><td>T-001</td><td>Amravati → Warud</td><td>Warud, Nandgaon, Pusad</td><td>Mon, Thu</td><td>10,000L</td><td><span className="g-status s-resolved">ACTIVE</span></td></tr>
          <tr><td>T-002</td><td>Yavatmal → Morshi</td><td>Morshi, Kalamb, Arni</td><td>Daily</td><td>12,000L</td><td><span className="g-status s-resolved">ACTIVE</span></td></tr>
          <tr><td>T-004</td><td>Emergency — Yavatmal</td><td>Pusad, Umarkhed</td><td>On-demand</td><td>15,000L</td><td><span className="g-status s-critical">URGENT</span></td></tr>
        </tbody>
      </table>
    </section>
  );

  const renderReports = () => (
    <div className="g-grid-3">
      <article className="g-report-card"><FileBarChart size={44} /><h4>Monthly Status Report</h4><p>District water summary</p><button className="g-btn g-btn-primary">PDF</button></article>
      <article className="g-report-card"><Brain size={44} /><h4>AI Prediction Report</h4><p>90-day forecast and confidence</p><button className="g-btn g-btn-primary">PDF</button></article>
      <article className="g-report-card"><Users size={44} /><h4>Citizen Request Report</h4><p>Requests and resolution times</p><button className="g-btn g-btn-primary">CSV</button></article>
    </div>
  );

  const renderActivity = () => (
    <section className="g-card">
      <div className="g-card-head">System Activity Log</div>
      <table className="g-table">
        <thead><tr><th>Timestamp</th><th>Actor</th><th>Action</th><th>Target</th><th>Details</th></tr></thead>
        <tbody>
          <tr><td>Mar 11, 10:32</td><td>Officer Kulkarni</td><td className="tone-green">RESOLVED</td><td>#R-1038</td><td>Tanker dispatched</td></tr>
          <tr><td>Mar 11, 09:15</td><td>Officer Kulkarni</td><td className="tone-blue">ASSIGNED</td><td>#R-1040</td><td>Field Eng. Patil</td></tr>
          <tr><td>Mar 10, 06:00</td><td>AI System</td><td className="tone-rose">ALERT</td><td>Yavatmal</td><td>GW crossed -72m</td></tr>
        </tbody>
      </table>
    </section>
  );

  const renderPage = () => {
    switch (activePage) {
      case "overview": return renderOverview();
      case "requests": return renderRequests();
      case "districts": return renderDistricts();
      case "forecast": return renderForecast();
      case "assign": return renderAssign();
      case "tankers": return renderTankers();
      case "reports": return renderReports();
      case "activity": return renderActivity();
      default: return renderOverview();
    }
  };

  const pageIcon = navItems.find((item) => item.key === activePage)?.icon || LayoutDashboard;
  const TitleIcon = pageIcon;
  const sectionRef: { current: GovNavItem["section"] | null } = { current: null };

  const sectionLabel = (section: GovNavItem["section"]) => {
    if (sectionRef.current === section) return null;
    sectionRef.current = section;
    return <span className="g-nav-section">{section}</span>;
  };

  return (
    <div className="g-root">
      <aside className={`g-sidebar ${collapsed ? "collapsed" : ""} ${mobileOpen ? "open" : ""}`}>
        <div className="g-sidebar-header">
          <div className="g-logo"><Landmark size={22} /></div>
          {!collapsed && (
            <div className="g-brand-text">
              <strong>AquaVidarbha</strong>
              <span>WATER DASHBOARD</span>
            </div>
          )}
        </div>

        <nav className="g-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.key}>
                {sectionLabel(item.section)}
                <button
                  className={`g-nav-item ${activePage === item.key ? "active" : ""}`}
                  onClick={() => {
                    setActivePage(item.key);
                    setMobileOpen(false);
                  }}
                  title={item.label}
                >
                  <Icon size={22} />
                  {!collapsed && <span>{item.label}</span>}
                  {item.badge && !collapsed && <span className="g-nav-badge">{item.badge}</span>}
                </button>
              </div>
            );
          })}

          <button className="g-nav-item" onClick={() => navigate("/")} title="Home">
            <Home size={22} />
            {!collapsed && <span>Home</span>}
          </button>
        </nav>

        <div className="g-sidebar-footer">
          {!collapsed && <div className="g-user-pill">{officerName}</div>}
          <button className="g-btn g-btn-ghost" onClick={logout}><LogOut size={14} /> {!collapsed && "Logout"}</button>
        </div>
      </aside>

      <main className={`g-main ${collapsed ? "expanded" : ""}`}>
        <header className="g-topbar">
          <div className="g-topbar-left">
            <button className="g-icon-btn" onClick={() => setCollapsed((prev) => !prev)}><PanelLeft size={17} /></button>
            <div className="g-page-title"><TitleIcon size={17} /> {pageTitle[activePage]}</div>
          </div>
          <div className="g-topbar-right">
            <span className="g-badge-role"><Landmark size={13} /> GOV OFFICER</span>
            <button className="g-icon-btn" onClick={() => setMobileOpen((prev) => !prev)}><Menu size={17} /></button>
          </div>
        </header>

        <section className="g-content">
          {profileLoading ? (
            <div className="g-banner g-banner-info"><Loader2 size={15} className="g-spin" /> Loading gov profile...</div>
          ) : null}
          {profileError ? (
            <div className="g-banner g-banner-warn">Profile sync failed: {profileError}. Using session data.</div>
          ) : null}
          {renderPage()}
        </section>
      </main>
    </div>
  );
}