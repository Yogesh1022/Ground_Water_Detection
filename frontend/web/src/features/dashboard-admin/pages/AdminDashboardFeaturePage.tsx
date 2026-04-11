import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  Brain,
  Database,
  Download,
  Landmark,
  LayoutDashboard,
  Loader2,
  LogOut,
  Menu,
  PanelLeft,
  Plus,
  Save,
  ScrollText,
  Shield,
  SlidersHorizontal,
  User,
  Trash2,
  TrendingUp,
  UserCog,
  UserPlus,
  Users
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Bar, Line } from "react-chartjs-2";
import {
  activateAdminUser,
  createAdminUser,
  createAdminWell,
  deleteAdminUser,
  getAdminActivityLog,
  getAdminMe,
  getAdminOverview,
  getAdminSettings,
  getAdminUser,
  listAdminDataSources,
  listAdminModels,
  listAdminUsers,
  listAdminWells,
  suspendAdminUser,
  updateAdminSettings,
  updateAdminUser,
  type AdminOverviewResponse,
  type AdminUser,
  type AuditLogEntry,
  type CreateUserPayload,
  type CreateWellPayload,
  type DataSourceItem,
  type ModelItem,
  type PagedMeta,
  type SettingItem,
  type UpdateUserPayload,
  type WellItem
} from "../api/adminDashboardApi";
import "../styles/admin-dashboard.css";

type AdminPage =
  | "overview"
  | "analytics"
  | "health"
  | "users"
  | "officers"
  | "adduser"
  | "mlmodels"
  | "dataoverview"
  | "activitylog"
  | "settings";

type NavItem = {
  key: AdminPage;
  label: string;
  icon: typeof LayoutDashboard;
  section: "Overview" | "User Management" | "Data & ML" | "System";
};

type UserQueryState = {
  page: number;
  limit: number;
  search: string;
  district: string;
  active: "all" | "true" | "false";
};

const navItems: NavItem[] = [
  { key: "overview", label: "System Overview", icon: LayoutDashboard, section: "Overview" },
  { key: "analytics", label: "Analytics", icon: TrendingUp, section: "Overview" },
  { key: "health", label: "System Health", icon: Activity, section: "Overview" },
  { key: "users", label: "Manage Citizens", icon: Users, section: "User Management" },
  { key: "officers", label: "Manage Officers", icon: Landmark, section: "User Management" },
  { key: "adduser", label: "Add User / Officer", icon: UserPlus, section: "User Management" },
  { key: "mlmodels", label: "ML Model Stats", icon: Brain, section: "Data & ML" },
  { key: "dataoverview", label: "Data Overview", icon: Database, section: "Data & ML" },
  { key: "activitylog", label: "Activity Logs", icon: ScrollText, section: "System" },
  { key: "settings", label: "Settings", icon: SlidersHorizontal, section: "System" }
];

const pageTitle: Record<AdminPage, string> = {
  overview: "System Overview",
  analytics: "Analytics",
  health: "System Health",
  users: "Manage Citizens",
  officers: "Manage Officers",
  adduser: "Add User / Officer",
  mlmodels: "ML Model Stats",
  dataoverview: "Data Overview",
  activitylog: "Activity Logs",
  settings: "Settings"
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

const defaultOverview: AdminOverviewResponse = {
  total_users: 0,
  active_citizens: 0,
  gov_officers: 0,
  total_wells: 0,
  total_predictions: 0,
  open_complaints: 0,
  total_districts: 0,
  avg_depth_mbgl: 0
};

const emptyCreateForm: CreateUserPayload = {
  email: "",
  password: "",
  name: "",
  role: "citizen",
  district: "",
  phone: ""
};

const emptyWellForm: CreateWellPayload = {
  name: "",
  district: "",
  taluka: "",
  village: "",
  latitude: 0,
  longitude: 0
};

const emptyUsersMeta: PagedMeta = {
  page: 1,
  limit: 10,
  total_items: 0,
  total_pages: 0
};

const defaultUserQuery: UserQueryState = {
  page: 1,
  limit: 10,
  search: "",
  district: "",
  active: "all"
};

function parseSettingInput(value: string): unknown {
  const trimmed = value.trim();
  if (trimmed.toLowerCase() === "true") return true;
  if (trimmed.toLowerCase() === "false") return false;
  if (trimmed === "") return "";
  const asNumber = Number(trimmed);
  if (!Number.isNaN(asNumber) && trimmed !== "") return asNumber;
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

export default function AdminDashboardFeaturePage() {
  const navigate = useNavigate();
  const [activePage, setActivePage] = useState<AdminPage>("overview");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const [overview, setOverview] = useState<AdminOverviewResponse>(defaultOverview);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersMeta, setUsersMeta] = useState<PagedMeta>(emptyUsersMeta);
  const [activityLog, setActivityLog] = useState<AuditLogEntry[]>([]);
  const [settingsList, setSettingsList] = useState<SettingItem[]>([]);
  const [settingsDraft, setSettingsDraft] = useState<Record<string, string>>({});
  const [models, setModels] = useState<ModelItem[]>([]);
  const [dataSources, setDataSources] = useState<DataSourceItem[]>([]);
  const [wells, setWells] = useState<WellItem[]>([]);

  const [userQuery, setUserQuery] = useState<UserQueryState>(defaultUserQuery);
  const [searchInput, setSearchInput] = useState("");

  const [overviewLoading, setOverviewLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(true);
  const [activityLoading, setActivityLoading] = useState(true);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [modelsLoading, setModelsLoading] = useState(true);
  const [sourcesLoading, setSourcesLoading] = useState(true);
  const [wellsLoading, setWellsLoading] = useState(true);

  const [overviewError, setOverviewError] = useState("");
  const [usersError, setUsersError] = useState("");
  const [activityError, setActivityError] = useState("");
  const [settingsError, setSettingsError] = useState("");
  const [modelsError, setModelsError] = useState("");
  const [sourcesError, setSourcesError] = useState("");
  const [wellsError, setWellsError] = useState("");
  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState("");
  const [wellCreateError, setWellCreateError] = useState("");
  const [wellCreateSuccess, setWellCreateSuccess] = useState("");
  const [settingsSaveMessage, setSettingsSaveMessage] = useState("");

  const [isCreating, setIsCreating] = useState(false);
  const [isCreatingWell, setIsCreatingWell] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [actionBusyId, setActionBusyId] = useState<number | null>(null);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [editPayload, setEditPayload] = useState<UpdateUserPayload>({});

  const [createForm, setCreateForm] = useState<CreateUserPayload>(emptyCreateForm);
  const [wellForm, setWellForm] = useState<CreateWellPayload>(emptyWellForm);
  const [adminName, setAdminName] = useState(sessionStorage.getItem("aqua_user") || "System Administrator");

  const districtKpiRows = useMemo(() => {
    const grouped = wells.reduce<Record<string, { total: number; active: number; latest?: string }>>((acc, well) => {
      const key = well.district || "Unknown";
      if (!acc[key]) {
        acc[key] = { total: 0, active: 0, latest: undefined };
      }
      acc[key].total += 1;
      if (well.is_active) {
        acc[key].active += 1;
      }
      if (well.created_at && (!acc[key].latest || new Date(well.created_at) > new Date(acc[key].latest || 0))) {
        acc[key].latest = well.created_at;
      }
      return acc;
    }, {});

    return Object.entries(grouped)
      .map(([district, value]) => ({ district, ...value }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 12);
  }, [wells]);

  const activitySummary = useMemo(() => {
    const now = new Date();
    const buckets = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now);
      d.setDate(now.getDate() - (6 - i));
      const key = d.toISOString().slice(0, 10);
      return { key, label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }), total: 0, user: 0, resolved: 0, complaints: 0 };
    });

    const map = new Map(buckets.map((b) => [b.key, b]));
    for (const entry of activityLog) {
      const key = String(entry.created_at || "").slice(0, 10);
      const bucket = map.get(key);
      if (!bucket) continue;
      bucket.total += 1;

      const action = String(entry.action || "").toLowerCase();
      if (action.includes("user")) bucket.user += 1;
      if (action.includes("resolve") || action.includes("resolved") || action.includes("close")) bucket.resolved += 1;
      if (action.includes("complaint")) bucket.complaints += 1;
    }

    return buckets;
  }, [activityLog]);

  const resolvedRate = useMemo(() => {
    const totalComplaints = activitySummary.reduce((sum, b) => sum + b.complaints, 0);
    const resolved = activitySummary.reduce((sum, b) => sum + b.resolved, 0);
    if (totalComplaints === 0) return 0;
    return Math.min(100, Math.round((resolved / totalComplaints) * 1000) / 10);
  }, [activitySummary]);

  const last24hActions = useMemo(() => {
    const since = Date.now() - 24 * 60 * 60 * 1000;
    return activityLog.filter((entry) => new Date(entry.created_at).getTime() >= since).length;
  }, [activityLog]);

  const avgDataQuality = useMemo(() => {
    if (dataSources.length === 0) return 0;
    const total = dataSources.reduce((sum, src) => sum + Number(src.quality_score || 0), 0);
    return Math.round((total / dataSources.length) * 10) / 10;
  }, [dataSources]);

  const usageData = useMemo(
    () => ({
      labels: activitySummary.map((item) => item.label),
      datasets: [
        {
          label: "Admin Actions",
          data: activitySummary.map((item) => item.total),
          borderColor: "#22d3ee",
          backgroundColor: "rgba(34,211,238,.07)",
          tension: 0.4,
          fill: true
        },
        {
          label: "User-related Actions",
          data: activitySummary.map((item) => item.user),
          borderColor: "#a855f7",
          tension: 0.4
        }
      ]
    }),
    [activitySummary]
  );

  const districtVolumeData = useMemo(
    () => ({
      labels: districtKpiRows.map((row) => row.district),
      datasets: [
        {
          data: districtKpiRows.map((row) => row.total),
          backgroundColor: districtKpiRows.map((row) => (row.active === row.total ? "#34d399" : row.active > 0 ? "#22d3ee" : "#fb7185")),
          borderRadius: 8
        }
      ]
    }),
    [districtKpiRows]
  );

  const trendData = useMemo(
    () => ({
      labels: activitySummary.map((item) => item.label),
      datasets: [
        {
          label: "Resolved/Complaint Actions %",
          data: activitySummary.map((item) => {
            if (item.complaints === 0) return 0;
            return Math.round((item.resolved / item.complaints) * 1000) / 10;
          }),
          borderColor: "#34d399",
          backgroundColor: "rgba(52,211,153,.08)",
          fill: true,
          tension: 0.4
        }
      ]
    }),
    [activitySummary]
  );

  const registrationData = useMemo(
    () => ({
      labels: activitySummary.map((item) => item.label),
      datasets: [
        {
          label: "User Create Actions",
          data: activitySummary.map((item) => item.user),
          backgroundColor: "rgba(168,85,247,.6)",
          borderRadius: 6
        }
      ]
    }),
    [activitySummary]
  );

  const serverResourceData = useMemo(
    () => ({
      labels: dataSources.map((item) => item.source_name),
      datasets: [
        {
          label: "Data Quality Score",
          data: dataSources.map((item) => Number(item.quality_score || 0)),
          borderColor: "#a855f7",
          tension: 0.4,
          pointRadius: 2
        },
        {
          label: "Record Count (scaled)",
          data: dataSources.map((item) => Math.min(100, Math.round(Number(item.record_count || 0) / 1000))),
          borderColor: "#22d3ee",
          tension: 0.4,
          pointRadius: 2
        }
      ]
    }),
    [dataSources]
  );

  const modelTrendData = useMemo(
    () => ({
      labels:
        models.length > 0
          ? models
              .slice()
              .sort((a, b) => new Date(a.trained_at || 0).getTime() - new Date(b.trained_at || 0).getTime())
              .map((m) => (m.version ? `${m.model_name} ${m.version}` : m.model_name))
          : ["No Data"],
      datasets: [
        {
          label: "Best R²",
          data:
            models.length > 0
              ? models
                  .slice()
                  .sort((a, b) => new Date(a.trained_at || 0).getTime() - new Date(b.trained_at || 0).getTime())
                  .map((m) => Number(m.r2_score || 0))
              : [0],
          borderColor: "#a855f7",
          backgroundColor: "rgba(168,85,247,.08)",
          fill: true,
          tension: 0.4,
          pointRadius: 3
        }
      ]
    }),
    [models]
  );

  const modelCompareData = useMemo(
    () => ({
      labels: models.length > 0 ? models.map((item) => item.model_name) : ["No Models"],
      datasets: [
        {
          label: "R² Score",
          data: models.length > 0 ? models.map((item) => Number(item.r2_score || 0)) : [0],
          backgroundColor: ["rgba(52,211,153,.6)", "rgba(168,85,247,.6)", "rgba(34,211,238,.6)", "rgba(251,191,36,.6)"],
          borderRadius: 8
        }
      ]
    }),
    [models]
  );

  const roleFilter = activePage === "officers" ? "gov" : activePage === "users" ? "citizen" : "";

  const loadProfile = async () => {
    try {
      const me = await getAdminMe();
      if (me.name) {
        setAdminName(me.name);
        sessionStorage.setItem("aqua_user", me.name);
      }
    } catch {
      // Keep fallback profile from session storage.
    }
  };

  const loadOverview = async () => {
    setOverviewLoading(true);
    setOverviewError("");
    try {
      const data = await getAdminOverview();
      setOverview(data);
    } catch (error) {
      setOverviewError(error instanceof Error ? error.message : "Failed to load overview");
    } finally {
      setOverviewLoading(false);
    }
  };

  const loadUsers = async () => {
    setUsersLoading(true);
    setUsersError("");
    try {
      const data = await listAdminUsers({
        page: userQuery.page,
        limit: userQuery.limit,
        search: userQuery.search,
        district: userQuery.district,
        role: roleFilter,
        active: userQuery.active === "all" ? undefined : userQuery.active
      });
      setUsers(data.data || []);
      setUsersMeta(data.meta || emptyUsersMeta);
    } catch (error) {
      setUsersError(error instanceof Error ? error.message : "Failed to load users");
    } finally {
      setUsersLoading(false);
    }
  };

  const loadWells = async () => {
    setWellsLoading(true);
    setWellsError("");
    try {
      const data = await listAdminWells({ page: 1, limit: 15 });
      setWells(data.data || []);
    } catch (error) {
      setWellsError(error instanceof Error ? error.message : "Failed to load wells");
    } finally {
      setWellsLoading(false);
    }
  };

  const loadModels = async () => {
    setModelsLoading(true);
    setModelsError("");
    try {
      const data = await listAdminModels();
      setModels(data.data || []);
    } catch (error) {
      setModelsError(error instanceof Error ? error.message : "Failed to load models");
    } finally {
      setModelsLoading(false);
    }
  };

  const loadDataSources = async () => {
    setSourcesLoading(true);
    setSourcesError("");
    try {
      const data = await listAdminDataSources();
      setDataSources(data.data || []);
    } catch (error) {
      setSourcesError(error instanceof Error ? error.message : "Failed to load data sources");
    } finally {
      setSourcesLoading(false);
    }
  };

  const loadActivity = async () => {
    setActivityLoading(true);
    setActivityError("");
    try {
      const data = await getAdminActivityLog({ page: 1, limit: 20 });
      setActivityLog(data.data || []);
    } catch (error) {
      setActivityError(error instanceof Error ? error.message : "Failed to load activity log");
    } finally {
      setActivityLoading(false);
    }
  };

  const loadSettings = async () => {
    setSettingsLoading(true);
    setSettingsError("");
    try {
      const data = await getAdminSettings();
      const list = data.data || [];
      setSettingsList(list);
      const draft = list.reduce<Record<string, string>>((acc, item) => {
        acc[item.key] = typeof item.value === "string" ? item.value : JSON.stringify(item.value);
        return acc;
      }, {});
      setSettingsDraft(draft);
    } catch (error) {
      setSettingsError(error instanceof Error ? error.message : "Failed to load settings");
    } finally {
      setSettingsLoading(false);
    }
  };

  useEffect(() => {
    const role = sessionStorage.getItem("aqua_role");
    const token = sessionStorage.getItem("aqua_token");
    if (role !== "admin" || !token) {
      navigate("/login", { replace: true });
      return;
    }

    void loadProfile();
    void loadOverview();
    void loadActivity();
    void loadSettings();
    void loadModels();
    void loadDataSources();
    void loadWells();
  }, [navigate]);

  useEffect(() => {
    if (activePage === "users" || activePage === "officers") {
      void loadUsers();
    }
  }, [activePage, userQuery.page, userQuery.limit, userQuery.search, userQuery.district, userQuery.active]);

  const logout = () => {
    sessionStorage.clear();
    navigate("/login");
  };

  const onCreateUser = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreateError("");
    setCreateSuccess("");
    setIsCreating(true);

    try {
      const payload: CreateUserPayload = {
        ...createForm,
        email: createForm.email.trim().toLowerCase(),
        name: createForm.name.trim(),
        district: createForm.district?.trim() || "",
        phone: createForm.phone?.trim() || ""
      };

      await createAdminUser(payload);
      setCreateSuccess("User created successfully.");
      setCreateForm(emptyCreateForm);
      await Promise.all([loadUsers(), loadOverview(), loadActivity()]);
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : "Failed to create user");
    } finally {
      setIsCreating(false);
    }
  };

  const onCreateWell = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setWellCreateError("");
    setWellCreateSuccess("");
    setIsCreatingWell(true);

    try {
      await createAdminWell({
        ...wellForm,
        name: wellForm.name.trim(),
        district: wellForm.district.trim(),
        taluka: wellForm.taluka?.trim() || "",
        village: wellForm.village?.trim() || "",
        latitude: Number(wellForm.latitude),
        longitude: Number(wellForm.longitude)
      });
      setWellCreateSuccess("Well created successfully.");
      setWellForm(emptyWellForm);
      await Promise.all([loadWells(), loadOverview(), loadActivity()]);
    } catch (error) {
      setWellCreateError(error instanceof Error ? error.message : "Failed to create well");
    } finally {
      setIsCreatingWell(false);
    }
  };

  const toggleUserStatus = async (user: AdminUser) => {
    setUsersError("");
    setActionBusyId(user.id);
    try {
      if (user.is_active) {
        await suspendAdminUser(user.id);
      } else {
        await activateAdminUser(user.id);
      }
      await Promise.all([loadUsers(), loadOverview(), loadActivity()]);
    } catch (error) {
      setUsersError(error instanceof Error ? error.message : "Failed to update user status");
    } finally {
      setActionBusyId(null);
    }
  };

  const startEdit = async (user: AdminUser) => {
    setUsersError("");
    try {
      const fresh = await getAdminUser(user.id);
      setEditingUserId(fresh.id);
      setEditPayload({
        name: fresh.name,
        district: fresh.district,
        phone: fresh.phone,
        role: fresh.role
      });
    } catch (error) {
      setUsersError(error instanceof Error ? error.message : "Failed to fetch user");
    }
  };

  const cancelEdit = () => {
    setEditingUserId(null);
    setEditPayload({});
  };

  const saveEdit = async (userId: number) => {
    setUsersError("");
    setActionBusyId(userId);
    try {
      await updateAdminUser(userId, {
        name: editPayload.name?.trim(),
        district: editPayload.district?.trim(),
        phone: editPayload.phone?.trim(),
        role: editPayload.role
      });
      setEditingUserId(null);
      setEditPayload({});
      await Promise.all([loadUsers(), loadOverview(), loadActivity()]);
    } catch (error) {
      setUsersError(error instanceof Error ? error.message : "Failed to update user");
    } finally {
      setActionBusyId(null);
    }
  };

  const removeUser = async (user: AdminUser) => {
    const confirmed = window.confirm(`Delete user ${user.email}? This cannot be undone.`);
    if (!confirmed) return;

    setUsersError("");
    setActionBusyId(user.id);
    try {
      await deleteAdminUser(user.id);
      await Promise.all([loadUsers(), loadOverview(), loadActivity()]);
    } catch (error) {
      setUsersError(error instanceof Error ? error.message : "Failed to delete user");
    } finally {
      setActionBusyId(null);
    }
  };

  const applySearch = () => {
    setUserQuery((prev) => ({ ...prev, page: 1, search: searchInput.trim() }));
  };

  const resetFilters = () => {
    setSearchInput("");
    setUserQuery((prev) => ({ ...prev, page: 1, search: "", district: "", active: "all" }));
  };

  const saveSettings = async () => {
    setSettingsError("");
    setSettingsSaveMessage("");
    setSettingsSaving(true);
    try {
      const payload = Object.entries(settingsDraft).reduce<Record<string, unknown>>((acc, [key, value]) => {
        acc[key] = parseSettingInput(value);
        return acc;
      }, {});
      await updateAdminSettings(payload);
      setSettingsSaveMessage("Settings updated successfully.");
      await loadSettings();
    } catch (error) {
      setSettingsError(error instanceof Error ? error.message : "Failed to update settings");
    } finally {
      setSettingsSaving(false);
    }
  };

  const pageIcon = navItems.find((item) => item.key === activePage)?.icon || LayoutDashboard;
  const TitleIcon = pageIcon;

  const sectionRef = useRef<NavItem["section"] | null>(null);
  sectionRef.current = null;

  const renderNavSection = (section: NavItem["section"]) => {
    if (sectionRef.current === section) return null;
    sectionRef.current = section;
    return <span className="adm-nav-section">{section}</span>;
  };

  const renderOverview = () => {
    if (overviewLoading) {
      return <div className="adm-card"><Loader2 size={18} className="spin" /> Loading overview...</div>;
    }

    return (
      <>
        {overviewError ? <div className="adm-card">{overviewError}</div> : null}
        <div className="adm-kpi-row">
          <article className="adm-kpi"><div className="adm-kpi-value adm-mono tone-cyan">{overview.total_users}</div><div className="adm-kpi-label">Total Users</div></article>
          <article className="adm-kpi"><div className="adm-kpi-value adm-mono tone-purple">{overview.gov_officers}</div><div className="adm-kpi-label">Gov Officers</div></article>
          <article className="adm-kpi"><div className="adm-kpi-value adm-mono tone-blue">{overview.open_complaints}</div><div className="adm-kpi-label">Open Complaints</div></article>
          <article className="adm-kpi"><div className="adm-kpi-value adm-mono tone-amber">{overview.total_wells}</div><div className="adm-kpi-label">Wells</div></article>
          <article className="adm-kpi"><div className="adm-kpi-value adm-mono tone-green">{overview.total_predictions}</div><div className="adm-kpi-label">Predictions</div></article>
        </div>
        <div className="adm-grid-2">
          <section className="adm-card">
            <div className="adm-card-head"><TrendingUp size={16} className="adm-head-icon tone-purple" /> Platform Activity (Last 7 Days)</div>
            <div className="adm-chart-wrap"><Line data={usageData} options={chartOptions} /></div>
          </section>
          <section className="adm-card">
            <div className="adm-card-head"><Database size={16} className="adm-head-icon tone-cyan" /> Well Coverage by District</div>
            <div className="adm-chart-wrap"><Bar data={districtVolumeData} options={chartOptions} /></div>
          </section>
        </div>
        <div className="adm-grid-3">
          <section className="adm-card adm-stat-card">
            <div className="adm-stat-value tone-amber">{overview.open_complaints > 0 ? "CRITICAL" : "STABLE"}</div>
            <div className="adm-stat-title">System-wide Crisis Level</div>
            <div className="adm-stat-sub">{overview.open_complaints} open complaints under monitoring</div>
          </section>
          <section className="adm-card adm-stat-card">
            <div className="adm-stat-value tone-green">{resolvedRate.toFixed(1)}%</div>
            <div className="adm-stat-title">Resolved Action Rate</div>
            <div className="adm-stat-sub adm-mono">Computed from audit activity</div>
          </section>
          <section className="adm-card adm-stat-card">
            <div className="adm-stat-value tone-purple">ONLINE</div>
            <div className="adm-stat-title">ML Model Status</div>
            <div className="adm-stat-sub adm-mono">Active models: {models.length || 0}</div>
          </section>
        </div>
      </>
    );
  };

  const renderUsersTable = () => (
    <section className="adm-card">
      <div className="adm-card-title-row">
        <div className="adm-card-head">{activePage === "officers" ? "Government Officers" : "Registered Citizens"}</div>
        <button className="adm-btn adm-btn-primary"><Download size={14} /> Export</button>
      </div>

      <div className="adm-filters">
        <input
          className="adm-input"
          placeholder="Search name/email"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              applySearch();
            }
          }}
        />
        <input
          className="adm-input"
          placeholder="District"
          value={userQuery.district}
          onChange={(event) => setUserQuery((prev) => ({ ...prev, page: 1, district: event.target.value }))}
        />
        <select
          className="adm-input"
          value={userQuery.active}
          onChange={(event) => setUserQuery((prev) => ({ ...prev, page: 1, active: event.target.value as UserQueryState["active"] }))}
        >
          <option value="all">All Status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
        <button className="adm-btn adm-btn-primary" onClick={applySearch}>Search</button>
        <button className="adm-btn adm-btn-ghost" onClick={resetFilters}>Reset</button>
      </div>

      {usersError ? <div className="adm-message adm-error">{usersError}</div> : null}

      {usersLoading ? (
        <div className="adm-inline-loader"><Loader2 size={18} className="spin" /> Loading users...</div>
      ) : (
        <table className="adm-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>District</th>
              <th>Role</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const isEditing = editingUserId === user.id;
              return (
                <tr key={user.id}>
                  <td>{user.id}</td>
                  <td>
                    {isEditing ? (
                      <input
                        className="adm-input adm-input-sm"
                        value={editPayload.name || ""}
                        onChange={(event) => setEditPayload((prev) => ({ ...prev, name: event.target.value }))}
                      />
                    ) : (
                      user.name
                    )}
                  </td>
                  <td>{user.email}</td>
                  <td>
                    {isEditing ? (
                      <input
                        className="adm-input adm-input-sm"
                        value={editPayload.district || ""}
                        onChange={(event) => setEditPayload((prev) => ({ ...prev, district: event.target.value }))}
                      />
                    ) : (
                      user.district || "-"
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <select
                        className="adm-input adm-input-sm"
                        value={editPayload.role || user.role}
                        onChange={(event) =>
                          setEditPayload((prev) => ({ ...prev, role: event.target.value as UpdateUserPayload["role"] }))
                        }
                      >
                        <option value="citizen">citizen</option>
                        <option value="gov">gov</option>
                        <option value="admin">admin</option>
                      </select>
                    ) : (
                      user.role
                    )}
                  </td>
                  <td>
                    <span className={`adm-status ${user.is_active ? "s-active" : "s-inactive"}`}>
                      {user.is_active ? "ACTIVE" : "INACTIVE"}
                    </span>
                  </td>
                  <td className="adm-actions">
                    {isEditing ? (
                      <>
                        <button
                          className="adm-btn adm-btn-primary"
                          disabled={actionBusyId === user.id}
                          onClick={() => {
                            void saveEdit(user.id);
                          }}
                        >
                          <Save size={14} /> Save
                        </button>
                        <button className="adm-btn adm-btn-ghost" onClick={cancelEdit}>Cancel</button>
                      </>
                    ) : (
                      <>
                        <button className="adm-btn adm-btn-ghost" onClick={() => { void startEdit(user); }}><UserCog size={14} /> Edit</button>
                        <button
                          className="adm-btn adm-btn-ghost"
                          disabled={actionBusyId === user.id}
                          onClick={() => {
                            void toggleUserStatus(user);
                          }}
                        >
                          {actionBusyId === user.id ? "Updating..." : user.is_active ? "Suspend" : "Activate"}
                        </button>
                        <button
                          className="adm-btn adm-btn-danger"
                          disabled={actionBusyId === user.id}
                          onClick={() => {
                            void removeUser(user);
                          }}
                        >
                          <Trash2 size={14} /> Delete
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
            {users.length === 0 ? (
              <tr>
                <td colSpan={7}>No users found.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      )}

      <div className="adm-pagination">
        <div className="adm-page-meta">
          Page {usersMeta.page} of {Math.max(usersMeta.total_pages, 1)} · {usersMeta.total_items} total
        </div>
        <div className="adm-page-controls">
          <select
            className="adm-input adm-input-sm"
            value={userQuery.limit}
            onChange={(event) => setUserQuery((prev) => ({ ...prev, page: 1, limit: Number(event.target.value) }))}
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
          <button
            className="adm-btn adm-btn-ghost"
            disabled={userQuery.page <= 1}
            onClick={() => setUserQuery((prev) => ({ ...prev, page: Math.max(prev.page - 1, 1) }))}
          >
            Prev
          </button>
          <button
            className="adm-btn adm-btn-ghost"
            disabled={usersMeta.total_pages === 0 || userQuery.page >= usersMeta.total_pages}
            onClick={() => setUserQuery((prev) => ({ ...prev, page: prev.page + 1 }))}
          >
            Next
          </button>
        </div>
      </div>
    </section>
  );

  const renderAddUser = () => (
    <div className="adm-grid-2">
      <section className="adm-card">
        <div className="adm-card-head">Add New User / Officer</div>
        <form className="adm-form-grid-shell" onSubmit={onCreateUser}>
          <div className="adm-form-grid">
            <input
              className="adm-input"
              placeholder="Full Name"
              value={createForm.name}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, name: event.target.value }))}
              required
            />
            <input
              className="adm-input"
              type="email"
              placeholder="Email"
              value={createForm.email}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, email: event.target.value }))}
              required
            />
            <select
              className="adm-input"
              value={createForm.role}
              onChange={(event) =>
                setCreateForm((prev) => ({ ...prev, role: event.target.value as CreateUserPayload["role"] }))
              }
            >
              <option value="citizen">citizen</option>
              <option value="gov">gov</option>
              <option value="admin">admin</option>
            </select>
            <input
              className="adm-input"
              type="password"
              placeholder="Temporary Password"
              value={createForm.password}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, password: event.target.value }))}
              required
              minLength={8}
            />
            <input
              className="adm-input"
              placeholder="District"
              value={createForm.district}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, district: event.target.value }))}
            />
            <input
              className="adm-input"
              placeholder="Phone"
              value={createForm.phone}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, phone: event.target.value }))}
            />
          </div>
          <button className="adm-btn adm-btn-primary" type="submit" disabled={isCreating}>
            {isCreating ? <Loader2 size={14} className="spin" /> : <Plus size={14} />}
            {isCreating ? "Creating..." : "Create Account"}
          </button>
        </form>
        {createError ? <div className="adm-message adm-error">{createError}</div> : null}
        {createSuccess ? <div className="adm-message adm-success">{createSuccess}</div> : null}
      </section>

      <section className="adm-card">
        <div className="adm-card-head">Add New Well</div>
        <form className="adm-form-grid-shell" onSubmit={onCreateWell}>
          <div className="adm-form-grid">
            <input
              className="adm-input"
              placeholder="Well Name"
              value={wellForm.name}
              onChange={(event) => setWellForm((prev) => ({ ...prev, name: event.target.value }))}
              required
            />
            <input
              className="adm-input"
              placeholder="District"
              value={wellForm.district}
              onChange={(event) => setWellForm((prev) => ({ ...prev, district: event.target.value }))}
              required
            />
            <input
              className="adm-input"
              placeholder="Taluka"
              value={wellForm.taluka}
              onChange={(event) => setWellForm((prev) => ({ ...prev, taluka: event.target.value }))}
            />
            <input
              className="adm-input"
              placeholder="Village"
              value={wellForm.village}
              onChange={(event) => setWellForm((prev) => ({ ...prev, village: event.target.value }))}
            />
            <input
              className="adm-input"
              placeholder="Latitude"
              type="number"
              step="any"
              value={wellForm.latitude}
              onChange={(event) => setWellForm((prev) => ({ ...prev, latitude: Number(event.target.value) }))}
              required
            />
            <input
              className="adm-input"
              placeholder="Longitude"
              type="number"
              step="any"
              value={wellForm.longitude}
              onChange={(event) => setWellForm((prev) => ({ ...prev, longitude: Number(event.target.value) }))}
              required
            />
          </div>
          <button className="adm-btn adm-btn-primary" type="submit" disabled={isCreatingWell}>
            {isCreatingWell ? <Loader2 size={14} className="spin" /> : <Database size={14} />}
            {isCreatingWell ? "Creating..." : "Create Well"}
          </button>
        </form>
        {wellCreateError ? <div className="adm-message adm-error">{wellCreateError}</div> : null}
        {wellCreateSuccess ? <div className="adm-message adm-success">{wellCreateSuccess}</div> : null}
      </section>
    </div>
  );

  const renderActivity = () => {
    if (activityLoading) return <div className="adm-card"><Loader2 size={18} className="spin" /> Loading activity...</div>;
    return (
      <section className="adm-card">
        <div className="adm-card-head"><ScrollText size={16} className="adm-head-icon tone-blue" /> Full System Activity Log</div>
        {activityError ? <div className="adm-message adm-error">{activityError}</div> : null}
        <table className="adm-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Actor ID</th>
              <th>Role</th>
              <th>Action</th>
              <th>Target</th>
              <th>IP</th>
            </tr>
          </thead>
          <tbody>
            {activityLog.map((entry) => (
              <tr key={entry.id}>
                <td>{new Date(entry.created_at).toLocaleString()}</td>
                <td>{entry.actor_id}</td>
                <td>{entry.actor_role}</td>
                <td>{entry.action}</td>
                <td>{entry.target_table}#{entry.target_id}</td>
                <td>{entry.ip_address || "-"}</td>
              </tr>
            ))}
            {activityLog.length === 0 ? (
              <tr>
                <td colSpan={6}>No activity data available.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    );
  };

  const renderSettings = () => {
    if (settingsLoading) return <div className="adm-card"><Loader2 size={18} className="spin" /> Loading settings...</div>;

    return (
      <section className="adm-card">
        <div className="adm-card-title-row">
          <div className="adm-card-head"><SlidersHorizontal size={16} className="adm-head-icon tone-purple" /> System Settings</div>
          <button className="adm-btn adm-btn-primary" disabled={settingsSaving} onClick={() => void saveSettings()}>
            {settingsSaving ? <Loader2 size={14} className="spin" /> : <Save size={14} />} Save Settings
          </button>
        </div>

        {settingsError ? <div className="adm-message adm-error">{settingsError}</div> : null}
        {settingsSaveMessage ? <div className="adm-message adm-success">{settingsSaveMessage}</div> : null}

        <div className="adm-settings-grid">
          {settingsList.map((setting) => (
            <div className="adm-setting-item" key={setting.key}>
              <label className="adm-setting-label">{setting.key}</label>
              <input
                className="adm-input"
                value={settingsDraft[setting.key] || ""}
                onChange={(event) =>
                  setSettingsDraft((prev) => ({
                    ...prev,
                    [setting.key]: event.target.value
                  }))
                }
              />
              <div className="adm-setting-desc">{setting.description || "No description"}</div>
            </div>
          ))}
        </div>
      </section>
    );
  };

  const renderPage = () => {
    switch (activePage) {
      case "overview":
        return renderOverview();
      case "analytics":
        return (
          <>
            <div className="adm-grid-2">
              <section className="adm-card">
                <div className="adm-card-head"><User size={16} className="adm-head-icon tone-blue" /> User-related Actions (Last 7 Days)</div>
                <div className="adm-chart-wrap"><Bar data={registrationData} options={chartOptions} /></div>
              </section>
              <section className="adm-card">
                <div className="adm-card-head"><Activity size={16} className="adm-head-icon tone-green" /> Complaint Resolution Trend</div>
                <div className="adm-chart-wrap"><Line data={trendData} options={chartOptions} /></div>
              </section>
            </div>
            <section className="adm-card">
              <div className="adm-card-head"><LayoutDashboard size={16} className="adm-head-icon tone-amber" /> District Well KPIs</div>
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>District</th>
                    <th>Total Wells</th>
                    <th>Active Wells</th>
                    <th>Active %</th>
                    <th>Last Well Added</th>
                  </tr>
                </thead>
                <tbody>
                  {districtKpiRows.map((row) => (
                    <tr key={row.district}>
                      <td>{row.district}</td>
                      <td>{row.total}</td>
                      <td>{row.active}</td>
                      <td>{row.total > 0 ? `${Math.round((row.active / row.total) * 100)}%` : "0%"}</td>
                      <td>{row.latest ? new Date(row.latest).toLocaleDateString() : "-"}</td>
                    </tr>
                  ))}
                  {districtKpiRows.length === 0 ? (
                    <tr>
                      <td colSpan={5}>No district well data available.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </section>
          </>
        );
      case "health":
        return (
          <>
            <div className="adm-grid-2">
              <section className="adm-card">
                <div className="adm-card-head"><Activity size={16} className="adm-head-icon tone-green" /> System Components</div>
                <div className="adm-health-row"><span>Auth Context (/me)</span><span className="tone-green">ONLINE</span></div>
                <div className="adm-health-row"><span>Overview API</span><span className={overviewError ? "tone-amber" : "tone-green"}>{overviewError ? "DEGRADED" : "ONLINE"}</span></div>
                <div className="adm-health-row"><span>User API</span><span className={usersError ? "tone-amber" : "tone-green"}>{usersError ? "DEGRADED" : "ONLINE"}</span></div>
                <div className="adm-health-row"><span>Wells API</span><span className={wellsError ? "tone-amber" : "tone-cyan"}>{wellsError ? "DEGRADED" : "CONNECTED"}</span></div>
                <div className="adm-health-row"><span>Models API</span><span className={modelsError ? "tone-amber" : "tone-green"}>{modelsError ? "DEGRADED" : "RUNNING"}</span></div>
                <div className="adm-health-row"><span>Data Source API</span><span className={sourcesError ? "tone-amber" : "tone-green"}>{sourcesError ? "DEGRADED" : "ACTIVE"}</span></div>
              </section>
              <section className="adm-card">
                <div className="adm-card-head"><Database size={16} className="adm-head-icon tone-blue" /> Data Source Quality</div>
                <div className="adm-chart-wrap"><Line data={serverResourceData} options={chartOptions} /></div>
              </section>
            </div>
            <div className="adm-kpi-row">
              <article className="adm-kpi"><div className="adm-kpi-value adm-mono tone-green">{last24hActions}</div><div className="adm-kpi-label">Actions (Last 24h)</div></article>
              <article className="adm-kpi"><div className="adm-kpi-value adm-mono tone-cyan">{overview.total_predictions}</div><div className="adm-kpi-label">Total Predictions</div></article>
              <article className="adm-kpi"><div className="adm-kpi-value adm-mono tone-purple">{dataSources[0]?.last_synced_at ? new Date(dataSources[0].last_synced_at).toLocaleDateString() : "N/A"}</div><div className="adm-kpi-label">Last Data Sync</div></article>
            </div>
          </>
        );
      case "users":
      case "officers":
        return renderUsersTable();
      case "adduser":
        return renderAddUser();
      case "mlmodels":
        return (
          <>
            <div className="adm-grid-3">
              <article className="adm-kpi"><div className="adm-kpi-value tone-green">{models[0]?.r2_score?.toFixed(3) || "0.000"}</div><div className="adm-kpi-label">Top Model R²</div></article>
              <article className="adm-kpi"><div className="adm-kpi-value tone-cyan">{models[0]?.rmse?.toFixed(2) || "0.00"}</div><div className="adm-kpi-label">Top Model RMSE</div></article>
              <article className="adm-kpi"><div className="adm-kpi-value tone-purple">{models.length}</div><div className="adm-kpi-label">Registered Models</div></article>
            </div>
            <div className="adm-grid-2">
              <section className="adm-card">
                <div className="adm-card-head"><Brain size={16} className="adm-head-icon tone-purple" /> Model Performance Comparison</div>
                <div className="adm-chart-wrap"><Bar data={modelCompareData} options={chartOptions} /></div>
              </section>
              <section className="adm-card">
                <div className="adm-card-head"><TrendingUp size={16} className="adm-head-icon tone-amber" /> Training History</div>
                <div className="adm-chart-wrap"><Line data={modelTrendData} options={chartOptions} /></div>
              </section>
            </div>
            <section className="adm-card">
              <div className="adm-card-head"><Database size={16} className="adm-head-icon tone-blue" /> Model Registry</div>
              {modelsError ? <div className="adm-message adm-error">{modelsError}</div> : null}
              {modelsLoading ? (
                <div className="adm-inline-loader"><Loader2 size={18} className="spin" /> Loading models...</div>
              ) : (
                <table className="adm-table">
                  <thead><tr><th>Model</th><th>Version</th><th>R²</th><th>RMSE</th><th>MAE</th><th>Trained On</th><th>Status</th></tr></thead>
                  <tbody>
                    {models.map((model) => (
                      <tr key={model.id}>
                        <td>{model.model_name}</td>
                        <td>{model.version || "-"}</td>
                        <td>{model.r2_score ?? "-"}</td>
                        <td>{model.rmse ?? "-"}</td>
                        <td>{model.mae ?? "-"}</td>
                        <td>{model.trained_at ? new Date(model.trained_at).toLocaleDateString() : "-"}</td>
                        <td><span className={`adm-status ${model.status?.toLowerCase() === "production" ? "s-active" : "s-warn"}`}>{model.status || "unknown"}</span></td>
                      </tr>
                    ))}
                    {models.length === 0 ? <tr><td colSpan={7}>No model data available.</td></tr> : null}
                  </tbody>
                </table>
              )}
            </section>
          </>
        );
      case "dataoverview":
        return (
          <>
            <div className="adm-grid-3">
              <article className="adm-kpi"><div className="adm-kpi-value tone-cyan">{dataSources.reduce((sum, src) => sum + Number(src.record_count || 0), 0)}</div><div className="adm-kpi-label">Total Records</div></article>
              <article className="adm-kpi"><div className="adm-kpi-value tone-blue">{avgDataQuality.toFixed(1)}%</div><div className="adm-kpi-label">Avg Data Quality</div></article>
              <article className="adm-kpi"><div className="adm-kpi-value tone-green">{overview.total_wells}</div><div className="adm-kpi-label">Well Stations</div></article>
            </div>
            <section className="adm-card">
              <div className="adm-card-head"><Database size={16} className="adm-head-icon tone-cyan" /> Data Sources</div>
              {sourcesError ? <div className="adm-message adm-error">{sourcesError}</div> : null}
              {sourcesLoading ? (
                <div className="adm-inline-loader"><Loader2 size={18} className="spin" /> Loading data sources...</div>
              ) : (
                <table className="adm-table">
                  <thead><tr><th>Source</th><th>Type</th><th>Records</th><th>Update Freq</th><th>Coverage</th><th>Quality</th></tr></thead>
                  <tbody>
                    {dataSources.map((source) => (
                      <tr key={source.id}>
                        <td>{source.source_name}</td>
                        <td>{source.source_type || "-"}</td>
                        <td>{source.record_count ?? "-"}</td>
                        <td>{source.update_frequency || "-"}</td>
                        <td>{source.coverage || "-"}</td>
                        <td>{source.quality_score ?? "-"}</td>
                      </tr>
                    ))}
                    {dataSources.length === 0 ? <tr><td colSpan={6}>No sources found.</td></tr> : null}
                  </tbody>
                </table>
              )}
            </section>
            <section className="adm-card">
              <div className="adm-card-head"><Landmark size={16} className="adm-head-icon tone-blue" /> Recent Wells</div>
              {wellsError ? <div className="adm-message adm-error">{wellsError}</div> : null}
              {wellsLoading ? (
                <div className="adm-inline-loader"><Loader2 size={18} className="spin" /> Loading wells...</div>
              ) : (
                <table className="adm-table">
                  <thead><tr><th>Name</th><th>District</th><th>Taluka</th><th>Village</th><th>Status</th></tr></thead>
                  <tbody>
                    {wells.map((well) => (
                      <tr key={well.id}>
                        <td>{well.name}</td>
                        <td>{well.district || "-"}</td>
                        <td>{well.taluka || "-"}</td>
                        <td>{well.village || "-"}</td>
                        <td><span className={`adm-status ${well.is_active ? "s-active" : "s-inactive"}`}>{well.is_active ? "ACTIVE" : "INACTIVE"}</span></td>
                      </tr>
                    ))}
                    {wells.length === 0 ? <tr><td colSpan={5}>No wells available.</td></tr> : null}
                  </tbody>
                </table>
              )}
            </section>
          </>
        );
      case "activitylog":
        return renderActivity();
      case "settings":
        return renderSettings();
      default:
        return renderOverview();
    }
  };

  return (
    <div className="adm-root">
      <aside className={`adm-sidebar ${collapsed ? "collapsed" : ""} ${mobileOpen ? "open" : ""}`}>
        <div className="adm-sidebar-header">
          <div className="adm-logo"><Activity size={18} /></div>
          <div className="adm-brand-text">
            <strong>AquaVidarbha</strong>
            <span>SYSTEM ADMINISTRATOR</span>
          </div>
        </div>

        <nav className="adm-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.key}>
                {renderNavSection(item.section)}
                <button
                  className={`adm-nav-item ${activePage === item.key ? "active" : ""}`}
                  onClick={() => {
                    setActivePage(item.key);
                    setMobileOpen(false);
                    if (item.key === "users" || item.key === "officers") {
                      setUserQuery((prev) => ({ ...prev, page: 1 }));
                    }
                  }}
                >
                  <Icon size={18} className="adm-nav-icon" />
                  <span>{item.label}</span>
                </button>
              </div>
            );
          })}
        </nav>

        <div className="adm-sidebar-footer">
          <div className="adm-user-card">
            <div className="adm-user-avatar"><Shield size={18} /></div>
            <div className="adm-user-info">
              <div className="adm-user-name">{adminName}</div>
              <div className="adm-user-role adm-mono">SUPERADMIN · SYSTEM</div>
            </div>
          </div>
          <button className="adm-btn adm-btn-ghost" onClick={logout}><LogOut size={16} /> <span>Logout</span></button>
        </div>
      </aside>

      <main className={`adm-main ${collapsed ? "expanded" : ""}`}>
        <header className="adm-topbar">
          <div className="adm-topbar-left">
            <button className="adm-icon-btn" onClick={() => setCollapsed((v) => !v)}><PanelLeft size={18} /></button>
            <div className="adm-page-title"><TitleIcon size={18} /> {pageTitle[activePage]}</div>
          </div>
          <div className="adm-topbar-right">
            <span className="adm-badge-role"><Shield size={14} /> SUPERADMIN</span>
            <button className="adm-icon-btn adm-topbar-menu-btn" onClick={() => setMobileOpen((v) => !v)}><Menu size={16} /></button>
          </div>
        </header>

        <section className="adm-content">{renderPage()}</section>
      </main>
    </div>
  );
}
