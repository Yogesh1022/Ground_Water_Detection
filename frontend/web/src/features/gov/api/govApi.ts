export interface GovProfile {
  id: number;
  name: string;
  email: string;
  role: string;
  district?: string;
  phone?: string;
}

export interface GovOverview {
  district: string;
  open_complaints: number;
  resolved_this_month: number;
  active_tanker_routes: number;
  pending_tasks: number;
  well_count: number;
  avg_depth_mbgl: number;
  risk_status: string;
  crisis_index: number;
  category_counts: Array<{ category: string; count: number }>;
  crisis_series: Array<{ district: string; score: number }>;
  priority_requests: Array<{
    id: number;
    tracking_number: string;
    issue: string;
    village: string;
    priority: string;
    status: string;
    assigned_to: string;
    submitted_at: string;
  }>;
  recent_activity: Array<{
    timestamp: string;
    actor: string;
    action: string;
    target: string;
    details: unknown;
  }>;
}

export interface PagedMeta {
  page: number;
  limit: number;
  total_items: number;
  total_pages: number;
}

export interface GovComplaint {
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
  assigned_officer_id?: number;
  escalation_note?: string;
  created_at: string;
  updated_at: string;
}

export interface GovDistrictSummaryRow {
  district: string;
  avg_depth_mbgl: number;
  change: number;
  wells: number;
  reports: number;
  risk: string;
  tankers: number;
}

export interface GovRainfallDepthPoint {
  rainfall_mm: number;
  depth_mbgl: number;
}

export interface GovForecast90Point {
  month: string;
  depth_mbgl: number;
  upper_band: number;
  lower_band: number;
}

export interface GovShapFeature {
  name: string;
  importance: number;
}

export interface GovCrisisZone {
  district: string;
  risk_status: string;
  crisis_index: number;
  avg_depth_mbgl: number;
  well_count: number;
}

export interface GovTeamWorkload {
  officer_id: number;
  officer_name: string;
  pending: number;
  in_progress: number;
  completed: number;
  total: number;
}

export interface GovTankerRoute {
  id: number;
  route_name: string;
  district: string;
  villages: string[];
  schedule: string;
  capacity_liters: number;
  status: string;
  assigned_driver: string;
  contact_number: string;
  created_at: string;
}

export interface GovActivityEntry {
  id: number;
  actor_id: number;
  actor_role: string;
  action: string;
  target_table: string;
  target_id: number;
  details: unknown;
  created_at: string;
}

type QueryValue = string | number | boolean | undefined;
type RequestOptions = {
  query?: Record<string, QueryValue>;
  body?: unknown;
};

const GOV_BASE_URL = (import.meta.env.VITE_GOV_BASE_URL || "/api/v1/govn-user").replace(/\/$/, "");

function getErrorMessage(payload: unknown, fallback: string): string {
  if (!payload) return fallback;
  if (typeof payload === "string") return payload;
  if (typeof payload === "object") {
    const maybeError = (payload as { error?: unknown }).error;
    const maybeMessage = (payload as { message?: unknown }).message;
    if (typeof maybeError === "string") return maybeError;
    if (typeof maybeMessage === "string") return maybeMessage;
  }
  return fallback;
}

export async function getGovProfile(): Promise<GovProfile> {
  return govRequest<GovProfile>("GET", "/me");
}

async function govRequest<T>(method: string, path: string, options: RequestOptions = {}): Promise<T> {
  const token = sessionStorage.getItem("aqua_token");
  const response = await fetch(withQuery(path, options.query), {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const text = await response.text();
  const payload = text ? (JSON.parse(text) as unknown) : null;

  if (!response.ok) {
    throw new Error(getErrorMessage(payload, `HTTP ${response.status}`));
  }

  return payload as T;
}

function withQuery(path: string, query?: RequestOptions["query"]): string {
  const url = new URL(`${GOV_BASE_URL}${path}`, window.location.origin);
  if (!query) return url.toString();

  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  return url.toString();
}

export function getGovOverview(): Promise<GovOverview> {
  return govRequest<GovOverview>("GET", "/overview");
}

export function listGovRequests(query: RequestOptions["query"] = {}): Promise<{ data: GovComplaint[]; meta: PagedMeta }> {
  return govRequest<{ data: GovComplaint[]; meta: PagedMeta }>("GET", "/requests", { query });
}

export function getGovDistrictSummary(): Promise<{ data: GovDistrictSummaryRow[] }> {
  return govRequest<{ data: GovDistrictSummaryRow[] }>("GET", "/districts/summary");
}

export function getGovRainfallDepth(): Promise<{ data: GovRainfallDepthPoint[] }> {
  return govRequest<{ data: GovRainfallDepthPoint[] }>("GET", "/districts/rainfall-depth");
}

export function getGovForecastLong(): Promise<{ data: GovForecast90Point[] }> {
  return govRequest<{ data: GovForecast90Point[] }>("GET", "/forecast/long");
}

export function getGovForecastShap(): Promise<{ data: GovShapFeature[] }> {
  return govRequest<{ data: GovShapFeature[] }>("GET", "/forecast/shap");
}

export function getGovCrisisZones(): Promise<{ data: GovCrisisZone[] }> {
  return govRequest<{ data: GovCrisisZone[] }>("GET", "/crisis-zones");
}

export function listGovTankers(): Promise<{ data: GovTankerRoute[] }> {
  return govRequest<{ data: GovTankerRoute[] }>("GET", "/tankers");
}

export function listGovTasks(query: RequestOptions["query"] = {}): Promise<{ data: Array<{ id: number; complaint_id: number; assignee_name: string; priority: string; status: string }>; meta: PagedMeta }> {
  return govRequest<{ data: Array<{ id: number; complaint_id: number; assignee_name: string; priority: string; status: string }>; meta: PagedMeta }>("GET", "/tasks", { query });
}

export function getGovTeamsWorkload(): Promise<{ data: GovTeamWorkload[] }> {
  return govRequest<{ data: GovTeamWorkload[] }>("GET", "/teams/workload");
}

export function listGovActivity(query: RequestOptions["query"] = {}): Promise<{ data: GovActivityEntry[]; meta: PagedMeta }> {
  return govRequest<{ data: GovActivityEntry[]; meta: PagedMeta }>("GET", "/activity-log", { query });
}

export function generateGovReport(reportType: string): Promise<{ job_id: string; status: string; file_url?: string; message?: string; report_type?: string }> {
  return govRequest<{ job_id: string; status: string; file_url?: string; message?: string; report_type?: string }>("POST", "/reports/generate", {
    body: { report_type: reportType }
  });
}
