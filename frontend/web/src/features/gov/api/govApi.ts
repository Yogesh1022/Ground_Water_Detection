export interface GovProfile {
  id: number;
  email: string;
  name: string;
  role: string;
  district: string;
  phone: string;
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
  assigned_officer_id?: number | null;
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

export interface ReportJobResponse {
  job_id: string;
  status: string;
  file_url?: string;
  message?: string;
  report_type?: string;
}

export interface ComplaintListQuery {
  page?: number;
  limit?: number;
  status?: string;
  severity?: string;
  type?: string;
  priority?: string;
  q?: string;
  from?: string;
  to?: string;
  format?: string;
}

export interface CreateTankerRequest {
  route_name: string;
  villages: string[];
  schedule?: string;
  capacity_liters?: number;
  assigned_driver?: string;
  contact_number?: string;
}

export interface UpdateTankerRequest {
  route_name?: string;
  villages?: string[];
  schedule?: string;
  capacity_liters?: number;
  assigned_driver?: string;
  contact_number?: string;
  status?: string;
}

export interface CreateTaskRequest {
  complaint_id: number;
  assignee_officer_id: number;
  priority: string;
  notes?: string;
  due_date?: string;
}

export interface UpdateTaskRequest {
  status: string;
  notes?: string;
}

export interface ReassignTaskRequest {
  assignee_officer_id: number;
  notes?: string;
}

export interface GovTask {
  id: number;
  complaint_id: number;
  assignee_officer_id?: number;
  assignee_name: string;
  priority: string;
  status: string;
  notes?: string;
  due_date?: string;
  created_at?: string;
}

export interface DistrictAnalyticsResponse {
  district: string;
  well_count: number;
  avg_depth_mbgl: number;
  max_depth_mbgl: number;
  min_depth_mbgl: number;
  risk_status: string;
  crisis_index: number;
  depth_change_qoq: number;
  monthly_trend: Array<{ month: string; avg_depth_mbgl: number; well_count: number }>;
}

export interface ForecastResponse {
  district: string;
  forecast: Array<{ month_offset: number; label: string; depth_mbgl: number; risk_level: string; confidence: number }>;
}

export interface ActivityLogResponse {
  data: GovActivityEntry[];
  meta: PagedMeta;
}

type QueryValue = string | number | boolean | undefined | null;
type RequestOptions = {
  query?: ComplaintListQuery | Record<string, QueryValue>;
  body?: unknown;
};

const GOV_BASE_URL = (import.meta.env.VITE_GOV_BASE_URL || "/api/v1/govn-user").replace(/\/$/, "");

function getToken(): string {
  return sessionStorage.getItem("aqua_token") || "";
}

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

async function govRequest<T>(method: string, path: string, options: RequestOptions = {}): Promise<T> {
  const response = await fetch(withQuery(path, options.query), {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {})
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined
  });

  const text = await response.text();
  const payload = text ? (JSON.parse(text) as unknown) : null;

  if (!response.ok) {
    throw new Error(getErrorMessage(payload, `HTTP ${response.status}`));
  }

  return payload as T;
}

export async function getGovProfile(): Promise<GovProfile> {
  return govRequest<GovProfile>("GET", "/me");
}

export async function getGovOverview(): Promise<GovOverview> {
  return govRequest<GovOverview>("GET", "/overview");
}

export async function listGovRequests(query: ComplaintListQuery = {}): Promise<{ data: GovComplaint[]; meta: PagedMeta }> {
  return govRequest<{ data: GovComplaint[]; meta: PagedMeta }>("GET", "/requests", { query });
}

export async function getGovRequest(requestId: number): Promise<GovComplaint> {
  return govRequest<GovComplaint>("GET", `/requests/${requestId}`);
}

export async function assignGovRequest(requestId: number, payload: { officer_id: number; note?: string }): Promise<{ message: string }> {
  return govRequest<{ message: string }>("PUT", `/requests/${requestId}/assign`, { body: payload });
}

export async function resolveGovRequest(requestId: number): Promise<{ message: string }> {
  return govRequest<{ message: string }>("PUT", `/requests/${requestId}/resolve`);
}

export async function escalateGovRequest(requestId: number, payload: { escalation_note?: string } = {}): Promise<{ message: string }> {
  return govRequest<{ message: string }>("PUT", `/requests/${requestId}/escalate`, { body: payload });
}

export async function exportGovRequestsCSV(query: ComplaintListQuery = {}): Promise<string> {
  const response = await fetch(withQuery("/requests/export", { ...query, format: "csv" }), {
    headers: {
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {})
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.text();
}

export async function getGovDistrictAnalytics(): Promise<DistrictAnalyticsResponse> {
  return govRequest<DistrictAnalyticsResponse>("GET", "/districts/analytics");
}

export async function getGovDistrictSummary(): Promise<{ data: GovDistrictSummaryRow[] }> {
  return govRequest<{ data: GovDistrictSummaryRow[] }>("GET", "/districts/summary");
}

export async function getGovRainfallDepth(): Promise<{ data: GovRainfallDepthPoint[] }> {
  return govRequest<{ data: GovRainfallDepthPoint[] }>("GET", "/districts/rainfall-depth");
}

export async function getGovForecast(): Promise<ForecastResponse> {
  return govRequest<ForecastResponse>("GET", "/forecast");
}

export async function getGovForecastLong(): Promise<{ data: GovForecast90Point[] }> {
  return govRequest<{ data: GovForecast90Point[] }>("GET", "/forecast/long");
}

export async function getGovForecastShap(): Promise<{ data: GovShapFeature[] }> {
  return govRequest<{ data: GovShapFeature[] }>("GET", "/forecast/shap");
}

export async function getGovCrisisZones(): Promise<{ data: GovCrisisZone[] }> {
  return govRequest<{ data: GovCrisisZone[] }>("GET", "/crisis-zones");
}

export async function listGovTankers(): Promise<{ data: GovTankerRoute[] }> {
  return govRequest<{ data: GovTankerRoute[] }>("GET", "/tankers");
}

export async function createGovTanker(payload: CreateTankerRequest): Promise<GovTankerRoute> {
  return govRequest<GovTankerRoute>("POST", "/tankers", { body: payload });
}

export async function updateGovTanker(tankerId: number, payload: UpdateTankerRequest): Promise<void> {
  await govRequest<void>("PATCH", `/tankers/${tankerId}`, { body: payload });
}

export async function createGovTask(payload: CreateTaskRequest): Promise<GovTask> {
  return govRequest<GovTask>("POST", "/tasks", { body: payload });
}

export async function updateGovTask(taskId: number, payload: UpdateTaskRequest): Promise<GovTask> {
  return govRequest<GovTask>("PATCH", `/tasks/${taskId}`, { body: payload });
}

export async function reassignGovTask(taskId: number, payload: ReassignTaskRequest): Promise<GovTask> {
  return govRequest<GovTask>("PATCH", `/tasks/${taskId}/reassign`, { body: payload });
}

export async function listGovTasks(query: { page?: number; limit?: number } = {}): Promise<{ data: GovTask[]; meta: PagedMeta }> {
  return govRequest<{ data: GovTask[]; meta: PagedMeta }>("GET", "/tasks", { query });
}

export async function getGovTeamsWorkload(): Promise<{ data: GovTeamWorkload[] }> {
  return govRequest<{ data: GovTeamWorkload[] }>("GET", "/teams/workload");
}

export async function listGovActivity(query: { page?: number; limit?: number; action?: string; actor?: string; from?: string; to?: string } = {}): Promise<ActivityLogResponse> {
  return govRequest<ActivityLogResponse>("GET", "/activity-log", { query });
}

export async function getGovActivityLog(query: { page?: number; limit?: number; action?: string; actor?: string; from?: string; to?: string } = {}): Promise<ActivityLogResponse> {
  return listGovActivity(query);
}

export async function generateGovReport(reportType: string): Promise<ReportJobResponse> {
  return govRequest<ReportJobResponse>("POST", "/reports/generate", {
    body: { report_type: reportType }
  });
}

export async function getGovShapFeatures(): Promise<{ data: GovShapFeature[] }> {
  return getGovForecastShap();
}

export async function getGovTeamWorkload(): Promise<{ data: GovTeamWorkload[] }> {
  return getGovTeamsWorkload();
}

export type OverviewResponse = GovOverview;
export type ComplaintResponse = GovComplaint;
export type ComplaintListResponse = { data: GovComplaint[]; meta: PagedMeta };
export type DistrictSummaryRow = GovDistrictSummaryRow;
export type RainfallDepthPoint = GovRainfallDepthPoint;
export type Forecast90DayPoint = GovForecast90Point;
export type ShapFeature = GovShapFeature;
export type CrisisZone = GovCrisisZone;
export type TankerResponse = GovTankerRoute;
export type TaskResponse = GovTask;
export type TaskListResponse = { data: GovTask[]; meta: PagedMeta };
export type WorkloadEntry = GovTeamWorkload;
export type ActivityEntry = GovActivityEntry;