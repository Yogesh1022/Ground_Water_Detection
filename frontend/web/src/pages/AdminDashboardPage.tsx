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
  SlidersHorizontal,
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
  deleteAdminUser,
  getAdminActivityLog,
  getAdminOverview,
  getAdminSettings,
  listAdminUsers,
  suspendAdminUser,
  updateAdminSettings,
  updateAdminUser,
  type AdminOverviewResponse,
  type AdminUser,
  type AuditLogEntry,
  type CreateUserPayload,
  type PagedMeta,
  type SettingItem,
  type UpdateUserPayload
} from "../features/admin/api/adminApi";
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

export default function AdminDashboardPage() {
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

  const [userQuery, setUserQuery] = useState<UserQueryState>(defaultUserQuery);
  const [searchInput, setSearchInput] = useState("");

  const [overviewLoading, setOverviewLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(true);
  const [activityLoading, setActivityLoading] = useState(true);
  const [settingsLoading, setSettingsLoading] = useState(true);

  const [overviewError, setOverviewError] = useState("");
  const [usersError, setUsersError] = useState("");
  const [activityError, setActivityError] = useState("");
  const [settingsError, setSettingsError] = useState("");
  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState("");
  const [settingsSaveMessage, setSettingsSaveMessage] = useState("");

  const [isCreating, setIsCreating] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [actionBusyId, setActionBusyId] = useState<number | null>(null);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [editPayload, setEditPayload] = useState<UpdateUserPayload>({});

  const [createForm, setCreateForm] = useState<CreateUserPayload>(emptyCreateForm);

  const adminName = sessionStorage.getItem("aqua_user") || "System Administrator";

  const usageData = useMemo(
    () => ({
      labels: ["Feb 10", "Feb 15", "Feb 20", "Feb 25", "Mar 1", "Mar 5", "Mar 10"],
      datasets: [
        {
          label: "Citizens",
          data: [210, 245, 230, 268, 290, 315, 341],
          borderColor: "#22d3ee",
          backgroundColor: "rgba(34,211,238,.07)",
          tension: 0.4,
          fill: true
        },
        {
          label: "Officers",
          data: [28, 30, 29, 31, 31, 33, 34],
          borderColor: "#a855f7",
          tension: 0.4
        }
      ]
    }),
    []
  );

  const districtVolumeData = useMemo(
    () => ({
      labels: ["Amravati", "Yavatmal", "Akola", "Buldhana", "Washim", "Wardha", "Nagpur"],
      datasets: [
        {
          data: [68, 84, 45, 52, 31, 32, 28],
          backgroundColor: ["#fb7185", "#fb7185", "#fbbf24", "#fbbf24", "#fbbf24", "#22d3ee", "#34d399"],
          borderRadius: 8
        }
      ]
    }),
    []
  );

  const trendData = useMemo(
    () => ({
      labels: ["Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"],
      datasets: [
        {
          label: "Resolution %",
          data: [88, 91, 90, 93, 94, 94.2, 95],
          borderColor: "#34d399",
          backgroundColor: "rgba(52,211,153,.08)",
          fill: true,
          tension: 0.4
        }
      ]
    }),
    []
  );

  const modelCompareData = useMemo(
    () => ({
      labels: ["XGBoost", "LSTM", "Random Forest", "1D-CNN"],
      datasets: [
        {
          label: "R² Score",
          data: [0.889, 0.901, 0.874, 0.852],
          backgroundColor: ["rgba(52,211,153,.6)", "rgba(168,85,247,.6)", "rgba(34,211,238,.6)", "rgba(251,191,36,.6)"],
          borderRadius: 8
        }
      ]
    }),
    []
  );

  const roleFilter = activePage === "officers" ? "gov" : activePage === "users" ? "citizen" : "";

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

    void loadOverview();
    void loadActivity();
    void loadSettings();
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

  const startEdit = (user: AdminUser) => {
    setEditingUserId(user.id);
    setEditPayload({
      name: user.name,
      district: user.district,
      phone: user.phone,
      role: user.role
    });
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
          <article className="adm-kpi"><div className="adm-kpi-value tone-cyan">{overview.total_users}</div><div className="adm-kpi-label">Total Users</div></article>
          <article className="adm-kpi"><div className="adm-kpi-value tone-purple">{overview.gov_officers}</div><div className="adm-kpi-label">Gov Officers</div></article>
          <article className="adm-kpi"><div className="adm-kpi-value tone-blue">{overview.open_complaints}</div><div className="adm-kpi-label">Open Complaints</div></article>
          <article className="adm-kpi"><div className="adm-kpi-value tone-amber">{overview.total_wells}</div><div className="adm-kpi-label">Wells</div></article>
          <article className="adm-kpi"><div className="adm-kpi-value tone-green">{overview.total_predictions}</div><div className="adm-kpi-label">Predictions</div></article>
        </div>
        <div className="adm-grid-2">
          <section className="adm-card">
            <div className="adm-card-head">Platform Usage (Last 30 Days)</div>
            <div className="adm-chart-wrap"><Line data={usageData} options={chartOptions} /></div>
          </section>
          <section className="adm-card">
            <div className="adm-card-head">Request Volume by District</div>
            <div className="adm-chart-wrap"><Bar data={districtVolumeData} options={chartOptions} /></div>
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
                        <button className="adm-btn adm-btn-ghost" onClick={() => startEdit(user)}><UserCog size={14} /> Edit</button>
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
  );

  const renderActivity = () => {
    if (activityLoading) return <div className="adm-card"><Loader2 size={18} className="spin" /> Loading activity...</div>;
    return (
      <section className="adm-card">
        <div className="adm-card-head">Full System Activity Log</div>
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
          <div className="adm-card-head">System Settings</div>
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
          <div className="adm-grid-2">
            <section className="adm-card">
              <div className="adm-card-head">Resolution Trend</div>
              <div className="adm-chart-wrap"><Line data={trendData} options={chartOptions} /></div>
            </section>
            <section className="adm-card">
              <div className="adm-card-head">Model Comparison</div>
              <div className="adm-chart-wrap"><Bar data={modelCompareData} options={chartOptions} /></div>
            </section>
          </div>
        );
      case "health":
        return (
          <section className="adm-card">
            <div className="adm-card-head">System Components</div>
            <div className="adm-health-row"><span>ML Inference Engine</span><span className="tone-green">ONLINE</span></div>
            <div className="adm-health-row"><span>Database</span><span className="tone-cyan">CONNECTED</span></div>
            <div className="adm-health-row"><span>API Server</span><span className="tone-green">RUNNING</span></div>
            <div className="adm-health-row"><span>District Coverage</span><span className="tone-amber">{overview.total_districts}</span></div>
          </section>
        );
      case "users":
      case "officers":
        return renderUsersTable();
      case "adduser":
        return renderAddUser();
      case "mlmodels":
        return (
          <section className="adm-card">
            <div className="adm-card-head">Model Registry</div>
            <table className="adm-table">
              <thead><tr><th>Model</th><th>Version</th><th>R²</th><th>Status</th></tr></thead>
              <tbody>
                <tr><td>XGBoost Ensemble</td><td>v2.4.1</td><td>0.889</td><td><span className="adm-status s-active">PRODUCTION</span></td></tr>
                <tr><td>LSTM (GRU Enhanced)</td><td>v1.8.3</td><td>0.901</td><td><span className="adm-status s-active">PRODUCTION</span></td></tr>
                <tr><td>Random Forest</td><td>v2.1.0</td><td>0.874</td><td><span className="adm-status s-warn">BACKUP</span></td></tr>
              </tbody>
            </table>
          </section>
        );
      case "dataoverview":
        return (
          <section className="adm-card">
            <div className="adm-card-head">Data Health Snapshot</div>
            <div className="adm-health-row"><span>Total Wells</span><span className="tone-cyan">{overview.total_wells}</span></div>
            <div className="adm-health-row"><span>Total Predictions</span><span className="tone-green">{overview.total_predictions}</span></div>
            <div className="adm-health-row"><span>Average Depth (mbgl)</span><span className="tone-amber">{overview.avg_depth_mbgl.toFixed(2)}</span></div>
          </section>
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
                  <Icon size={16} />
                  <span>{item.label}</span>
                </button>
              </div>
            );
          })}
        </nav>

        <div className="adm-sidebar-footer">
          <div className="adm-admin-pill">{adminName}</div>
          <button className="adm-btn adm-btn-ghost" onClick={logout}><LogOut size={14} /> Logout</button>
        </div>
      </aside>

      <main className={`adm-main ${collapsed ? "expanded" : ""}`}>
        <header className="adm-topbar">
          <div className="adm-topbar-left">
            <button className="adm-icon-btn" onClick={() => setCollapsed((v) => !v)}><PanelLeft size={17} /></button>
            <div className="adm-page-title"><TitleIcon size={17} /> {pageTitle[activePage]}</div>
          </div>
          <button className="adm-icon-btn" onClick={() => setMobileOpen((v) => !v)}><Menu size={17} /></button>
        </header>

        <section className="adm-content">{renderPage()}</section>
      </main>
    </div>
  );
}
