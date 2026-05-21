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
import {
  generateGovReport,
  getGovCrisisZones,
  getGovDistrictSummary,
  getGovForecastLong,
  getGovForecastShap,
  getGovOverview,
  getGovProfile,
  getGovRainfallDepth,
  getGovTeamsWorkload,
  listGovActivity,
  listGovRequests,
  listGovTankers,
  listGovTasks,
  type GovActivityEntry,
  type GovComplaint,
  type GovCrisisZone,
  type GovDistrictSummaryRow,
  type GovForecast90Point,
  type GovOverview,
  type GovShapFeature,
  type GovTeamWorkload,
  type GovTankerRoute,
} from "../gov/api/govApi";
import ChartErrorBoundary from "../../components/ChartErrorBoundary";
import "../../styles/gov-dashboard.css";

type GovPage = "overview" | "requests" | "districts" | "forecast" | "assign" | "tankers" | "reports" | "activity";

type GovNavItem = {
  key: GovPage;
  label: string;
  icon: typeof LayoutDashboard;
  section: "Command" | "Management" | "System";
};

const navItems: GovNavItem[] = [
  { key: "overview", label: "Command Center", icon: LayoutDashboard, section: "Command" },
  { key: "requests", label: "All Requests", icon: ClipboardList, section: "Command" },
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

function riskClass(risk: string): string {
  const r = String(risk || "").toLowerCase();
  if (r.includes("danger") || r.includes("critical")) return "g-risk-critical";
  if (r.includes("warning") || r.includes("high")) return "g-risk-high";
  return "g-risk-moderate";
}

function statusClass(status: string): string {
  const s = String(status || "").toLowerCase();
  if (s === "resolved" || s === "completed") return "s-resolved";
  if (s === "escalated" || s === "critical") return "s-critical";
  if (s === "in_review" || s === "in_progress" || s === "assigned") return "s-review";
  return "s-open";
}

function priorityClass(priority: string): string {
  const p = String(priority || "").toLowerCase();
  if (p === "urgent" || p === "critical" || p === "high") return "p-high";
  if (p === "medium") return "p-med";
  return "p-low";
}

export default function GovDashboardFeaturePage() {
  const navigate = useNavigate();
  const [activePage, setActivePage] = useState<GovPage>("overview");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [officerName, setOfficerName] = useState(sessionStorage.getItem("aqua_user") || "District Officer");
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState("");
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState("");

  const [overview, setOverview] = useState<GovOverview | null>(null);
  const [requests, setRequests] = useState<GovComplaint[]>([]);
  const [requestsTotal, setRequestsTotal] = useState(0);
  const [districtRows, setDistrictRows] = useState<GovDistrictSummaryRow[]>([]);
  const [rainfallPoints, setRainfallPoints] = useState<Array<{ x: number; y: number }>>([]);
  const [forecastPoints, setForecastPoints] = useState<GovForecast90Point[]>([]);
  const [shapFeatures, setShapFeatures] = useState<GovShapFeature[]>([]);
  const [crisisZones, setCrisisZones] = useState<GovCrisisZone[]>([]);
  const [tankers, setTankers] = useState<GovTankerRoute[]>([]);
  const [teamWorkload, setTeamWorkload] = useState<GovTeamWorkload[]>([]);
  const [activity, setActivity] = useState<GovActivityEntry[]>([]);
  const [tasks, setTasks] = useState<Array<{ id: number; complaint_id: number; assignee_name: string; priority: string; status: string }>>([]);
  const [reportBusy, setReportBusy] = useState("");
  const [reportMessage, setReportMessage] = useState("");

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

  useEffect(() => {
    const role = sessionStorage.getItem("aqua_role");
    const token = sessionStorage.getItem("aqua_token");
    if (role !== "gov" || !token) return;

    const fetchGovData = async () => {
      setDataLoading(true);
      setDataError("");

      const [
        overviewRes,
        requestsRes,
        districtsRes,
        rainfallRes,
        forecastRes,
        shapRes,
        crisisRes,
        tankerRes,
        workloadRes,
        activityRes,
        tasksRes,
      ] = await Promise.allSettled([
        getGovOverview(),
        listGovRequests({ page: 1, limit: 50 }),
        getGovDistrictSummary(),
        getGovRainfallDepth(),
        getGovForecastLong(),
        getGovForecastShap(),
        getGovCrisisZones(),
        listGovTankers(),
        getGovTeamsWorkload(),
        listGovActivity({ page: 1, limit: 20 }),
        listGovTasks({ page: 1, limit: 20 }),
      ]);

      if (overviewRes.status === "fulfilled") setOverview(overviewRes.value);
      if (requestsRes.status === "fulfilled") {
        setRequests(requestsRes.value.data || []);
        setRequestsTotal(Number(requestsRes.value.meta?.total_items || 0));
      }
      if (districtsRes.status === "fulfilled") setDistrictRows(districtsRes.value.data || []);
      if (rainfallRes.status === "fulfilled") {
        setRainfallPoints((rainfallRes.value.data || []).map((p) => ({ x: Number(p.rainfall_mm || 0), y: Number(p.depth_mbgl || 0) })));
      }
      if (forecastRes.status === "fulfilled") setForecastPoints(forecastRes.value.data || []);
      if (shapRes.status === "fulfilled") setShapFeatures(shapRes.value.data || []);
      if (crisisRes.status === "fulfilled") setCrisisZones(crisisRes.value.data || []);
      if (tankerRes.status === "fulfilled") setTankers(tankerRes.value.data || []);
      if (workloadRes.status === "fulfilled") setTeamWorkload(workloadRes.value.data || []);
      if (activityRes.status === "fulfilled") setActivity(activityRes.value.data || []);
      if (tasksRes.status === "fulfilled") setTasks(tasksRes.value.data || []);

      const failed = [overviewRes, requestsRes, districtsRes, rainfallRes, forecastRes, shapRes, crisisRes, tankerRes, workloadRes, activityRes, tasksRes].filter(
        (r) => r.status === "rejected",
      ).length;
      if (failed > 0) {
        setDataError(`Some dashboard sections failed to load (${failed}).`);
      }

      setDataLoading(false);
    };

    void fetchGovData();
  }, []);

  const commandCenterData = useMemo(
    () => ({
      category: {
        labels: (overview?.category_counts || []).map((item) => item.category),
        datasets: [
          {
            data: (overview?.category_counts || []).map((item) => item.count),
            backgroundColor: ["#fb7185", "#fbbf24", "#3b82f6", "#22d3ee", "#a855f7"],
            borderWidth: 0,
          },
        ],
      },
      crisis: {
        labels: (overview?.crisis_series || []).map((item) => item.district),
        datasets: [
          {
            data: (overview?.crisis_series || []).map((item) => item.score),
            backgroundColor: ["#fb7185", "#fb7185", "#fbbf24", "#fbbf24", "#fbbf24", "#22d3ee", "#34d399"],
            borderRadius: 8,
          },
        ],
      },
    }),
    [overview],
  );

  const districtData = useMemo(
    () => ({
      groundwater: {
        labels: districtRows.map((row) => row.district),
        datasets: [
          {
            data: districtRows.map((row) => row.avg_depth_mbgl),
            backgroundColor: "rgba(59,130,246,.65)",
            borderRadius: 6,
          },
        ],
      },
      rainfallDepth: {
        datasets: [
          {
            label: "District points",
            data: rainfallPoints,
            backgroundColor: "rgba(59,130,246,.75)",
            pointRadius: 6,
          },
        ],
      },
    }),
    [districtRows, rainfallPoints],
  );

  const forecastData = useMemo(
    () => ({
      depth90: {
        labels: forecastPoints.map((point) => point.month),
        datasets: [
          {
            label: "Predicted Depth",
            data: forecastPoints.map((point) => point.depth_mbgl),
            borderColor: "#22d3ee",
            tension: 0.4,
            pointRadius: 3,
          },
          {
            label: "Upper Band",
            data: forecastPoints.map((point) => point.upper_band),
            borderColor: "#a855f7",
            backgroundColor: "rgba(168,85,247,.1)",
            fill: false,
            tension: 0.4,
            pointRadius: 3,
          },
          {
            label: "Lower Band",
            data: forecastPoints.map((point) => point.lower_band),
            borderColor: "#34d399",
            fill: false,
            tension: 0.4,
            pointRadius: 3,
          },
        ],
      },
      shap: {
        labels: shapFeatures.map((item) => item.name),
        datasets: [
          {
            data: shapFeatures.map((item) => item.importance),
            backgroundColor: "rgba(168,85,247,.7)",
            borderRadius: 5,
          },
        ],
      },
    }),
    [forecastPoints, shapFeatures],
  );

  const requestStatusCounts = useMemo(() => {
    const counts: Record<string, number> = { open: 0, in_review: 0, critical: 0, resolved: 0 };
    for (const row of requests) {
      const s = String(row.status || "").toLowerCase();
      if (s === "open") counts.open += 1;
      if (s === "in_review" || s === "in_progress") counts.in_review += 1;
      if (s === "escalated") counts.critical += 1;
      if (s === "resolved") counts.resolved += 1;
    }
    return counts;
  }, [requests]);

  const handleGenerateReport = async (reportType: string) => {
    setReportBusy(reportType);
    setReportMessage("");
    try {
      const res = await generateGovReport(reportType);
      setReportMessage(res.file_url ? `Generated: ${res.file_url}` : res.message || "Report generated.");
    } catch (error) {
      setReportMessage(error instanceof Error ? error.message : "Report generation failed.");
    } finally {
      setReportBusy("");
    }
  };

  const logout = () => {
    sessionStorage.clear();
    navigate("/login");
  };

  const renderOverview = () => (
    <>
      <div className="g-kpi-row">
        <article className="g-kpi"><div className="g-kpi-value tone-rose">{overview?.open_complaints ?? 0}</div><div className="g-kpi-label">Open Requests</div><div className="g-kpi-hint">District: {overview?.district || "-"}</div></article>
        <article className="g-kpi"><div className="g-kpi-value tone-amber">{overview?.pending_tasks ?? 0}</div><div className="g-kpi-label">Pending Tasks</div><div className="g-kpi-hint">Live task queue</div></article>
        <article className="g-kpi"><div className="g-kpi-value tone-green">{overview?.resolved_this_month ?? 0}</div><div className="g-kpi-label">Resolved (Month)</div><div className="g-kpi-hint">Live complaint status</div></article>
        <article className="g-kpi"><div className="g-kpi-value tone-rose">{crisisZones.filter((z) => String(z.risk_status).toUpperCase() === "DANGER").length}</div><div className="g-kpi-label">Critical Zones</div><div className="g-kpi-hint">From crisis-zones API</div></article>
        <article className="g-kpi"><div className="g-kpi-value tone-blue">{overview?.active_tanker_routes ?? 0}</div><div className="g-kpi-label">Tankers Active</div><div className="g-kpi-hint">District routes</div></article>
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
              {(overview?.priority_requests || []).map((row) => (
                <tr key={row.id}>
                  <td>{row.tracking_number}</td>
                  <td>{row.issue}</td>
                  <td>{row.village || "-"}</td>
                  <td><span className={`g-tag ${priorityClass(row.priority)}`}>{String(row.priority || "-").toUpperCase()}</span></td>
                  <td><span className={`g-status ${statusClass(row.status)}`}>{String(row.status || "-").toUpperCase()}</span></td>
                  <td><button className="g-btn g-btn-ghost">{row.assigned_to ? row.assigned_to : "Unassigned"}</button></td>
                </tr>
              ))}
              {(overview?.priority_requests || []).length === 0 ? (
                <tr><td colSpan={6}>No priority requests available.</td></tr>
              ) : null}
            </tbody>
          </table>
        </section>

        <section className="g-card">
          <div className="g-card-head">Recent Activity</div>
          {(overview?.recent_activity || []).map((entry, idx) => (
            <div className="g-activity-item" key={`${entry.timestamp}-${idx}`}>
              <span className="g-activity-dot tone-blue" /> {entry.action} {entry.target ? `(${entry.target})` : ""} · {entry.timestamp}
            </div>
          ))}
          {(overview?.recent_activity || []).length === 0 ? <div className="g-activity-item">No recent activity available.</div> : null}
        </section>
      </div>
    </>
  );

  const renderRequests = () => (
    <section className="g-card">
      <div className="g-card-title-row"><div className="g-card-head">All Citizen Requests</div><button className="g-btn g-btn-primary">Export</button></div>
      <div className="g-filter-row">
        <button className="g-pill active">ALL ({requestsTotal || requests.length})</button>
        <button className="g-pill">OPEN ({requestStatusCounts.open})</button>
        <button className="g-pill">IN REVIEW ({requestStatusCounts.in_review})</button>
        <button className="g-pill">CRITICAL ({requestStatusCounts.critical})</button>
        <button className="g-pill">RESOLVED ({requestStatusCounts.resolved})</button>
      </div>
      <table className="g-table">
        <thead><tr><th>Report ID</th><th>Citizen</th><th>Issue</th><th>Location</th><th>Priority</th><th>Status</th><th>Assigned</th></tr></thead>
        <tbody>
          {requests.map((row) => (
            <tr key={row.id}>
              <td>{row.tracking_number}</td>
              <td>-</td>
              <td>{row.type}</td>
              <td>{[row.village, row.taluka, row.district].filter(Boolean).join(", ")}</td>
              <td><span className={`g-tag ${priorityClass(row.priority)}`}>{String(row.priority || "-").toUpperCase()}</span></td>
              <td><span className={`g-status ${statusClass(row.status)}`}>{String(row.status || "-").toUpperCase()}</span></td>
              <td>{row.assigned_officer_id ? `Officer #${row.assigned_officer_id}` : "-"}</td>
            </tr>
          ))}
          {requests.length === 0 ? <tr><td colSpan={7}>No requests found.</td></tr> : null}
        </tbody>
      </table>
    </section>
  );

  const renderDistricts = () => {
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
              {districtRows.map((row) => (
                <tr key={row.district}>
                  <td>{row.district}</td>
                  <td>{Number(row.avg_depth_mbgl || 0).toFixed(2)}m</td>
                  <td>{row.wells}</td>
                  <td>{row.reports}</td>
                  <td><span className={`g-status ${riskClass(row.risk)}`}>{String(row.risk || "-").toUpperCase()}</span></td>
                  <td>{row.tankers}</td>
                </tr>
              ))}
              {districtRows.length === 0 ? <tr><td colSpan={6}>No district summary available.</td></tr> : null}
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
          <div className="g-note"><strong>Source:</strong> Live /forecast/long endpoint with confidence bands.</div>
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
            {crisisZones.map((zone) => (
              <tr key={zone.district}>
                <td>{zone.district}</td>
                <td>{Number(zone.avg_depth_mbgl || 0).toFixed(2)}m</td>
                <td className={String(zone.risk_status).toUpperCase() === "DANGER" ? "tone-rose" : "tone-amber"}>{Number(zone.avg_depth_mbgl || 0).toFixed(2)}m</td>
                <td>{Math.min(99, Math.max(60, Math.round(Number(zone.crisis_index || 0))))}%</td>
                <td>{String(zone.risk_status).toUpperCase() === "DANGER" ? "Emergency tanker + escalation" : "Weekly monitoring"}</td>
              </tr>
            ))}
            {crisisZones.length === 0 ? <tr><td colSpan={5}>No crisis forecast rows available.</td></tr> : null}
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
            {teamWorkload.map((row) => (
              <tr key={row.officer_id}>
                <td>{row.officer_name}</td>
                <td>{Number(row.pending || 0) + Number(row.in_progress || 0)}</td>
                <td>{row.completed}</td>
                <td><span className={`g-status ${Number(row.total || 0) >= 5 ? "s-critical" : Number(row.total || 0) >= 3 ? "s-review" : "s-resolved"}`}>{Number(row.total || 0) >= 5 ? "FULL" : Number(row.total || 0) >= 3 ? "BUSY" : "FREE"}</span></td>
              </tr>
            ))}
            {teamWorkload.length === 0 ? <tr><td colSpan={4}>No workload data available.</td></tr> : null}
          </tbody>
        </table>
      </section>

      <section className="g-card">
        <div className="g-card-head">Recent Tasks</div>
        <table className="g-table">
          <thead><tr><th>Task ID</th><th>Complaint</th><th>Assignee</th><th>Priority</th><th>Status</th></tr></thead>
          <tbody>
            {tasks.map((task) => (
              <tr key={task.id}>
                <td>{task.id}</td>
                <td>{task.complaint_id}</td>
                <td>{task.assignee_name || "-"}</td>
                <td><span className={`g-tag ${priorityClass(task.priority)}`}>{String(task.priority || "-").toUpperCase()}</span></td>
                <td><span className={`g-status ${statusClass(task.status)}`}>{String(task.status || "-").toUpperCase()}</span></td>
              </tr>
            ))}
            {tasks.length === 0 ? <tr><td colSpan={5}>No task data available.</td></tr> : null}
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
          {tankers.map((row) => (
            <tr key={row.id}>
              <td>T-{String(row.id).padStart(3, "0")}</td>
              <td>{row.route_name || "-"}</td>
              <td>{Array.isArray(row.villages) ? row.villages.join(", ") : "-"}</td>
              <td>{row.schedule || "-"}</td>
              <td>{Number(row.capacity_liters || 0).toLocaleString()}L</td>
              <td><span className={`g-status ${String(row.status).toLowerCase() === "active" ? "s-resolved" : "s-review"}`}>{String(row.status || "-").toUpperCase()}</span></td>
            </tr>
          ))}
          {tankers.length === 0 ? <tr><td colSpan={6}>No tanker routes available.</td></tr> : null}
        </tbody>
      </table>
    </section>
  );

  const renderReports = () => (
    <div className="g-grid-3">
      <article className="g-report-card"><FileBarChart size={44} /><h4>Monthly Status Report</h4><p>District water summary</p><button className="g-btn g-btn-primary" disabled={reportBusy === "monthly_status"} onClick={() => void handleGenerateReport("monthly_status")}>PDF</button></article>
      <article className="g-report-card"><Brain size={44} /><h4>AI Prediction Report</h4><p>90-day forecast and confidence</p><button className="g-btn g-btn-primary" disabled={reportBusy === "ai_prediction"} onClick={() => void handleGenerateReport("ai_prediction")}>PDF</button></article>
      <article className="g-report-card"><Users size={44} /><h4>Citizen Request Report</h4><p>Requests and resolution times</p><button className="g-btn g-btn-primary" disabled={reportBusy === "citizen_requests"} onClick={() => void handleGenerateReport("citizen_requests")}>CSV</button></article>
      {reportMessage ? <div className="g-note">{reportMessage}</div> : null}
    </div>
  );

  const renderActivity = () => (
    <section className="g-card">
      <div className="g-card-head">System Activity Log</div>
      <table className="g-table">
        <thead><tr><th>Timestamp</th><th>Actor</th><th>Action</th><th>Target</th><th>Details</th></tr></thead>
        <tbody>
          {activity.map((entry) => (
            <tr key={entry.id}>
              <td>{new Date(entry.created_at).toLocaleString()}</td>
              <td>{entry.actor_role || `ID ${entry.actor_id}`}</td>
              <td className="tone-blue">{entry.action}</td>
              <td>{entry.target_table}#{entry.target_id}</td>
              <td>{entry.details ? JSON.stringify(entry.details) : "-"}</td>
            </tr>
          ))}
          {activity.length === 0 ? <tr><td colSpan={5}>No activity logs available.</td></tr> : null}
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
          {dataLoading ? (
            <div className="g-banner g-banner-info"><Loader2 size={15} className="g-spin" /> Loading live gov dashboard data...</div>
          ) : null}
          {dataError ? <div className="g-banner g-banner-warn">{dataError}</div> : null}
          {renderPage()}
        </section>
      </main>
    </div>
  );
}