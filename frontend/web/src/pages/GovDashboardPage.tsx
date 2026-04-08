import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Brain,
  ClipboardList,
  Download,
  FileBarChart,
  Home,
  Landmark,
  LayoutDashboard,
  Loader2,
  LogOut,
  MapPin,
  Menu,
  PanelLeft,
  Plus,
  RefreshCw,
  Save,
  ScrollText,
  Search,
  Truck,
  Users
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Bar, Doughnut, Line, Scatter } from "react-chartjs-2";
import ChartErrorBoundary from "../components/ChartErrorBoundary";
import {
  assignGovRequest,
  createGovTask,
  createGovTanker,
  DistrictAnalyticsResponse,
  DistrictSummaryRow,
  exportGovRequestsCSV,
  generateGovReport,
  getGovActivityLog,
  getGovCrisisZones,
  getGovDistrictAnalytics,
  getGovDistrictSummary,
  getGovForecast,
  getGovForecastLong,
  getGovProfile,
  getGovRainfallDepth,
  getGovShapFeatures,
  getGovTeamWorkload,
  getGovOverview,
  listGovRequests,
  listGovTasks,
  listGovTankers,
  resolveGovRequest,
  escalateGovRequest,
  updateGovTanker,
  type ActivityLogResponse,
  type ComplaintResponse,
  type CrisisZone,
  type Forecast90DayPoint,
  type ForecastResponse,
  type OverviewResponse,
  type RainfallDepthPoint,
  type ReportJobResponse,
  type ShapFeature,
  type TankerResponse,
  type TaskListResponse,
  type UpdateTankerRequest,
  type WorkloadEntry
} from "../features/gov/api/govApi";
import "../styles/gov-dashboard.css";

type GovPage = "overview" | "requests" | "districts" | "forecast" | "assign" | "tankers" | "reports" | "activity";

type GovNavItem = {
  key: GovPage;
  label: string;
  icon: typeof LayoutDashboard;
  section: "Command" | "Management" | "System";
};

type RequestQueryState = {
  page: number;
  limit: number;
  q: string;
  status: string;
  priority: string;
};

type TaskFormState = {
  complaintId: string;
  assigneeOfficerId: string;
  priority: "low" | "medium" | "high" | "urgent";
  dueDate: string;
  notes: string;
};

type TankerFormState = {
  routeName: string;
  villages: string;
  schedule: string;
  capacityLiters: string;
  assignedDriver: string;
  contactNumber: string;
};

const navItems: GovNavItem[] = [
  { key: "overview", label: "Command Center", icon: LayoutDashboard, section: "Command" },
  { key: "requests", label: "All Requests", icon: ClipboardList, section: "Command" },
  { key: "districts", label: "District Analytics", icon: MapPin, section: "Command" },
  { key: "forecast", label: "AI Forecasts", icon: Brain, section: "Command" },
  { key: "assign", label: "Task Assignment", icon: Users, section: "Management" },
  { key: "tankers", label: "Tanker Schedule", icon: Truck, section: "Management" },
  { key: "reports", label: "Generate Reports", icon: FileBarChart, section: "Management" },
  { key: "activity", label: "Activity Log", icon: ScrollText, section: "System" }
];

const pageTitle: Record<GovPage, string> = {
  overview: "Command Center",
  requests: "All Requests",
  districts: "District Analytics",
  forecast: "AI Forecasts",
  assign: "Task Assignment",
  tankers: "Tanker Schedule",
  reports: "Generate Reports",
  activity: "Activity Log"
};

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { labels: { color: "#64748b", font: { family: "JetBrains Mono" } } }
  },
  scales: {
    x: { grid: { color: "rgba(255,255,255,.04)" }, ticks: { color: "#64748b" } },
    y: { grid: { color: "rgba(255,255,255,.04)" }, ticks: { color: "#64748b" } }
  }
};

const initialRequestQuery: RequestQueryState = {
  page: 1,
  limit: 20,
  q: "",
  status: "",
  priority: ""
};

const initialTaskForm: TaskFormState = {
  complaintId: "",
  assigneeOfficerId: "",
  priority: "high",
  dueDate: "",
  notes: ""
};

const initialTankerForm: TankerFormState = {
  routeName: "",
  villages: "",
  schedule: "",
  capacityLiters: "",
  assignedDriver: "",
  contactNumber: ""
};

const fallbackCategoryData = {
  labels: ["Well/Borewell", "No Tanker", "Pipeline", "Hand Pump", "Quality"],
  values: [22, 18, 12, 9, 7]
};

const fallbackCrisisData = {
  labels: ["Yavatmal", "Amravati", "Akola", "Buldhana", "Washim", "Wardha", "Nagpur"],
  values: [9.2, 8.4, 7.1, 6.8, 6.2, 4.5, 3.8]
};

function formatDateTime(value: string): string {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function safeText(value: unknown): string {
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return "";
  return String(value);
}

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return safeText(value);
  }
}

function safeNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function getRiskBadge(depth: number): string {
  if (depth <= -68) return "g-risk-critical";
  if (depth <= -55) return "g-risk-high";
  return "g-risk-moderate";
}

function getStatusClass(status: string): string {
  const normalized = safeText(status).toLowerCase();
  if (normalized.includes("critical") || normalized.includes("escalat")) return "s-critical";
  if (normalized.includes("resolve")) return "s-resolved";
  if (normalized.includes("assign")) return "s-assigned";
  if (normalized.includes("review") || normalized.includes("progress") || normalized.includes("pending")) return "s-review";
  return "s-open";
}

function downloadTextFile(fileName: string, content: string, mimeType = "text/plain"): void {
  const blob = new Blob([content], { type: mimeType });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  window.URL.revokeObjectURL(url);
}

export default function GovDashboardPage() {
  const navigate = useNavigate();
  const [activePage, setActivePage] = useState<GovPage>("overview");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const [officerName, setOfficerName] = useState(sessionStorage.getItem("aqua_user") || "District Officer");
  const [officerDistrict, setOfficerDistrict] = useState(sessionStorage.getItem("aqua_user_district") || "");
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState("");

  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [overviewError, setOverviewError] = useState("");

  const [requests, setRequests] = useState<ComplaintResponse[]>([]);
  const [requestsMeta, setRequestsMeta] = useState({ page: 1, limit: 20, total_items: 0, total_pages: 0 });
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [requestsError, setRequestsError] = useState("");
  const [requestQuery, setRequestQuery] = useState<RequestQueryState>(initialRequestQuery);
  const [requestSearchDraft, setRequestSearchDraft] = useState("");
  const [requestBusyId, setRequestBusyId] = useState<number | null>(null);

  const [districtAnalytics, setDistrictAnalytics] = useState<DistrictAnalyticsResponse | null>(null);
  const [districtSummary, setDistrictSummary] = useState<DistrictSummaryRow[]>([]);
  const [rainfallDepth, setRainfallDepth] = useState<RainfallDepthPoint[]>([]);
  const [districtLoading, setDistrictLoading] = useState(true);
  const [districtError, setDistrictError] = useState("");

  const [forecast, setForecast] = useState<ForecastResponse | null>(null);
  const [forecastLong, setForecastLong] = useState<Forecast90DayPoint[]>([]);
  const [shapFeatures, setShapFeatures] = useState<ShapFeature[]>([]);
  const [crisisZones, setCrisisZones] = useState<CrisisZone[]>([]);
  const [forecastLoading, setForecastLoading] = useState(true);
  const [forecastError, setForecastError] = useState("");

  const [tankers, setTankers] = useState<TankerResponse[]>([]);
  const [tankerLoading, setTankerLoading] = useState(true);
  const [tankerError, setTankerError] = useState("");
  const [tankerForm, setTankerForm] = useState<TankerFormState>(initialTankerForm);
  const [tankerBusyId, setTankerBusyId] = useState<number | null>(null);

  const [tasks, setTasks] = useState<TaskListResponse | null>(null);
  const [workload, setWorkload] = useState<WorkloadEntry[]>([]);
  const [taskLoading, setTaskLoading] = useState(true);
  const [taskError, setTaskError] = useState("");
  const [taskForm, setTaskForm] = useState<TaskFormState>(initialTaskForm);
  const [taskBusy, setTaskBusy] = useState(false);

  const [activityLog, setActivityLog] = useState<ActivityLogResponse | null>(null);
  const [activityLoading, setActivityLoading] = useState(true);
  const [activityError, setActivityError] = useState("");

  const [reportMessage, setReportMessage] = useState("");
  const [reportBusy, setReportBusy] = useState(false);

  const safeDistrictSummary = Array.isArray(districtSummary) ? districtSummary : [];
  const safeRainfallDepth = Array.isArray(rainfallDepth) ? rainfallDepth : [];
  const safeForecastLong = Array.isArray(forecastLong) ? forecastLong : [];
  const safeShapFeatures = Array.isArray(shapFeatures) ? shapFeatures : [];
  const safeCrisisZones = Array.isArray(crisisZones) ? crisisZones : [];
  const safeTankers = Array.isArray(tankers) ? tankers : [];
  const safeWorkload = Array.isArray(workload) ? workload : [];
  const safeForecastSeries = Array.isArray(forecast?.forecast) ? forecast.forecast : [];

  useEffect(() => {
    const role = sessionStorage.getItem("aqua_role");
    const token = sessionStorage.getItem("aqua_token");
    if (role !== "gov" || !token) {
      navigate("/login", { replace: true });
      return;
    }

    const loadProfile = async () => {
      setProfileLoading(true);
      setProfileError("");
      try {
        const profile = await getGovProfile();
        const displayName = profile.name || profile.email || "District Officer";
        setOfficerName(displayName);
        setOfficerDistrict(profile.district || "");
        sessionStorage.setItem("aqua_user", displayName);
        sessionStorage.setItem("aqua_user_email", profile.email || "");
        sessionStorage.setItem("aqua_user_id", String(profile.id || ""));
        sessionStorage.setItem("aqua_user_district", profile.district || "");
      } catch (error) {
        setProfileError(error instanceof Error ? error.message : "Failed to load gov profile.");
      } finally {
        setProfileLoading(false);
      }
    };

    void loadProfile();
    void loadOverview();
    void loadDistrictData();
    void loadForecastData();
    void loadTankers();
    void loadTasks();
    void loadActivity();
  }, [navigate]);

  useEffect(() => {
    void loadRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestQuery.page, requestQuery.limit, requestQuery.q, requestQuery.status, requestQuery.priority]);

  const loadOverview = async () => {
    setOverviewLoading(true);
    setOverviewError("");
    try {
      setOverview(await getGovOverview());
    } catch (error) {
      setOverviewError(error instanceof Error ? error.message : "Failed to load overview");
    } finally {
      setOverviewLoading(false);
    }
  };

  const loadRequests = async (query: RequestQueryState = requestQuery) => {
    setRequestsLoading(true);
    setRequestsError("");
    try {
      const response = await listGovRequests(query);
      setRequests(response.data || []);
      setRequestsMeta(response.meta || { page: 1, limit: 20, total_items: 0, total_pages: 0 });
    } catch (error) {
      setRequestsError(error instanceof Error ? error.message : "Failed to load requests");
    } finally {
      setRequestsLoading(false);
    }
  };

  const loadDistrictData = async () => {
    setDistrictLoading(true);
    setDistrictError("");
    try {
      const [analyticsResponse, summaryResponse, rainfallResponse] = await Promise.all([
        getGovDistrictAnalytics(),
        getGovDistrictSummary(),
        getGovRainfallDepth()
      ]);
      setDistrictAnalytics(analyticsResponse);
      setDistrictSummary(Array.isArray(summaryResponse) ? summaryResponse : []);
      setRainfallDepth(Array.isArray(rainfallResponse) ? rainfallResponse : []);
    } catch (error) {
      setDistrictError(error instanceof Error ? error.message : "Failed to load district analytics");
    } finally {
      setDistrictLoading(false);
    }
  };

  const loadForecastData = async () => {
    setForecastLoading(true);
    setForecastError("");
    try {
      const [forecastResponse, longResponse, shapResponse, crisisResponse] = await Promise.all([
        getGovForecast(),
        getGovForecastLong(),
        getGovShapFeatures(),
        getGovCrisisZones()
      ]);
      setForecast(forecastResponse && Array.isArray((forecastResponse as ForecastResponse).forecast)
        ? forecastResponse
        : { district: "", forecast: [] });
      setForecastLong(Array.isArray(longResponse) ? longResponse : []);
      setShapFeatures(Array.isArray(shapResponse) ? shapResponse : []);
      setCrisisZones(Array.isArray(crisisResponse) ? crisisResponse : []);
    } catch (error) {
      setForecastError(error instanceof Error ? error.message : "Failed to load forecast data");
    } finally {
      setForecastLoading(false);
    }
  };

  const loadTankers = async () => {
    setTankerLoading(true);
    setTankerError("");
    try {
      setTankers(await listGovTankers());
    } catch (error) {
      setTankerError(error instanceof Error ? error.message : "Failed to load tanker routes");
    } finally {
      setTankerLoading(false);
    }
  };

  const loadTasks = async () => {
    setTaskLoading(true);
    setTaskError("");
    try {
      const [taskResponse, workloadResponse] = await Promise.all([listGovTasks({ page: 1, limit: 20 }), getGovTeamWorkload()]);
      setTasks(taskResponse);
      setWorkload(workloadResponse);
    } catch (error) {
      setTaskError(error instanceof Error ? error.message : "Failed to load tasks");
    } finally {
      setTaskLoading(false);
    }
  };

  const loadActivity = async () => {
    setActivityLoading(true);
    setActivityError("");
    try {
      setActivityLog(await getGovActivityLog({ page: 1, limit: 20 }));
    } catch (error) {
      setActivityError(error instanceof Error ? error.message : "Failed to load activity log");
    } finally {
      setActivityLoading(false);
    }
  };

  const refreshOverview = async () => {
    await Promise.all([loadOverview(), loadRequests(), loadDistrictData(), loadForecastData(), loadTankers(), loadTasks(), loadActivity()]);
  };

  const handleLogout = () => {
    sessionStorage.clear();
    navigate("/login");
  };

  const handleRequestAction = async (action: "assign" | "resolve" | "escalate", requestId: number) => {
    setRequestBusyId(requestId);
    try {
      if (action === "assign") {
        const officerInput = window.prompt("Officer ID to assign this request to:");
        if (!officerInput) return;
        const note = window.prompt("Assignment note (optional):") || "";
        await assignGovRequest(requestId, { officer_id: Number(officerInput), note });
      }

      if (action === "resolve") {
        await resolveGovRequest(requestId);
      }

      if (action === "escalate") {
        const note = window.prompt("Escalation note (optional):") || "";
        await escalateGovRequest(requestId, { escalation_note: note });
      }

      await Promise.all([loadRequests(), loadOverview(), loadActivity()]);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Request action failed");
    } finally {
      setRequestBusyId(null);
    }
  };

  const handleExport = async () => {
    try {
      const csv = await exportGovRequestsCSV(requestQuery);
      downloadTextFile("gov-requests.csv", csv, "text/csv");
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Export failed");
    }
  };

  const handleGenerateReport = async (reportType: string) => {
    setReportBusy(true);
    setReportMessage("");
    try {
      const job: ReportJobResponse = await generateGovReport(reportType);
      setReportMessage(`${job.message || "Report generated"} (${job.job_id})`);
    } catch (error) {
      setReportMessage(error instanceof Error ? error.message : "Report generation failed");
    } finally {
      setReportBusy(false);
    }
  };

  const handleTaskSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTaskBusy(true);
    try {
      await createGovTask({
        complaint_id: Number(taskForm.complaintId),
        assignee_officer_id: Number(taskForm.assigneeOfficerId),
        priority: taskForm.priority,
        due_date: taskForm.dueDate || undefined,
        notes: taskForm.notes || undefined
      });
      setTaskForm(initialTaskForm);
      await Promise.all([loadTasks(), loadOverview(), loadRequests()]);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Task creation failed");
    } finally {
      setTaskBusy(false);
    }
  };

  const handleTankerSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTankerBusyId(0);
    try {
      await createGovTanker({
        route_name: tankerForm.routeName,
        villages: tankerForm.villages.split(",").map((item) => item.trim()).filter(Boolean),
        schedule: tankerForm.schedule,
        capacity_liters: Number(tankerForm.capacityLiters),
        assigned_driver: tankerForm.assignedDriver,
        contact_number: tankerForm.contactNumber
      });
      setTankerForm(initialTankerForm);
      await Promise.all([loadTankers(), loadOverview()]);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Tanker creation failed");
    } finally {
      setTankerBusyId(null);
    }
  };

  const handleUpdateTankerStatus = async (tanker: TankerResponse) => {
    const nextStatus = window.prompt("Update tanker status", tanker.status);
    if (!nextStatus) return;
    setTankerBusyId(tanker.id);
    try {
      const payload: UpdateTankerRequest = { status: nextStatus };
      await updateGovTanker(tanker.id, payload);
      await Promise.all([loadTankers(), loadOverview()]);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Tanker update failed");
    } finally {
      setTankerBusyId(null);
    }
  };

  const categoryChartData = useMemo(() => {
    const labels = overview?.category_counts?.map((item) => item.category) || fallbackCategoryData.labels;
    const values = overview?.category_counts?.map((item) => item.count) || fallbackCategoryData.values;
    return {
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: ["#fb7185", "#fbbf24", "#3b82f6", "#22d3ee", "#a855f7"],
          borderWidth: 0
        }
      ]
    };
  }, [overview]);

  const crisisChartData = useMemo(() => {
    const labels = overview?.crisis_series?.map((item) => item.district) || fallbackCrisisData.labels;
    const values = overview?.crisis_series?.map((item) => item.score) || fallbackCrisisData.values;
    return {
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: ["#fb7185", "#fb7185", "#fbbf24", "#fbbf24", "#fbbf24", "#22d3ee", "#34d399"],
          borderRadius: 8
        }
      ]
    };
  }, [overview]);

  const groundwaterChartData = useMemo(() => ({
    labels: safeDistrictSummary.length ? safeDistrictSummary.map((row) => row.district) : ["Yavatmal", "Amravati", "Akola", "Buldhana", "Washim", "Wardha", "Nagpur"],
    datasets: [
      {
        data: safeDistrictSummary.length ? safeDistrictSummary.map((row) => Math.abs(row.avg_depth_mbgl)) : [72.1, 63.4, 58.7, 55.8, 52.3, 41.2, 36.5],
        backgroundColor: "rgba(59,130,246,.65)",
        borderRadius: 6
      }
    ]
  }), [safeDistrictSummary]);

  const rainfallChartData = useMemo(() => ({
    datasets: [
      {
        label: "District points",
        data: safeRainfallDepth.length
          ? safeRainfallDepth.map((point) => ({ x: point.rainfall_mm, y: point.depth_mbgl }))
          : [
              { x: 580, y: -35 },
              { x: 620, y: -38 },
              { x: 490, y: -55 },
              { x: 450, y: -60 },
              { x: 720, y: -28 },
              { x: 680, y: -32 },
              { x: 410, y: -68 },
              { x: 380, y: -72 },
              { x: 530, y: -48 }
            ],
        backgroundColor: "rgba(59,130,246,.75)",
        pointRadius: 6
      }
    ]
  }), [safeRainfallDepth]);

  const forecastLineData = useMemo(() => {
    const fallbackLabels = ["Mar", "Apr", "May", "Jun", "Jul", "Aug"];
    const fallbackValues = [-63.4, -65, -71, -75, -70, -62];
    const hasLongForecast = safeForecastLong.length > 0;
    const hasShortForecast = safeForecastSeries.length > 0;
    const labels = hasLongForecast
      ? safeForecastLong.map((point) => point.month)
      : hasShortForecast
        ? safeForecastSeries.map((item) => item.label)
        : fallbackLabels;
    const values = hasLongForecast
      ? safeForecastLong.map((point) => point.depth_mbgl)
      : hasShortForecast
        ? safeForecastSeries.map((item) => item.depth_mbgl)
        : fallbackValues;
    return {
      labels,
      datasets: [
        {
          label: "Forecast",
          data: values,
          borderColor: "#a855f7",
          backgroundColor: "rgba(168,85,247,.08)",
          fill: true,
          tension: 0.4,
          pointRadius: 3
        }
      ]
    };
  }, [safeForecastLong, safeForecastSeries]);

  const shapChartData = useMemo(() => ({
    labels: safeShapFeatures.length ? safeShapFeatures.map((item) => item.name) : ["Prev Month Depth", "Rainfall Lag", "Soil Moisture", "Season", "Rolling Avg", "NDVI", "Temp Max"],
    datasets: [
      {
        data: safeShapFeatures.length ? safeShapFeatures.map((item) => item.importance) : [0.31, 0.24, 0.18, 0.11, 0.08, 0.05, 0.03],
        backgroundColor: "rgba(168,85,247,.7)",
        borderRadius: 5
      }
    ]
  }), [safeShapFeatures]);

  const workloadChartData = useMemo(() => ({
    labels: safeWorkload.length ? safeWorkload.map((item) => item.officer_name) : ["Patil", "Sharma", "Team A", "Plumbing"],
    datasets: [
      {
        label: "Active",
        data: safeWorkload.length ? safeWorkload.map((item) => item.pending + item.in_progress) : [3, 1, 4, 2],
        backgroundColor: "rgba(251,113,133,.7)",
        borderRadius: 4
      },
      {
        label: "Completed",
        data: safeWorkload.length ? safeWorkload.map((item) => item.completed) : [12, 8, 22, 15],
        backgroundColor: "rgba(52,211,153,.4)",
        borderRadius: 4
      }
    ]
  }), [safeWorkload]);

  const pageIcon = navItems.find((item) => item.key === activePage)?.icon || LayoutDashboard;
  const TitleIcon = pageIcon;

  const renderBanner = () => (
    <>
      {profileLoading ? <div className="g-banner g-banner-info"><Loader2 size={15} className="g-spin" /> Loading gov profile...</div> : null}
      {profileError ? <div className="g-banner g-banner-warn"><AlertCircle size={15} /> Profile sync failed: {profileError}. Using session data.</div> : null}
      {overviewError ? <div className="g-banner g-banner-warn"><AlertCircle size={15} /> Overview error: {overviewError}</div> : null}
      {requestsError ? <div className="g-banner g-banner-warn"><AlertCircle size={15} /> Requests error: {requestsError}</div> : null}
      {districtError ? <div className="g-banner g-banner-warn"><AlertCircle size={15} /> District analytics error: {districtError}</div> : null}
      {forecastError ? <div className="g-banner g-banner-warn"><AlertCircle size={15} /> Forecast error: {forecastError}</div> : null}
      {tankerError ? <div className="g-banner g-banner-warn"><AlertCircle size={15} /> Tanker error: {tankerError}</div> : null}
      {taskError ? <div className="g-banner g-banner-warn"><AlertCircle size={15} /> Task error: {taskError}</div> : null}
      {activityError ? <div className="g-banner g-banner-warn"><AlertCircle size={15} /> Activity error: {activityError}</div> : null}
      {reportMessage ? <div className="g-banner g-banner-info"><Save size={15} /> {reportMessage}</div> : null}
    </>
  );

  const renderOverview = () => {
    const priorityRequests = overview?.priority_requests || requests.slice(0, 4).map((item) => ({
      id: item.id,
      tracking_number: item.tracking_number,
      issue: item.type,
      village: item.village,
      priority: item.priority,
      status: item.status,
      assigned_to: item.assigned_officer_id ? String(item.assigned_officer_id) : "-",
      submitted_at: item.created_at
    }));
    const activityRows = overview?.recent_activity || activityLog?.data?.slice(0, 4).map((entry) => ({
      timestamp: entry.created_at,
      actor: entry.actor_role,
      action: entry.action,
      target: `#${entry.target_id}`,
      details: typeof entry.details === "string" ? entry.details : safeJson(entry.details)
    }));

    return (
      <>
        <div className="g-kpi-row">
          <article className="g-kpi"><div className="g-kpi-value tone-rose">{overviewLoading ? "..." : overview?.open_complaints ?? 0}</div><div className="g-kpi-label">Open Requests</div><div className="g-kpi-hint">active queue</div></article>
          <article className="g-kpi"><div className="g-kpi-value tone-amber">{overviewLoading ? "..." : overview?.pending_tasks ?? 0}</div><div className="g-kpi-label">Pending Tasks</div><div className="g-kpi-hint">assignment backlog</div></article>
          <article className="g-kpi"><div className="g-kpi-value tone-green">{overviewLoading ? "..." : overview?.resolved_this_month ?? 0}</div><div className="g-kpi-label">Resolved (Month)</div><div className="g-kpi-hint">live backend metric</div></article>
          <article className="g-kpi"><div className="g-kpi-value tone-rose">{overviewLoading ? "..." : safeNumber(overview?.crisis_index).toFixed(1)}</div><div className="g-kpi-label">Crisis Index</div><div className="g-kpi-hint">district risk score</div></article>
          <article className="g-kpi"><div className="g-kpi-value tone-blue">{overviewLoading ? "..." : overview?.active_tanker_routes ?? safeTankers.length}</div><div className="g-kpi-label">Tankers Active</div><div className="g-kpi-hint">routes in service</div></article>
        </div>

        <div className="g-grid-2">
          <section className="g-card">
            <div className="g-card-head">Requests by Category</div>
            <div className="g-chart-wrap">
              <ChartErrorBoundary fallbackText="Category chart unavailable.">
                <Doughnut data={categoryChartData} options={{ responsive: true, maintainAspectRatio: false }} />
              </ChartErrorBoundary>
            </div>
          </section>
          <section className="g-card">
            <div className="g-card-head">District Crisis Index</div>
            <div className="g-chart-wrap">
              <ChartErrorBoundary fallbackText="Crisis index chart unavailable.">
                <Bar data={crisisChartData} options={chartOptions} />
              </ChartErrorBoundary>
            </div>
          </section>
        </div>

        <div className="g-grid-2">
          <section className="g-card">
            <div className="g-card-title-row">
              <div className="g-card-head">Priority Requests</div>
              <button className="g-btn g-btn-ghost" type="button" onClick={() => void loadRequests()}><RefreshCw size={14} /> Refresh</button>
            </div>
            <table className="g-table">
              <thead><tr><th>ID</th><th>Issue</th><th>Village</th><th>Priority</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>
                {(priorityRequests || []).slice(0, 4).map((request) => (
                  <tr key={request.id}>
                    <td>#{request.tracking_number}</td>
                    <td>{request.issue}</td>
                    <td>{request.village}</td>
                    <td><span className={`g-tag ${safeText(request.priority).toLowerCase().includes("high") ? "p-high" : "p-med"}`}>{safeText(request.priority).toUpperCase()}</span></td>
                    <td><span className={`g-status ${getStatusClass(request.status)}`}>{safeText(request.status).toUpperCase()}</span></td>
                    <td><button className="g-btn g-btn-primary" type="button" onClick={() => void handleRequestAction("assign", request.id)}>Assign</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="g-card">
            <div className="g-card-head">Recent Activity</div>
            {activityRows && activityRows.length > 0 ? activityRows.map((entry, index) => (
              <div className="g-activity-item" key={`${entry.timestamp}-${index}`}>
                <span className={`g-activity-dot ${index % 4 === 0 ? "tone-green" : index % 4 === 1 ? "tone-blue" : index % 4 === 2 ? "tone-rose" : "tone-amber"}`} />
                <div>
                  <div className="activity-text">{entry.action} · {entry.target}</div>
                  <div className="activity-time mono">{formatDateTime(entry.timestamp)}</div>
                </div>
              </div>
            )) : <div className="g-banner g-banner-info">No activity data yet.</div>}
          </section>
        </div>
      </>
    );
  };

  const renderRequests = () => (
    <section className="g-card">
      <div className="g-card-title-row">
        <div className="g-card-head">All Citizen Requests</div>
        <button className="g-btn g-btn-primary" type="button" onClick={() => void handleExport()}><Download size={14} /> Export CSV</button>
      </div>
      <div className="g-filter-row">
        {[
          { label: `ALL (${requestsMeta.total_items})`, status: "" },
          { label: "OPEN", status: "open" },
          { label: "IN REVIEW", status: "in_review" },
          { label: "CRITICAL", status: "escalated" },
          { label: "RESOLVED", status: "resolved" }
        ].map((pill) => (
          <button
            key={pill.label}
            type="button"
            className={`g-pill ${requestQuery.status === pill.status ? "active" : ""}`}
            onClick={() => setRequestQuery((prev) => ({ ...prev, status: pill.status, page: 1 }))}
          >
            {pill.label}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", gap: ".75rem", marginBottom: "1rem", flexWrap: "wrap" }}>
        <input className="g-input" style={{ flex: 1, minWidth: 220 }} placeholder="Search by ID, village, issue..." value={requestSearchDraft} onChange={(event) => setRequestSearchDraft(event.target.value)} />
        <select className="g-input" style={{ minWidth: 160 }} value={requestQuery.priority} onChange={(event) => setRequestQuery((prev) => ({ ...prev, priority: event.target.value, page: 1 }))}>
          <option value="">All Priorities</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>
        <button className="g-btn g-btn-ghost" type="button" onClick={() => setRequestQuery(initialRequestQuery)}>Reset</button>
        <button className="g-btn g-btn-primary" type="button" onClick={() => setRequestQuery((prev) => ({ ...prev, q: requestSearchDraft, page: 1 }))}><Search size={14} /> Search</button>
      </div>
      {requestsLoading ? <div className="g-banner g-banner-info"><Loader2 size={15} className="g-spin" /> Loading requests...</div> : null}
      <table className="g-table">
        <thead><tr><th>Report ID</th><th>Location</th><th>Issue</th><th>Date</th><th>Priority</th><th>Status</th><th>Assigned</th><th>Action</th></tr></thead>
        <tbody>
          {requests.map((request) => (
            <tr key={request.id}>
              <td className="mono" style={{ color: "var(--accent)" }}>#{request.tracking_number}</td>
              <td>{request.village}, {request.district}</td>
              <td>{request.type}</td>
              <td className="mono">{formatDateTime(request.created_at)}</td>
              <td><span className={`g-tag ${safeText(request.priority).toLowerCase().includes("high") ? "p-high" : safeText(request.priority).toLowerCase().includes("medium") ? "p-med" : "p-med"}`}>{safeText(request.priority).toUpperCase()}</span></td>
              <td><span className={`g-status ${getStatusClass(request.status)}`}>{safeText(request.status).toUpperCase()}</span></td>
              <td>{request.assigned_officer_id ? `#${request.assigned_officer_id}` : "—"}</td>
              <td style={{ display: "flex", gap: ".35rem", flexWrap: "wrap" }}>
                <button className="g-btn g-btn-primary" type="button" disabled={requestBusyId === request.id} onClick={() => void handleRequestAction("assign", request.id)}>{requestBusyId === request.id ? "..." : "Assign"}</button>
                <button className="g-btn g-btn-ghost" type="button" onClick={() => void handleRequestAction("resolve", request.id)}>Resolve</button>
                <button className="g-btn g-btn-danger" type="button" onClick={() => void handleRequestAction("escalate", request.id)}>Escalate</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ marginTop: ".9rem", display: "flex", justifyContent: "space-between", gap: ".75rem", flexWrap: "wrap", color: "#64748b", fontSize: ".78rem" }}>
        <span>Showing page {requestsMeta.page} of {requestsMeta.total_pages}</span>
        <span>Total requests: {requestsMeta.total_items}</span>
      </div>
    </section>
  );

  const renderDistricts = () => (
    <>
      <div className="g-grid-2">
        <section className="g-card">
          <div className="g-card-head">Groundwater Levels by District</div>
          <div className="g-chart-wrap">
            <ChartErrorBoundary fallbackText="Groundwater chart unavailable.">
              <Bar data={groundwaterChartData} options={{ ...chartOptions, indexAxis: "y" as const }} />
            </ChartErrorBoundary>
          </div>
        </section>
        <section className="g-card">
          <div className="g-card-head">Rainfall vs Depth Scatter</div>
          <div className="g-chart-wrap">
            <ChartErrorBoundary fallbackText="Scatter chart unavailable.">
              <Scatter data={rainfallChartData} options={chartOptions} />
            </ChartErrorBoundary>
          </div>
        </section>
      </div>

      <section className="g-card">
        <div className="g-card-head">District Summary</div>
        {districtLoading ? <div className="g-banner g-banner-info"><Loader2 size={15} className="g-spin" /> Loading district analytics...</div> : null}
        <table className="g-table">
          <thead><tr><th>District</th><th>Avg Depth</th><th>Change</th><th>Wells</th><th>Reports</th><th>Risk</th><th>Tankers</th></tr></thead>
          <tbody>
            {(safeDistrictSummary.length ? safeDistrictSummary : districtAnalytics ? [{ district: districtAnalytics.district, avg_depth_mbgl: districtAnalytics.avg_depth_mbgl, change: districtAnalytics.depth_change_qoq, wells: districtAnalytics.well_count, reports: 0, risk: districtAnalytics.risk_status, tankers: overview?.active_tanker_routes || 0 }] : []).map((row) => (
              <tr key={row.district}>
                <td><strong>{row.district}</strong></td>
                <td className="mono">{safeNumber(row.avg_depth_mbgl).toFixed(1)}m</td>
                <td className="mono" style={{ color: safeNumber(row.change) < 0 ? "var(--neon-rose)" : "var(--neon-green)" }}>{safeNumber(row.change) < 0 ? "▼" : "▲"} {safeNumber(row.change).toFixed(1)}</td>
                <td>{row.wells}</td>
                <td>{row.reports}</td>
                <td><span className={`g-status ${getStatusClass(row.risk)}`}>{safeText(row.risk).toUpperCase()}</span></td>
                <td>{row.tankers}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );

  const renderForecast = () => (
    <>
      <div className="g-grid-2">
        <section className="g-card">
          <div className="g-card-head">90-Day Groundwater Forecast</div>
          {forecastLoading ? <div className="g-banner g-banner-info"><Loader2 size={15} className="g-spin" /> Loading forecast data...</div> : null}
          <div className="g-chart-wrap g-chart-tall">
            <ChartErrorBoundary fallbackText="Forecast chart unavailable.">
              <Line data={forecastLineData} options={chartOptions} />
            </ChartErrorBoundary>
          </div>
          <div className="g-note"><strong>Ensemble:</strong> XGBoost + RF + LSTM + GRU {forecast?.forecast?.[0] ? `· current district ${forecast.district}` : ""}</div>
        </section>
        <section className="g-card">
          <div className="g-card-head">SHAP Feature Importance</div>
          <div className="g-chart-wrap g-chart-tall">
            <ChartErrorBoundary fallbackText="SHAP chart unavailable.">
              <Bar data={shapChartData} options={{ ...chartOptions, indexAxis: "y" as const }} />
            </ChartErrorBoundary>
          </div>
        </section>
      </div>

      <section className="g-card">
        <div className="g-card-head">Predicted Crisis Zones (Next 90 Days)</div>
        <table className="g-table">
          <thead><tr><th>District</th><th>Current</th><th>Predicted</th><th>Confidence</th><th>Action</th><th>Status</th></tr></thead>
          <tbody>
            {(safeCrisisZones.length ? safeCrisisZones : [
              { district: "Yavatmal", risk_status: "critical", crisis_index: 9.2, avg_depth_mbgl: -72.1, well_count: 85 },
              { district: "Amravati", risk_status: "critical", crisis_index: 8.4, avg_depth_mbgl: -63.4, well_count: 72 },
              { district: "Akola", risk_status: "high", crisis_index: 7.1, avg_depth_mbgl: -58.7, well_count: 61 }
            ]).map((zone) => (
              <tr key={zone.district}>
                <td><strong>{zone.district}</strong></td>
                <td className="mono">{safeNumber(zone.avg_depth_mbgl).toFixed(1)}m</td>
                <td className="mono" style={{ color: safeText(zone.risk_status).toLowerCase().includes("critical") ? "var(--neon-rose)" : "var(--neon-amber)" }}>{safeNumber(zone.avg_depth_mbgl - 6).toFixed(1)}m</td>
                <td className="mono" style={{ color: "var(--neon-green)" }}>{Math.min(99, Math.round(safeNumber(zone.crisis_index) * 10))}%</td>
                <td>{safeText(zone.risk_status).toLowerCase().includes("critical") ? "Emergency tanker + well deepening" : "Weekly monitoring"}</td>
                <td><span className={`g-status ${safeText(zone.risk_status).toLowerCase().includes("critical") ? "s-critical" : "s-review"}`}>{safeText(zone.risk_status).toUpperCase()}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );

  const renderAssign = () => (
    <div className="g-grid-2">
      <section className="g-card">
        <div className="g-card-head">Assign New Task</div>
        <form onSubmit={handleTaskSubmit}>
          <div className="g-form-grid">
            <input className="g-input" placeholder="Complaint ID" value={taskForm.complaintId} onChange={(event) => setTaskForm((prev) => ({ ...prev, complaintId: event.target.value }))} />
            <input className="g-input" placeholder="Officer ID" value={taskForm.assigneeOfficerId} onChange={(event) => setTaskForm((prev) => ({ ...prev, assigneeOfficerId: event.target.value }))} />
            <input className="g-input" type="date" value={taskForm.dueDate} onChange={(event) => setTaskForm((prev) => ({ ...prev, dueDate: event.target.value }))} />
            <select className="g-input" value={taskForm.priority} onChange={(event) => setTaskForm((prev) => ({ ...prev, priority: event.target.value as TaskFormState["priority"] }))}>
              <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option>
            </select>
          </div>
          <textarea className="g-input" rows={4} placeholder="Instructions for field team..." value={taskForm.notes} onChange={(event) => setTaskForm((prev) => ({ ...prev, notes: event.target.value }))} />
          <button className="g-btn g-btn-primary" type="submit" disabled={taskBusy}><Save size={14} /> {taskBusy ? "Saving..." : "Assign Task"}</button>
        </form>
      </section>

      <section className="g-card">
        <div className="g-card-head">Team Workload</div>
        <div className="g-chart-wrap" style={{ height: 180 }}>
          <ChartErrorBoundary fallbackText="Workload chart unavailable.">
            <Bar data={workloadChartData} options={chartOptions} />
          </ChartErrorBoundary>
        </div>
        <table className="g-table" style={{ marginTop: "1rem" }}>
          <thead><tr><th>Team</th><th>Active</th><th>Done</th><th>Status</th></tr></thead>
          <tbody>
            {(safeWorkload.length ? safeWorkload : [
              { officer_id: 1, officer_name: "Eng. Patil", pending: 3, in_progress: 0, completed: 12, total: 15 },
              { officer_id: 2, officer_name: "Lab Sharma", pending: 1, in_progress: 0, completed: 8, total: 9 },
              { officer_id: 3, officer_name: "Field Team A", pending: 4, in_progress: 0, completed: 22, total: 26 }
            ]).map((item) => (
              <tr key={item.officer_id}>
                <td>{item.officer_name}</td>
                <td>{item.pending + item.in_progress}</td>
                <td>{item.completed}</td>
                <td><span className={`g-status ${item.pending + item.in_progress > 3 ? "s-review" : "s-resolved"}`}>{item.pending + item.in_progress > 3 ? "BUSY" : "FREE"}</span></td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="g-card-head" style={{ marginTop: "1rem" }}>Recent Tasks</div>
        {taskLoading ? <div className="g-banner g-banner-info"><Loader2 size={15} className="g-spin" /> Loading tasks...</div> : null}
        <table className="g-table">
          <thead><tr><th>Task</th><th>Assignee</th><th>Priority</th><th>Status</th><th>Due</th></tr></thead>
          <tbody>
            {(tasks?.data || []).slice(0, 5).map((task) => (
              <tr key={task.id}>
                <td className="mono">#{task.complaint_id}</td>
                <td>{task.assignee_name}</td>
                <td><span className={`g-tag ${safeText(task.priority).toLowerCase().includes("high") ? "p-high" : "p-med"}`}>{safeText(task.priority).toUpperCase()}</span></td>
                <td><span className={`g-status ${getStatusClass(task.status)}`}>{safeText(task.status).toUpperCase()}</span></td>
                <td className="mono">{task.due_date || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );

  const renderTankers = () => (
    <>
      <section className="g-card" style={{ marginBottom: "1rem" }}>
        <div className="g-card-head">Create Tanker Route</div>
        <form onSubmit={handleTankerSubmit}>
          <div className="g-form-grid">
            <input className="g-input" placeholder="Route name" value={tankerForm.routeName} onChange={(event) => setTankerForm((prev) => ({ ...prev, routeName: event.target.value }))} />
            <input className="g-input" placeholder="Villages (comma separated)" value={tankerForm.villages} onChange={(event) => setTankerForm((prev) => ({ ...prev, villages: event.target.value }))} />
            <input className="g-input" placeholder="Schedule" value={tankerForm.schedule} onChange={(event) => setTankerForm((prev) => ({ ...prev, schedule: event.target.value }))} />
            <input className="g-input" placeholder="Capacity liters" value={tankerForm.capacityLiters} onChange={(event) => setTankerForm((prev) => ({ ...prev, capacityLiters: event.target.value }))} />
            <input className="g-input" placeholder="Assigned driver" value={tankerForm.assignedDriver} onChange={(event) => setTankerForm((prev) => ({ ...prev, assignedDriver: event.target.value }))} />
            <input className="g-input" placeholder="Contact number" value={tankerForm.contactNumber} onChange={(event) => setTankerForm((prev) => ({ ...prev, contactNumber: event.target.value }))} />
          </div>
          <button className="g-btn g-btn-primary" type="submit" disabled={tankerBusyId !== null}><Plus size={14} /> Add Route</button>
        </form>
      </section>

      <section className="g-card">
        <div className="g-card-title-row"><div className="g-card-head">Active Tanker Routes</div><button className="g-btn g-btn-ghost" type="button" onClick={() => void loadTankers()}><RefreshCw size={14} /> Refresh</button></div>
        {tankerLoading ? <div className="g-banner g-banner-info"><Loader2 size={15} className="g-spin" /> Loading tanker routes...</div> : null}
        <table className="g-table">
          <thead><tr><th>Route</th><th>District</th><th>Villages</th><th>Schedule</th><th>Capacity</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>
            {(safeTankers.length ? safeTankers : []).map((tanker) => (
              <tr key={tanker.id}>
                <td className="mono" style={{ color: "var(--accent)" }}>{tanker.route_name}</td>
                <td>{tanker.district}</td>
                <td>{tanker.villages.join(", ")}</td>
                <td>{tanker.schedule}</td>
                <td className="mono">{safeNumber(tanker.capacity_liters).toLocaleString()}L</td>
                <td><span className={`g-status ${getStatusClass(tanker.status)}`}>{safeText(tanker.status).toUpperCase()}</span></td>
                <td><button className="g-btn g-btn-ghost" type="button" disabled={tankerBusyId === tanker.id} onClick={() => void handleUpdateTankerStatus(tanker)}>{tankerBusyId === tanker.id ? "..." : "Update"}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );

  const renderReports = () => (
    <div className="g-grid-3">
      <article className="g-report-card">
        <FileBarChart size={44} />
        <h4>Monthly Status Report</h4>
        <p>District water summary</p>
        <button className="g-btn g-btn-primary" type="button" disabled={reportBusy} onClick={() => void handleGenerateReport("monthly_status")}>PDF</button>
      </article>
      <article className="g-report-card">
        <Brain size={44} />
        <h4>AI Prediction Report</h4>
        <p>90-day forecast and confidence</p>
        <button className="g-btn g-btn-primary" type="button" disabled={reportBusy} onClick={() => void handleGenerateReport("ai_prediction")}>PDF</button>
      </article>
      <article className="g-report-card">
        <Users size={44} />
        <h4>Citizen Request Report</h4>
        <p>Requests and resolution times</p>
        <button className="g-btn g-btn-primary" type="button" disabled={reportBusy} onClick={() => void handleGenerateReport("citizen_requests")}>CSV</button>
      </article>
    </div>
  );

  const renderActivity = () => (
    <section className="g-card">
      <div className="g-card-title-row">
        <div className="g-card-head">System Activity Log</div>
        <button className="g-btn g-btn-ghost" type="button" onClick={() => void loadActivity()}><RefreshCw size={14} /> Refresh</button>
      </div>
      {activityLoading ? <div className="g-banner g-banner-info"><Loader2 size={15} className="g-spin" /> Loading activity log...</div> : null}
      <table className="g-table">
        <thead><tr><th>Timestamp</th><th>Actor</th><th>Action</th><th>Target</th><th>Details</th></tr></thead>
        <tbody>
          {(activityLog?.data || []).map((entry) => (
            <tr key={entry.id}>
              <td className="mono" style={{ fontSize: ".72rem" }}>{formatDateTime(entry.created_at)}</td>
              <td>{entry.actor_role} #{entry.actor_id}</td>
              <td style={{ color: safeText(entry.action).toLowerCase().includes("resolve") ? "var(--neon-green)" : safeText(entry.action).toLowerCase().includes("escalat") ? "var(--neon-rose)" : "var(--accent)" }}>{entry.action}</td>
              <td>{entry.target_table} #{entry.target_id}</td>
              <td>{typeof entry.details === "string" ? entry.details : safeJson(entry.details)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );

  const renderPage = () => {
    switch (activePage) {
      case "overview":
        return renderOverview();
      case "requests":
        return renderRequests();
      case "districts":
        return renderDistricts();
      case "forecast":
        return renderForecast();
      case "assign":
        return renderAssign();
      case "tankers":
        return renderTankers();
      case "reports":
        return renderReports();
      case "activity":
        return renderActivity();
      default:
        return renderOverview();
    }
  };

  return (
    <div className="g-root">
      <aside className={`g-sidebar ${collapsed ? "collapsed" : ""} ${mobileOpen ? "open" : ""}`}>
        <div className="g-sidebar-header">
          <div className="g-logo"><Landmark size={18} /></div>
          <div className="g-brand-text">
            <strong>AquaVidarbha</strong>
            <span>GOV OFFICER PORTAL</span>
          </div>
        </div>

        <nav className="g-nav">
          {(() => {
            const seenSections = new Set<GovNavItem["section"]>();
            return navItems.map((item) => {
              const Icon = item.icon;
              const showSection = !seenSections.has(item.section);
              seenSections.add(item.section);
              return (
                <div key={item.key}>
                  {showSection ? <span className="g-nav-section">{item.section}</span> : null}
                  <button className={`g-nav-item ${activePage === item.key ? "active" : ""}`} onClick={() => { setActivePage(item.key); setMobileOpen(false); }} type="button">
                    <Icon size={16} />
                    <span>{item.label}</span>
                    {item.key === "requests" && requestsMeta.total_items > 0 ? <span className="g-nav-badge">{requestsMeta.total_items}</span> : null}
                  </button>
                </div>
              );
            });
          })()}

          <button className="g-nav-item" onClick={() => navigate("/")} type="button">
            <Home size={16} />
            <span>Home</span>
          </button>
        </nav>

        <div className="g-sidebar-footer">
          <div className="g-user-pill">
            <div>{officerName}</div>
            <div style={{ fontSize: ".68rem", color: "#64748b" }}>{officerDistrict ? `District Officer · ${officerDistrict}` : "District Officer"}</div>
          </div>
          <button className="g-btn g-btn-ghost" onClick={handleLogout} type="button"><LogOut size={14} /> Logout</button>
        </div>
      </aside>

      <main className={`g-main ${collapsed ? "expanded" : ""}`}>
        <header className="g-topbar">
          <div className="g-topbar-left">
            <button className="g-icon-btn" onClick={() => setCollapsed((prev) => !prev)} type="button"><PanelLeft size={17} /></button>
            <div className="g-page-title"><TitleIcon size={17} /> {pageTitle[activePage]}</div>
          </div>
          <div className="g-topbar-right">
            <span className="g-badge-role"><Landmark size={13} /> GOV OFFICER</span>
            <button className="g-icon-btn" onClick={() => setMobileOpen((prev) => !prev)} type="button"><Menu size={17} /></button>
          </div>
        </header>

        <section className="g-content">
          {renderBanner()}
          {activePage !== "overview" ? null : <div style={{ marginBottom: "0.75rem", display: "flex", justifyContent: "flex-end" }}><button className="g-btn g-btn-ghost" type="button" onClick={() => void refreshOverview()}><RefreshCw size={14} /> Refresh All</button></div>}
          {renderPage()}
        </section>
      </main>
    </div>
  );
}
