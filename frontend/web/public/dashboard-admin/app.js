import { adminApi } from "./api.js";

const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

const pageMap = {
  overview: ["layout-dashboard", "System Overview"],
  analytics: ["trending-up", "Analytics"],
  health: ["activity", "System Health"],
  users: ["users", "Manage Citizens"],
  officers: ["landmark", "Manage Officers"],
  adduser: ["user-plus", "Add User / Officer"],
  mlmodels: ["brain", "ML Model Stats"],
  dataoverview: ["database", "Data Overview"],
  activitylog: ["scroll-text", "Activity Logs"],
  settings: ["sliders-horizontal", "Settings"]
};

const state = {
  users: [],
  officers: [],
  settings: [],
  overview: null,
  userQuery: { page: 1, limit: 20, search: "", district: "", active: "all" },
  officerQuery: { page: 1, limit: 20, search: "", district: "", active: "all" },
  wellsQuery: { page: 1, limit: 20, district: "", active: "all" },
  activityQuery: { page: 1, limit: 20, actor_id: "", action: "", target_table: "", start_date: "", end_date: "" },
  userMeta: null,
  officerMeta: null,
  wellsMeta: null,
  activityMeta: null
};

let usageChart;
let metricsChart;
let serverChart;

function showPage(pg) {
  $$(".page-view").forEach((v) => v.classList.remove("active"));
  const page = $(`#page-${pg}`);
  if (page) page.classList.add("active");

  $$(".nav-item").forEach((b) => b.classList.remove("active"));
  const btn = document.querySelector(`.nav-item[data-page="${pg}"]`);
  if (btn) btn.classList.add("active");

  const [ic, ti] = pageMap[pg] || ["layout-dashboard", pg];
  $("#pageTitle").innerHTML = `<i data-lucide="${ic}" style="width:18px;height:18px"></i> ${ti}`;
  lucide.createIcons();
  $("#sidebar").classList.remove("open");
}

function fmt(n) {
  if (n === null || n === undefined) return "-";
  return Number.isFinite(Number(n)) ? Number(n).toLocaleString() : String(n);
}

function statusBadge(active) {
  return `<span class="status-badge ${active ? "s-active" : "s-inactive"}">${active ? "ACTIVE" : "INACTIVE"}</span>`;
}

function setHealth(id, ok, text) {
  const el = $(id);
  if (!el) return;
  el.textContent = ok ? `OK${text ? ` (${text})` : ""}` : `FAILED${text ? ` (${text})` : ""}`;
  el.style.color = ok ? "var(--neon-green)" : "var(--neon-rose)";
}

function notify(message, isError = false) {
  const n = $("#apiNotice");
  n.textContent = message;
  n.style.borderColor = isError ? "rgba(251,113,133,.35)" : "rgba(52,211,153,.35)";
}

function toActiveParam(value) {
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

function updatePager(meta, labelId, prevId, nextId) {
  const page = meta?.page || 1;
  const total = meta?.total_pages || 1;
  const totalItems = meta?.total_items || 0;
  $(labelId).textContent = `Page ${page} of ${total} (${totalItems} items)`;
  $(prevId).disabled = page <= 1;
  $(nextId).disabled = page >= total;
}

function buildUserQuery(query, role) {
  return {
    page: query.page,
    limit: query.limit,
    role,
    search: query.search || undefined,
    district: query.district || undefined,
    active: toActiveParam(query.active)
  };
}

async function loadMe() {
  try {
    const me = await adminApi.me();
    $("#adminUserName").textContent = me.name || "Admin";
    setHealth("#meHealth", true);
    notify(`Connected as ${me.name} (${me.role})`);
  } catch (err) {
    setHealth("#meHealth", false, err.message);
    notify(`Auth error: ${err.message}`, true);
  }
}

async function loadOverview() {
  try {
    const d = await adminApi.overview();
    state.overview = d;
    $("#kpiTotalUsers").textContent = fmt(d.total_users);
    $("#kpiGovOfficers").textContent = fmt(d.gov_officers);
    $("#kpiOpenComplaints").textContent = fmt(d.open_complaints);
    $("#kpiWells").textContent = fmt(d.total_wells);
    $("#kpiAvgDepth").textContent = `${Number(d.avg_depth_mbgl || 0).toFixed(2)} m`;
    setHealth("#overviewHealth", true);
    renderOverviewCharts(d);
  } catch (err) {
    setHealth("#overviewHealth", false, err.message);
  }
}

async function loadUsers() {
  try {
    const [citizens, officers] = await Promise.all([
      adminApi.listUsers(buildUserQuery(state.userQuery, "citizen")),
      adminApi.listUsers(buildUserQuery(state.officerQuery, "gov"))
    ]);

    state.users = citizens.data || [];
    state.officers = officers.data || [];
    state.userMeta = citizens.meta || null;
    state.officerMeta = officers.meta || null;

    $("#citizensTbody").innerHTML = state.users
      .map(
        (u) => `<tr>
      <td class="mono">${u.id}</td>
      <td>${u.name || "-"}</td>
      <td>${u.email || "-"}</td>
      <td>${u.district || "-"}</td>
      <td>${statusBadge(u.is_active)}</td>
      <td>
        <button class="btn btn-sm btn-ghost" data-action="edit" data-id="${u.id}">Edit</button>
        <button class="btn btn-sm ${u.is_active ? "btn-danger" : "btn-success"}" data-action="toggle" data-active="${u.is_active}" data-id="${u.id}">${u.is_active ? "Suspend" : "Activate"}</button>
        <button class="btn btn-sm btn-danger" data-action="delete" data-id="${u.id}">Delete</button>
      </td>
    </tr>`
      )
      .join("");

    $("#officersTbody").innerHTML = state.officers
      .map(
        (u) => `<tr>
      <td class="mono">${u.id}</td>
      <td>${u.name || "-"}</td>
      <td>${u.email || "-"}</td>
      <td>${u.district || "-"}</td>
      <td>${statusBadge(u.is_active)}</td>
      <td>
        <button class="btn btn-sm btn-ghost" data-action="edit" data-id="${u.id}">Edit</button>
        <button class="btn btn-sm ${u.is_active ? "btn-danger" : "btn-success"}" data-action="toggle" data-active="${u.is_active}" data-id="${u.id}">${u.is_active ? "Suspend" : "Activate"}</button>
      </td>
    </tr>`
      )
      .join("");

    $("#analyticsUsersTbody").innerHTML = [...state.users, ...state.officers]
      .slice(0, 20)
      .map(
        (u) => `<tr><td>${u.id}</td><td>${u.name || "-"}</td><td>${u.role || "-"}</td><td>${u.district || "-"}</td><td>${u.is_active ? "Active" : "Inactive"}</td><td>${u.created_at ? new Date(u.created_at).toLocaleDateString() : "-"}</td></tr>`
      )
      .join("");

    updatePager(state.userMeta, "#citizenMeta", "#citizenPrevBtn", "#citizenNextBtn");
    updatePager(state.officerMeta, "#officerMeta", "#officerPrevBtn", "#officerNextBtn");

    setHealth("#usersHealth", true, `${(state.userMeta?.total_items || 0) + (state.officerMeta?.total_items || 0)} users`);
  } catch (err) {
    setHealth("#usersHealth", false, err.message);
  }
}

async function loadWells() {
  try {
    const res = await adminApi.listWells({
      page: state.wellsQuery.page,
      limit: state.wellsQuery.limit,
      district: state.wellsQuery.district || undefined,
      active: toActiveParam(state.wellsQuery.active)
    });
    const rows = res.data || [];
    state.wellsMeta = res.meta || null;

    $("#wellsTbody").innerHTML = rows
      .map(
        (w) => `<tr><td class="mono">${w.id}</td><td>${w.name || "-"}</td><td>${w.district || "-"}</td><td>${w.village || "-"}</td><td>${statusBadge(w.is_active)}</td></tr>`
      )
      .join("");

    updatePager(state.wellsMeta, "#wellMeta", "#wellPrevBtn", "#wellNextBtn");
    setHealth("#wellsHealth", true, `${state.wellsMeta?.total_items || rows.length} wells`);
  } catch (err) {
    setHealth("#wellsHealth", false, err.message);
  }
}

async function loadModels() {
  try {
    const res = await adminApi.listModels();
    const rows = res.data || [];
    $("#modelsTbody").innerHTML = rows
      .map(
        (m) => `<tr><td>${m.model_name}</td><td class="mono">${m.version || "-"}</td><td>${m.status || "-"}</td><td class="mono">${m.r2_score ?? "-"}</td><td class="mono">${m.rmse ?? "-"}</td><td class="mono">${m.mae ?? "-"}</td><td>${m.trained_at ? new Date(m.trained_at).toLocaleString() : "-"}</td></tr>`
      )
      .join("");
    setHealth("#modelsHealth", true, `${rows.length} models`);
  } catch (err) {
    setHealth("#modelsHealth", false, err.message);
  }
}

async function loadDataSources() {
  try {
    const res = await adminApi.listDataSources();
    const rows = res.data || [];
    $("#sourcesTbody").innerHTML = rows
      .map(
        (s) => `<tr><td>${s.source_name || "-"}</td><td>${s.source_type || "-"}</td><td class="mono">${fmt(s.record_count)}</td><td>${s.update_frequency || "-"}</td><td>${s.coverage || "-"}</td><td class="mono">${s.quality_score ?? "-"}</td></tr>`
      )
      .join("");
  } catch (err) {
    notify(`Data sources failed: ${err.message}`, true);
  }
}

async function loadActivityLog() {
  try {
    const res = await adminApi.listActivityLog({
      page: state.activityQuery.page,
      limit: state.activityQuery.limit,
      actor_id: state.activityQuery.actor_id || undefined,
      action: state.activityQuery.action || undefined,
      target_table: state.activityQuery.target_table || undefined,
      start_date: state.activityQuery.start_date || undefined,
      end_date: state.activityQuery.end_date || undefined
    });
    const rows = res.data || [];
    state.activityMeta = res.meta || null;

    $("#activityTbody").innerHTML = rows
      .map(
        (a) => `<tr><td class="mono">${a.created_at ? new Date(a.created_at).toLocaleString() : "-"}</td><td>${a.actor_id ?? "-"}</td><td>${a.actor_role || "-"}</td><td>${a.action || "-"}</td><td>${a.target_table || "-"}#${a.target_id || "-"}</td><td class="mono">${a.ip_address || "-"}</td></tr>`
      )
      .join("");

    updatePager(state.activityMeta, "#activityMeta", "#activityPrevBtn", "#activityNextBtn");
  } catch (err) {
    notify(`Activity log failed: ${err.message}`, true);
  }
}

async function loadSettings() {
  try {
    const res = await adminApi.listSettings();
    state.settings = res.data || [];

    const form = $("#settingsForm");
    form.innerHTML = state.settings
      .map(
        (s) => `<div class="form-group"><label class="form-label">${s.key}</label><input class="form-input" data-setting-key="${s.key}" value="${typeof s.value === "object" ? JSON.stringify(s.value) : String(s.value ?? "")}"/></div>`
      )
      .join("");

    $("#settingsInfoCard").innerHTML = `<div class="card-header"><div class="card-title"><i data-lucide="info" style="width:18px;height:18px;color:var(--neon-blue)"></i> System Information</div></div>
      <div class="health-row"><span>Loaded Setting Keys</span><span class="mono" style="font-size:.8rem;color:var(--accent)">${state.settings.length}</span></div>
      <div class="health-row"><span>Backend Base URL</span><span class="mono" style="font-size:.75rem;color:var(--text-dim)">${localStorage.getItem("aqua_admin_base_url") || "default"}</span></div>`;

    setHealth("#settingsHealth", true, `${state.settings.length} keys`);
    lucide.createIcons();
  } catch (err) {
    setHealth("#settingsHealth", false, err.message);
  }
}

async function onUserTableClick(e) {
  const button = e.target.closest("button[data-action]");
  if (!button) return;

  const id = Number(button.dataset.id);
  const action = button.dataset.action;
  const isOfficerTable = e.currentTarget.id === "officersTbody";

  try {
    if (action === "toggle") {
      const active = button.dataset.active === "true";
      if (active) await adminApi.suspendUser(id);
      else await adminApi.activateUser(id);
      notify(`User ${active ? "suspended" : "activated"}`);
      await Promise.all([loadUsers(), loadOverview()]);
      return;
    }

    if (action === "delete") {
      if (!window.confirm(`Delete user #${id}?`)) return;
      await adminApi.deleteUser(id);
      notify("User deleted");
      await Promise.all([loadUsers(), loadOverview()]);
      return;
    }

    if (action === "edit") {
      const user = await adminApi.getUser(id);
      const name = window.prompt("Name", user.name || "");
      if (name === null) return;
      const district = window.prompt("District", user.district || "") ?? user.district;
      const phone = window.prompt("Phone", user.phone || "") ?? user.phone;
      await adminApi.updateUser(id, { name, district, phone });
      notify(`${isOfficerTable ? "Officer" : "Citizen"} updated`);
      await loadUsers();
    }
  } catch (err) {
    notify(err.message, true);
  }
}

function bindFilters() {
  $("#userSearch").addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    state.userQuery.search = e.target.value.trim();
    state.userQuery.page = 1;
    loadUsers();
  });
  $("#officerSearch").addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    state.officerQuery.search = e.target.value.trim();
    state.officerQuery.page = 1;
    loadUsers();
  });

  $("#userDistrictFilter").addEventListener("change", (e) => {
    state.userQuery.district = e.target.value;
    state.userQuery.page = 1;
    loadUsers();
  });
  $("#officerDistrictFilter").addEventListener("change", (e) => {
    state.officerQuery.district = e.target.value;
    state.officerQuery.page = 1;
    loadUsers();
  });

  $("#userStatusFilter").addEventListener("change", (e) => {
    state.userQuery.active = e.target.value;
    state.userQuery.page = 1;
    loadUsers();
  });
  $("#officerStatusFilter").addEventListener("change", (e) => {
    state.officerQuery.active = e.target.value;
    state.officerQuery.page = 1;
    loadUsers();
  });

  $("#userLimit").addEventListener("change", (e) => {
    state.userQuery.limit = Number(e.target.value) || 20;
    state.userQuery.page = 1;
    loadUsers();
  });
  $("#officerLimit").addEventListener("change", (e) => {
    state.officerQuery.limit = Number(e.target.value) || 20;
    state.officerQuery.page = 1;
    loadUsers();
  });

  $("#wellDistrictFilter").addEventListener("change", (e) => {
    state.wellsQuery.district = e.target.value;
    state.wellsQuery.page = 1;
    loadWells();
  });
  $("#wellStatusFilter").addEventListener("change", (e) => {
    state.wellsQuery.active = e.target.value;
    state.wellsQuery.page = 1;
    loadWells();
  });
  $("#wellLimit").addEventListener("change", (e) => {
    state.wellsQuery.limit = Number(e.target.value) || 20;
    state.wellsQuery.page = 1;
    loadWells();
  });

  $("#activityActorId").addEventListener("change", (e) => {
    state.activityQuery.actor_id = e.target.value;
    state.activityQuery.page = 1;
    loadActivityLog();
  });
  $("#activityAction").addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    state.activityQuery.action = e.target.value.trim();
    state.activityQuery.page = 1;
    loadActivityLog();
  });
  $("#activityTarget").addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    state.activityQuery.target_table = e.target.value.trim();
    state.activityQuery.page = 1;
    loadActivityLog();
  });
  $("#activityLimit").addEventListener("change", (e) => {
    state.activityQuery.limit = Number(e.target.value) || 20;
    state.activityQuery.page = 1;
    loadActivityLog();
  });
  $("#activityStartDate").addEventListener("change", (e) => {
    state.activityQuery.start_date = e.target.value;
    state.activityQuery.page = 1;
    loadActivityLog();
  });
  $("#activityEndDate").addEventListener("change", (e) => {
    state.activityQuery.end_date = e.target.value;
    state.activityQuery.page = 1;
    loadActivityLog();
  });

  $("#citizenPrevBtn").addEventListener("click", () => {
    if (state.userQuery.page <= 1) return;
    state.userQuery.page -= 1;
    loadUsers();
  });
  $("#citizenNextBtn").addEventListener("click", () => {
    const total = state.userMeta?.total_pages || 1;
    if (state.userQuery.page >= total) return;
    state.userQuery.page += 1;
    loadUsers();
  });

  $("#officerPrevBtn").addEventListener("click", () => {
    if (state.officerQuery.page <= 1) return;
    state.officerQuery.page -= 1;
    loadUsers();
  });
  $("#officerNextBtn").addEventListener("click", () => {
    const total = state.officerMeta?.total_pages || 1;
    if (state.officerQuery.page >= total) return;
    state.officerQuery.page += 1;
    loadUsers();
  });

  $("#wellPrevBtn").addEventListener("click", () => {
    if (state.wellsQuery.page <= 1) return;
    state.wellsQuery.page -= 1;
    loadWells();
  });
  $("#wellNextBtn").addEventListener("click", () => {
    const total = state.wellsMeta?.total_pages || 1;
    if (state.wellsQuery.page >= total) return;
    state.wellsQuery.page += 1;
    loadWells();
  });

  $("#activityPrevBtn").addEventListener("click", () => {
    if (state.activityQuery.page <= 1) return;
    state.activityQuery.page -= 1;
    loadActivityLog();
  });
  $("#activityNextBtn").addEventListener("click", () => {
    const total = state.activityMeta?.total_pages || 1;
    if (state.activityQuery.page >= total) return;
    state.activityQuery.page += 1;
    loadActivityLog();
  });
}

function bindEvents() {
  $("#toggleSidebar").addEventListener("click", () => {
    $("#sidebar").classList.toggle("collapsed");
    $("#main").classList.toggle("expanded");
  });

  $("#mobileSidebarBtn").addEventListener("click", () => {
    $("#sidebar").classList.toggle("open");
  });

  $$(".nav-item[data-page]").forEach((btn) => {
    btn.addEventListener("click", () => showPage(btn.dataset.page));
  });

  $("#logoutBtn").addEventListener("click", () => {
    sessionStorage.removeItem("aqua_role");
    sessionStorage.removeItem("aqua_user");
    sessionStorage.removeItem("aqua_user_email");
    sessionStorage.removeItem("aqua_user_id");
    sessionStorage.removeItem("aqua_token");
    window.location.href = "./login.html";
  });

  $("#refreshUsersBtn").addEventListener("click", () => {
    state.userQuery.search = $("#userSearch").value.trim();
    state.userQuery.page = 1;
    loadUsers();
  });
  $("#refreshOfficersBtn").addEventListener("click", () => {
    state.officerQuery.search = $("#officerSearch").value.trim();
    state.officerQuery.page = 1;
    loadUsers();
  });
  $("#refreshWellsBtn").addEventListener("click", () => {
    state.wellsQuery.page = 1;
    loadWells();
  });
  $("#refreshActivityBtn").addEventListener("click", () => {
    state.activityQuery.actor_id = $("#activityActorId").value;
    state.activityQuery.action = $("#activityAction").value.trim();
    state.activityQuery.target_table = $("#activityTarget").value.trim();
    state.activityQuery.start_date = $("#activityStartDate").value;
    state.activityQuery.end_date = $("#activityEndDate").value;
    state.activityQuery.page = 1;
    loadActivityLog();
  });

  $("#citizensTbody").addEventListener("click", onUserTableClick);
  $("#officersTbody").addEventListener("click", onUserTableClick);

  $("#createUserForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const payload = Object.fromEntries(formData.entries());
    try {
      await adminApi.createUser(payload);
      notify("User created successfully");
      e.currentTarget.reset();
      await Promise.all([loadUsers(), loadOverview()]);
    } catch (err) {
      notify(`Create user failed: ${err.message}`, true);
    }
  });

  $("#createWellForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      name: fd.get("name"),
      district: fd.get("district"),
      taluka: fd.get("taluka"),
      village: fd.get("village"),
      latitude: Number(fd.get("latitude")),
      longitude: Number(fd.get("longitude"))
    };
    try {
      await adminApi.createWell(payload);
      notify("Well created successfully");
      e.currentTarget.reset();
      await Promise.all([loadWells(), loadOverview()]);
    } catch (err) {
      notify(`Create well failed: ${err.message}`, true);
    }
  });

  $("#saveSettingsBtn").addEventListener("click", async () => {
    const inputs = $$('[data-setting-key]');
    const settings = {};
    inputs.forEach((input) => {
      const key = input.dataset.settingKey;
      const value = input.value;
      try {
        settings[key] = JSON.parse(value);
      } catch {
        settings[key] = value;
      }
    });

    try {
      await adminApi.updateSettings(settings);
      notify("Settings updated");
      await loadSettings();
    } catch (err) {
      notify(`Save settings failed: ${err.message}`, true);
    }
  });

  bindFilters();
}

function renderOverviewCharts(overview) {
  const chartFont = { family: "'JetBrains Mono',monospace" };
  const gridColor = "rgba(255,255,255,.04)";
  const co = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: true, labels: { color: "#64748b", font: chartFont } } },
    scales: {
      x: { grid: { color: gridColor }, ticks: { color: "#64748b", font: chartFont } },
      y: { grid: { color: gridColor }, ticks: { color: "#64748b", font: chartFont } }
    }
  };

  usageChart?.destroy();
  metricsChart?.destroy();

  usageChart = new Chart($("#usageChart"), {
    type: "bar",
    data: {
      labels: ["Total Users", "Active Citizens", "Gov Officers", "Districts"],
      datasets: [{ data: [overview.total_users, overview.active_citizens, overview.gov_officers, overview.total_districts], backgroundColor: ["#22d3ee", "#34d399", "#a855f7", "#fbbf24"], borderRadius: 6 }]
    },
    options: { ...co, plugins: { legend: { display: false } } }
  });

  metricsChart = new Chart($("#distVolChart"), {
    type: "line",
    data: {
      labels: ["Predictions", "Complaints", "Wells"],
      datasets: [{ data: [overview.total_predictions, overview.open_complaints, overview.total_wells], borderColor: "#3b82f6", fill: true, backgroundColor: "rgba(59,130,246,.08)", tension: 0.35 }]
    },
    options: { ...co, plugins: { legend: { display: false } } }
  });
}

function renderStaticServerChart() {
  const chartFont = { family: "'JetBrains Mono',monospace" };
  const gridColor = "rgba(255,255,255,.04)";

  serverChart?.destroy();
  serverChart = new Chart($("#serverChart"), {
    type: "line",
    data: {
      labels: ["00:00", "04:00", "08:00", "12:00", "16:00", "20:00", "Now"],
      datasets: [
        { label: "CPU %", data: [12, 8, 22, 45, 62, 58, 48], borderColor: "#a855f7", tension: 0.4, pointRadius: 2 },
        { label: "Memory %", data: [55, 54, 60, 68, 72, 70, 65], borderColor: "#22d3ee", tension: 0.4, pointRadius: 2 }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: true, labels: { color: "#64748b", font: chartFont } } },
      scales: {
        x: { grid: { color: gridColor }, ticks: { color: "#64748b", font: chartFont } },
        y: { grid: { color: gridColor }, ticks: { color: "#64748b", font: chartFont } }
      }
    }
  });
}

function ensureAdminSession() {
  const role = (sessionStorage.getItem("aqua_role") || "").toLowerCase();
  const token = sessionStorage.getItem("aqua_token");
  if (role !== "admin" || !token) {
    window.location.href = "./login.html";
    return false;
  }
  return true;
}

async function init() {
  if (!ensureAdminSession()) return;

  lucide.createIcons();
  bindEvents();
  renderStaticServerChart();

  await loadMe();
  await Promise.allSettled([loadOverview(), loadUsers(), loadWells(), loadModels(), loadDataSources(), loadActivityLog(), loadSettings()]);
}

init();
