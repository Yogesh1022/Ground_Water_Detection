export interface GovProfile {
  id: number;
  email: string;
  name: string;
  role: string;
  district: string;
  phone: string;
}

export interface OverviewResponse {
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

export interface ComplaintResponse {
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
}

export interface ComplaintListResponse {
  data: ComplaintResponse[];
  meta: { page: number; limit: number; total_items: number; total_pages: number };
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

export interface RainfallDepthPoint {
  rainfall_mm: number;
  depth_mbgl: number;
}

export interface DistrictSummaryRow {
  district: string;
  avg_depth_mbgl: number;
  change: number;
  wells: number;
  reports: number;
  risk: string;
  tankers: number;
}

export interface ForecastResponse {
  district: string;
  forecast: Array<{ month_offset: number; label: string; depth_mbgl: number; risk_level: string; confidence: number }>;
}

export interface Forecast90DayPoint {
  month: string;
  depth_mbgl: number;
  upper_band: number;
  lower_band: number;
}

export interface ShapFeature {
  name: string;
  importance: number;
}

export interface CrisisZone {
  district: string;
  risk_status: string;
  crisis_index: number;
  avg_depth_mbgl: number;
  well_count: number;
}

export interface TankerResponse {
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

export interface TaskResponse {
  id: number;
  complaint_id: number;
  assignee_officer_id: number;
  assignee_name: string;
  priority: string;
  status: string;
  notes: string;
  due_date: string;
  created_at: string;
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

export interface TaskListResponse {
  data: TaskResponse[];
  meta: { page: number; limit: number; total_items: number; total_pages: number };
}

export interface WorkloadEntry {
  officer_id: number;
  officer_name: string;
  pending: number;
  in_progress: number;
  completed: number;
  total: number;
}

export interface ActivityEntry {
  id: number;
  actor_id: number;
  actor_role: string;
  action: string;
  target_table: string;
  target_id: number;
  details: unknown;
  created_at: string;
}

export interface ActivityLogResponse {
  data: ActivityEntry[];
  meta: { page: number; limit: number; total_items: number; total_pages: number };
}

export interface ReportJobResponse {
  job_id: string;
  status: string;
  file_url?: string;
  message?: string;
  report_type?: string;
}

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

function getToken(): string {
  return sessionStorage.getItem("aqua_token") || "";
}

function toQueryString(query: ComplaintListQuery | Record<string, string | number | boolean | undefined | null> | undefined): string {
  const searchParams = new URLSearchParams();
  Object.entries(query || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key, String(value));
    }
  });
  const serialized = searchParams.toString();
  return serialized ? `?${serialized}` : "";
}

async function govRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${GOV_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
      ...(options.headers || {})
    }
  });

  const text = await response.text();
  const payload = text ? (JSON.parse(text) as unknown) : null;

  if (!response.ok) {
    throw new Error(getErrorMessage(payload, `HTTP ${response.status}`));
  }

  return payload as T;
}

export async function getGovProfile(): Promise<GovProfile> {
  return govRequest<GovProfile>("/me");
}

export async function getGovOverview(): Promise<OverviewResponse> {
  return govRequest<OverviewResponse>("/overview");
}

export async function listGovRequests(query: ComplaintListQuery = {}): Promise<ComplaintListResponse> {
  return govRequest<ComplaintListResponse>(`/requests${toQueryString(query)}`);
}

export async function getGovRequest(requestId: number): Promise<ComplaintResponse> {
  return govRequest<ComplaintResponse>(`/requests/${requestId}`);
}

export async function assignGovRequest(requestId: number, payload: { officer_id: number; note?: string }): Promise<{ message: string }> {
  return govRequest<{ message: string }>(`/requests/${requestId}/assign`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export async function resolveGovRequest(requestId: number): Promise<{ message: string }> {
  return govRequest<{ message: string }>(`/requests/${requestId}/resolve`, {
    method: "PUT"
  });
}

export async function escalateGovRequest(requestId: number, payload: { escalation_note?: string } = {}): Promise<{ message: string }> {
  return govRequest<{ message: string }>(`/requests/${requestId}/escalate`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export async function exportGovRequestsCSV(query: ComplaintListQuery = {}): Promise<string> {
  const response = await fetch(`${GOV_BASE_URL}/requests/export${toQueryString({ ...query, format: "csv" })}`, {
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
  return govRequest<DistrictAnalyticsResponse>("/districts/analytics");
}

export async function getGovRainfallDepth(): Promise<RainfallDepthPoint[]> {
  const response = await govRequest<{ data: RainfallDepthPoint[] }>("/districts/rainfall-depth");
  return response.data;
}

export async function getGovDistrictSummary(): Promise<DistrictSummaryRow[]> {
  const response = await govRequest<{ data: DistrictSummaryRow[] }>("/districts/summary");
  return response.data;
}

export async function getGovForecast(): Promise<ForecastResponse> {
  return govRequest<ForecastResponse>("/forecast");
}

export async function getGovForecastLong(): Promise<Forecast90DayPoint[]> {
  const response = await govRequest<{ data: Forecast90DayPoint[] }>("/forecast/long");
  return response.data;
}

export async function getGovShapFeatures(): Promise<ShapFeature[]> {
  const response = await govRequest<{ data: ShapFeature[] }>("/forecast/shap");
  return response.data;
}

export async function getGovCrisisZones(): Promise<CrisisZone[]> {
  const response = await govRequest<{ data: CrisisZone[] }>("/crisis-zones");
  return response.data;
}

export async function listGovTankers(): Promise<TankerResponse[]> {
  const response = await govRequest<{ data: TankerResponse[] }>("/tankers");
  return response.data;
}

export async function createGovTanker(payload: CreateTankerRequest): Promise<TankerResponse> {
  return govRequest<TankerResponse>("/tankers", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function updateGovTanker(tankerId: number, payload: UpdateTankerRequest): Promise<void> {
  await govRequest<void>(`/tankers/${tankerId}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export async function createGovTask(payload: CreateTaskRequest): Promise<TaskResponse> {
  return govRequest<TaskResponse>("/tasks", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function updateGovTask(taskId: number, payload: UpdateTaskRequest): Promise<TaskResponse> {
  return govRequest<TaskResponse>(`/tasks/${taskId}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export async function reassignGovTask(taskId: number, payload: ReassignTaskRequest): Promise<TaskResponse> {
  return govRequest<TaskResponse>(`/tasks/${taskId}/reassign`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export async function listGovTasks(query: { page?: number; limit?: number } = {}): Promise<TaskListResponse> {
  return govRequest<TaskListResponse>(`/tasks${toQueryString(query)}`);
}

export async function getGovTeamWorkload(): Promise<WorkloadEntry[]> {
  const response = await govRequest<{ data: WorkloadEntry[] }>("/teams/workload");
  return response.data;
}

export async function getGovActivityLog(query: { page?: number; limit?: number; action?: string; actor?: string; from?: string; to?: string } = {}): Promise<ActivityLogResponse> {
  return govRequest<ActivityLogResponse>(`/activity-log${toQueryString(query)}`);
}

export async function generateGovReport(reportType: string): Promise<ReportJobResponse> {
  return govRequest<ReportJobResponse>("/reports/generate", {
    method: "POST",
    body: JSON.stringify({ report_type: reportType })
  });
}
