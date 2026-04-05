# Gov Dashboard Frontend — Step-by-step (from 0 → working end-to-end)

You said you’re in the learning stage of React and you want to build the **Government Officer dashboard frontend** for the **Gov backend** in the **same style/pattern** as the existing **Admin** + **Common User** frontends.

This guide is written specifically for your repo:

- Frontend app: `frontend/web` (React + Vite)
- Auth: `sessionStorage` keys set by the login page
- Routing: `react-router-dom` + `RoleGuard`
- Gov backend base path: `/api/v1/govn-user` (see `.env.example`)
- Design reference (must match): `frontend/legacy/v2/dashboard-gov.html`

The goal: when you **login as a gov officer**, you can open `/dashboard-gov`, see the gov UI (same look as `dashboard-gov.html`), and it calls the real backend endpoints.

---

## 0) Prerequisites (one-time)

### 0.1 Install Node + npm

- Install Node.js LTS (18+ recommended).
- Confirm:

```bash
node -v
npm -v
```

### 0.2 Install frontend dependencies

From your repo:

```bash
cd frontend
npm install
```

This workspace is configured so `frontend` is the workspace root, and `frontend/web` is the actual app.

### 0.3 Start backend (so the dashboard can load real data)

Run your backend (you already do this; just ensure it’s on `http://localhost:8080`).

### 0.4 Start the frontend dev server

```bash
cd frontend
npm run dev
```

Open the Vite URL (usually `http://localhost:5173`).

---

## 1) Understand your existing frontend architecture (IMPORTANT)

Before building anything, understand how the repo already works:

### 1.1 Role + token storage

Your login page stores:

- `sessionStorage.setItem("aqua_role", user.role)`
- `sessionStorage.setItem("aqua_token", token)`

Everything in dashboards depends on these values.

### 1.2 Route protection

`RoleGuard` checks:

- token exists
- role matches allowed roles

So your gov dashboard route should look like:

```tsx
<RoleGuard allowRoles={["gov"]}>
  <GovDashboardPage />
</RoleGuard>
```

### 1.3 How Common User dashboard is structured

Common user dashboard uses a **shell component** (`src/app/App.tsx`) that:

- renders `Sidebar` + `Topbar`
- chooses a page based on the URL

That is a clean pattern for gov too.

### 1.4 How Admin dashboard is structured

Admin dashboard uses a **single page component** (`AdminDashboardPage.tsx`) that:

- keeps `activePage` in React state
- renders different sections based on `activePage`

Gov HTML (`dashboard-gov.html`) is also structured like “one page with internal navigation”, so gov can follow the **Admin pattern**.

---

## 2) The UI you must reproduce (from `dashboard-gov.html`)

Your gov UI has these navigation pages (keep the same names/feel):

**Command**
- Command Center (overview)
- All Requests
- District Analytics
- AI Forecasts

**Management**
- Task Assignment
- Tanker Schedule
- Generate Reports

**System**
- Activity Log

Also keep:

- Sidebar collapse
- Mobile sidebar open/close
- Topbar with role badge
- Logout clears session
- Charts + tables

---

## 3) “From scratch” plan (what files you will create)

You can build this in 2 ways:

### Option A (recommended for learning): build a `GovDashboardPage.tsx` like Admin

- 1 page file that holds state + renders multiple “views”
- easiest to follow `dashboard-gov.html`

### Option B (more scalable): build a feature folder like Common User

- `features/gov/components/*`
- `features/gov/pages/*`
- a gov shell routes to child pages

This guide teaches **Option A first**, then shows how to refactor to Option B once it works.

---

## 4) Step 1 — Create the Gov API layer (connect to backend)

You want the UI to be real (not only demo numbers). So start by creating API helpers.

### 4.1 Create file: `src/features/gov/api/govApi.ts`

Responsibilities:

- read base URL: `VITE_GOV_BASE_URL` (fallback to `/api/v1/govn-user`)
- attach auth token from `sessionStorage`
- call endpoints
- return typed data

Template structure (copy-paste starter):

```ts
// src/features/gov/api/govApi.ts

const GOV_BASE_URL = (import.meta.env.VITE_GOV_BASE_URL || "/api/v1/govn-user").replace(/\/$/, "");

function getToken(): string {
  return sessionStorage.getItem("aqua_token") || "";
}

type DataWrapper<T> = { data: T };

function toQueryString(params: Record<string, string | number | boolean | undefined | null>): string {
  const usp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    usp.set(key, String(value));
  }
  const s = usp.toString();
  return s ? `?${s}` : "";
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();

  const res = await fetch(`${GOV_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = typeof payload?.error === "string" ? payload.error : `HTTP ${res.status}`;
    throw new Error(msg);
  }

  return payload as T;
}

export type GovProfile = {
  id: number;
  name: string;
  email: string;
  role: string;
  district?: string;
};

export async function getGovProfile(): Promise<GovProfile> {
  // Backend route: GET /api/v1/govn-user/me
  return request<GovProfile>("/me");
}
```

### 4.2 Exact gov endpoints (from your backend `routes.go`)

All of these live under the same base path:

- Base: `/api/v1/govn-user`
- Auth: `Authorization: Bearer <JWT>` (taken from `sessionStorage.aqua_token`)
- District: derived from the logged-in officer (middleware attaches it); you do NOT pass district in most requests.

Important: some endpoints return JSON directly (e.g. `/overview`), while others wrap the payload in `{ "data": ... }`.

#### Identity

- `GET /me` → `ProfileResponse` (direct)

#### Overview

- `GET /overview` → `OverviewResponse` (direct)

#### Complaints / Requests

- `GET /requests` → `ComplaintListResponse` (direct)
  - Query params: `page`, `limit`, `status`, `severity`, `type`, `priority`, `q`, `from`, `to`
- `GET /requests/:id` → `ComplaintResponse` (direct)
- `GET /requests/:id/history` → `{ data: AuditEntry[] }` (wrapped; shape depends on audit repo)
- `GET /requests/export` →
  - JSON: `{ data: ComplaintResponse[] }` (wrapped) when `format` is not `csv`
  - CSV file download when `format=csv`
  - Query params: same as `/requests` plus `format`
- `PUT /requests/:id/assign` body: `{ officer_id: number, note?: string }` → `{ message: string }`
- `PUT /requests/:id/resolve` body: optional (not required) → `{ message: string }`
- `PUT /requests/:id/escalate` body: `{ escalation_note?: string }` → `{ message: string }`

#### District analytics

- `GET /districts/analytics` → `DistrictAnalyticsResponse` (direct)
- `GET /districts/rainfall-depth` → `{ data: RainfallDepthPoint[] }` (wrapped)
- `GET /districts/summary` → `{ data: DistrictSummaryRow[] }` (wrapped)

#### Forecast

- `GET /forecast` → `ForecastResponse` (direct)
- `GET /forecast/long` → `{ data: Forecast90DayPoint[] }` (wrapped)
- `GET /forecast/shap` → `{ data: ShapFeature[] }` (wrapped)

#### Crisis zones

- `GET /crisis-zones` → `{ data: CrisisZone[] }` (wrapped)

#### Tanker schedule

- `GET /tankers` → `{ data: TankerResponse[] }` (wrapped)
- `POST /tankers` body: `CreateTankerRequest` → `TankerResponse` (direct)
- `PATCH /tankers/:id` body: `UpdateTankerRequest` → `204 No Content`

#### Tasks

- `POST /tasks` body: `CreateTaskRequest` → `TaskResponse` (direct)
- `PATCH /tasks/:id` body: `UpdateTaskRequest` → `TaskResponse` (direct)
- `PATCH /tasks/:id/reassign` body: `ReassignTaskRequest` → `TaskResponse` (direct)
- `GET /tasks` → `TaskListResponse` (direct)
  - Query params: `page`, `limit`
- `GET /teams/workload` → `{ data: WorkloadEntry[] }` (wrapped)

#### System / audit

- `GET /activity-log` → `ActivityLogResponse` (direct)
  - Query params: `page`, `limit`, `action`, `actor`, `from`, `to`

#### Reports

- `POST /reports/generate` body: `{ report_type: string }` → `ReportJobResponse` (direct)

### 4.3 Add copy-paste API functions for the pages you will build

Start with these helpers (they match the backend return shapes above):

```ts
export type OverviewResponse = {
  district: string;
  open_complaints: number;
  resolved_this_month: number;
  active_tanker_routes: number;
  pending_tasks: number;
  well_count: number;
  avg_depth_mbgl: number;
  risk_status: string;
  crisis_index: number;
  category_counts?: Array<{ category: string; count: number }>;
  crisis_series?: Array<{ district: string; score: number }>;
  priority_requests?: Array<{
    id: number;
    tracking_number: string;
    issue: string;
    village: string;
    priority: string;
    status: string;
    assigned_to: string;
    submitted_at: string;
  }>;
  recent_activity?: Array<{ timestamp: string; actor: string; action: string; target: string; details: unknown }>;
};

export async function getGovOverview(): Promise<OverviewResponse> {
  return request<OverviewResponse>("/overview");
}

export type ComplaintListQuery = {
  page?: number;
  limit?: number;
  status?: string;
  severity?: string;
  type?: string;
  priority?: string;
  q?: string;
  from?: string;
  to?: string;
};

export type ComplaintResponse = {
  id: number;
  tracking_number: string;
  type: string;
  district: string;
  taluka: string;
  village: string;
  severity: string;
  priority: string;
  description: string;
  status: string;
  assigned_officer_id: number | null;
  escalation_note: string;
  created_at: string;
  updated_at: string;
};

export type ComplaintListResponse = {
  data: ComplaintResponse[];
  meta: { page: number; limit: number; total_items: number; total_pages: number };
};

export async function listGovRequests(q: ComplaintListQuery): Promise<ComplaintListResponse> {
  return request<ComplaintListResponse>(`/requests${toQueryString(q)}`);
}

export async function getGovRequest(id: number): Promise<ComplaintResponse> {
  return request<ComplaintResponse>(`/requests/${id}`);
}

export async function assignGovRequest(id: number, payload: { officer_id: number; note?: string }): Promise<{ message: string }> {
  return request<{ message: string }>(`/requests/${id}/assign`, { method: "PUT", body: JSON.stringify(payload) });
}

export async function resolveGovRequest(id: number): Promise<{ message: string }> {
  return request<{ message: string }>(`/requests/${id}/resolve`, { method: "PUT" });
}

export async function escalateGovRequest(id: number, payload?: { escalation_note?: string }): Promise<{ message: string }> {
  return request<{ message: string }>(`/requests/${id}/escalate`, { method: "PUT", body: JSON.stringify(payload ?? {}) });
}

export async function exportGovRequestsCSV(q: ComplaintListQuery): Promise<string> {
  const token = getToken();
  const res = await fetch(`${GOV_BASE_URL}/requests/export${toQueryString({ ...q, format: "csv" })}`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

export async function getGovRainfallDepth(): Promise<Array<{ rainfall_mm: number; depth_mbgl: number }>> {
  const wrapped = await request<DataWrapper<Array<{ rainfall_mm: number; depth_mbgl: number }>>>("/districts/rainfall-depth");
  return wrapped.data;
}

export async function getGovForecastLong(): Promise<Array<{ month: string; depth_mbgl: number; upper_band: number; lower_band: number }>> {
  const wrapped = await request<DataWrapper<Array<{ month: string; depth_mbgl: number; upper_band: number; lower_band: number }>>>("/forecast/long");
  return wrapped.data;
}
```

You can expand these types directly from the Go DTOs in `backend/internal/dashboard/govn_user/dto/dto.go`.

Your first 3 “make it real” calls should be:

1) `getGovProfile()` → topbar name/district
2) `getGovOverview()` → KPI cards + priority requests + recent activity
3) `listGovRequests({ page: 1, limit: 20 })` → All Requests table

---

## 5) Step 2 — Create a first working Gov dashboard page (no charts yet)

Goal: you can navigate to `/dashboard-gov` and see the layout.

### 5.1 Create file: `src/pages/GovDashboardPage.tsx`

Build the “shell” first:

- state: `activePage`
- state: `collapsed`, `mobileOpen`
- `useEffect`: guard for role + token
- `logout`: clear session + navigate

Pseudo-skeleton:

```tsx
type GovPage = "overview" | "requests" | "districts" | "forecast" | "assign" | "tankers" | "reports" | "activity";

export default function GovDashboardPage() {
  const navigate = useNavigate();
  const [activePage, setActivePage] = useState<GovPage>("overview");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const role = sessionStorage.getItem("aqua_role");
    const token = sessionStorage.getItem("aqua_token");
    if (role !== "gov" || !token) {
      navigate("/login", { replace: true });
    }
  }, [navigate]);

  const logout = () => {
    sessionStorage.clear();
    navigate("/login");
  };

  return (
    <div className="g-root">
      {/* sidebar */}
      {/* main/topbar */}
      {/* content */}
    </div>
  );
}
```

### 5.2 Copy the UI structure from `dashboard-gov.html`

From the HTML reference, the structure is:

- Sidebar (fixed)
- Main (margin-left changes when collapsed)
- Topbar (sticky)
- Content

In React, represent it as:

```tsx
<div className="g-root">
  <aside className={`g-sidebar ${collapsed ? "collapsed" : ""} ${mobileOpen ? "open" : ""}`}>
    ...
  </aside>

  <main className={`g-main ${collapsed ? "expanded" : ""}`}>
    <header className="g-topbar">...</header>
    <div className="g-content">...</div>
  </main>
</div>
```

### 5.3 Create CSS file: `src/styles/gov-dashboard.css`

Take your existing CSS from the HTML (or the existing `gov-dashboard.css`) and move it into this CSS file.

Rule of thumb:

- keep class names stable
- don’t over-optimize; your goal is “match the design” first

---

## 6) Step 3 — Build the sidebar navigation (same behavior as HTML)

### 6.1 Create a typed nav config

Make your nav items a single array, then render them.

Example:

```ts
type GovNavItem = {
  key: GovPage;
  label: string;
  icon: LucideIcon;
  section: "Command" | "Management" | "System";
  badge?: string;
};
```

Then group by section:

```ts
const sections = ["Command", "Management", "System"] as const;
```

### 6.2 Render nav buttons

Each button:

- calls `setActivePage(key)`
- closes mobile sidebar
- shows active style

---

## 7) Step 4 — Implement the 8 page views (start with placeholders)

Do not try to build everything at once.

### 7.1 Create small render functions

For example:

```tsx
const renderRequests = () => (
  <section className="g-card">
    <div className="g-card-head">All Citizen Requests</div>
    <div>TODO: Table + filters</div>
  </section>
);
```

### 7.2 Switch render based on `activePage`

```tsx
const renderContent = () => {
  switch (activePage) {
    case "overview":
      return renderOverview();
    case "requests":
      return renderRequests();
    ...
  }
};
```

Make sure every page key returns something.

---

## 8) Step 5 — Add charts (React way)

Your HTML uses Chart.js directly.

In React, you can use `react-chartjs-2` (already used in your repo).

### 8.1 Register Chart.js components (required)

Create file `src/lib/chartSetup.ts`:

```ts
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend
);
```

Then import it once (top of your app entry file), e.g. in `src/app/main.tsx`:

```ts
import "../lib/chartSetup";
```

### 8.2 Convert HTML chart configs into `useMemo` data

Example:

```tsx
const crisisData = useMemo(() => ({
  labels: ["Yavatmal", "Amravati"],
  datasets: [{ data: [9.2, 8.4] }]
}), []);

<Bar data={crisisData} options={chartOptions} />
```

---

## 9) Step 6 — Connect pages to real backend data

Now replace demo numbers with real API calls.

### 9.1 First: load the gov profile

In `useEffect`:

- call `getGovProfile()`
- store officer name

### 9.2 Second: load “overview” dashboard data

Use your existing backend endpoint `GET /api/v1/govn-user/overview` (it already returns KPI + widgets for the logged-in officer’s district).

For the other charts/pages, you already have endpoints too (examples):

- District Analytics: `GET /districts/analytics`, `GET /districts/rainfall-depth`, `GET /districts/summary`
- AI Forecasts: `GET /forecast`, `GET /forecast/long`, `GET /forecast/shap`, `GET /crisis-zones`

Your overview DTO already contains fields like:

- open requests count
- resolved count (month)
- tanker active count
- crisis index + risk status

Then in the overview page:

- show loading skeleton or small loader
- show error banner if request fails

Pattern:

```tsx
const [overview, setOverview] = useState<OverviewResponse | null>(null);
const [loading, setLoading] = useState(false);
const [error, setError] = useState("");

useEffect(() => {
  setLoading(true);
  getGovOverview().then(setOverview).catch(e => setError(e.message)).finally(() => setLoading(false));
}, []);
```

---

## 10) Step 7 — Make it “same structure” as Admin + Common User (refactor)

Once the gov page works, you can refactor it to a cleaner folder layout.

### 10.1 Move layout pieces into `features/gov/components/`

Create:

- `features/gov/components/GovSidebar.tsx`
- `features/gov/components/GovTopbar.tsx`

Your `GovDashboardPage` becomes smaller:

```tsx
<GovSidebar ... />
<main>
  <GovTopbar ... />
  <GovContent ... />
</main>
```

### 10.2 Move each “page view” into `features/gov/pages/`

- `OverviewPage.tsx`
- `RequestsPage.tsx`
- `DistrictsPage.tsx`
- `ForecastPage.tsx`
- `AssignPage.tsx`
- `TankersPage.tsx`
- `ReportsPage.tsx`
- `ActivityPage.tsx`

Now you have the same concept as common-user pages.

---

## 11) Step 8 — Verify route + auth works end-to-end

### 11.1 Confirm route exists

In `src/app/router/routes.dashboard.tsx` you should have:

- `path: "/dashboard-gov"`
- wrapped in `RoleGuard allowRoles={["gov"]}`

### 11.2 Test manual flow

1) Go to `/login`
2) Choose “Government Officer” tab
3) Login
4) Navigate to `/dashboard-gov`

### 11.3 Debug checklist

If it redirects to login:

- `sessionStorage.aqua_token` exists?
- `sessionStorage.aqua_role === "gov"`?

If API calls fail:

- check browser Network tab
- confirm base URL (`VITE_GOV_BASE_URL`)
- confirm Vite proxy in `vite.config.ts` if you use relative `/api/...`

---

## 12) Extra learning tips (so you don’t get stuck)

### 12.1 Build in slices

Do it in this order:

1) Layout + nav switching (no backend)
2) Profile fetch + show officer name
3) Overview endpoint + KPI numbers
4) Requests list endpoint + table
5) Add charts

### 12.2 Keep types simple early

Start with minimal TypeScript types, then tighten later.

---

## 13) Your next action (do this now)

1) Open `frontend/legacy/v2/dashboard-gov.html` in VS Code side-by-side.
2) Build the layout shell in `GovDashboardPage.tsx` with matching CSS classes.
3) Add placeholder renders for all pages.
4) Only then connect the backend data.

If you want, tell me what gov backend endpoints you already have in `backend/internal/dashboard/govn_user/handler/routes.go`, and I can help you map each UI section to a real endpoint + response type.
