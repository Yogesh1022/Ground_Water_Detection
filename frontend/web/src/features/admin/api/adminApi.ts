export interface AdminOverviewResponse {
  total_users: number;
  active_citizens: number;
  gov_officers: number;
  total_wells: number;
  total_predictions: number;
  open_complaints: number;
  total_districts: number;
  avg_depth_mbgl: number;
}

export interface AdminUser {
  id: number;
  email: string;
  name: string;
  role: "citizen" | "gov" | "admin";
  district: string;
  phone: string;
  is_active: boolean;
  created_at: string;
}

export interface PagedMeta {
  page: number;
  limit: number;
  total_items: number;
  total_pages: number;
}

export interface ListUsersResponse {
  data: AdminUser[];
  meta: PagedMeta;
}

export interface CreateUserPayload {
  email: string;
  password: string;
  name: string;
  role: "citizen" | "gov" | "admin";
  district?: string;
  phone?: string;
}

export interface UpdateUserPayload {
  name?: string;
  district?: string;
  phone?: string;
  role?: "citizen" | "gov" | "admin";
}

export interface SettingItem {
  key: string;
  value: unknown;
  description: string;
  updated_at: string;
}

export interface SettingsResponse {
  data: SettingItem[];
}

export interface AuditLogEntry {
  id: number;
  actor_id: number;
  actor_role: string;
  action: string;
  target_table: string;
  target_id: number;
  details: unknown;
  ip_address: string;
  created_at: string;
}

export interface AuditLogResponse {
  data: AuditLogEntry[];
  meta: PagedMeta;
}

type RequestOptions = {
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
};

const ADMIN_BASE_URL = (import.meta.env.VITE_ADMIN_BASE_URL || "http://localhost:8080/api/v1/admin").replace(/\/$/, "");

function withQuery(path: string, query?: RequestOptions["query"]): string {
  const url = new URL(`${ADMIN_BASE_URL}${path}`);
  if (!query) return url.toString();

  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  return url.toString();
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

async function adminRequest<T>(method: string, path: string, options: RequestOptions = {}): Promise<T> {
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

export function getAdminOverview(): Promise<AdminOverviewResponse> {
  return adminRequest<AdminOverviewResponse>("GET", "/overview");
}

export function listAdminUsers(query: RequestOptions["query"] = {}): Promise<ListUsersResponse> {
  return adminRequest<ListUsersResponse>("GET", "/users", { query });
}

export function createAdminUser(payload: CreateUserPayload): Promise<AdminUser> {
  return adminRequest<AdminUser>("POST", "/users", { body: payload });
}

export function updateAdminUser(userId: number, payload: UpdateUserPayload): Promise<AdminUser> {
  return adminRequest<AdminUser>("PUT", `/users/${userId}`, { body: payload });
}

export function deleteAdminUser(userId: number): Promise<{ message: string }> {
  return adminRequest<{ message: string }>("DELETE", `/users/${userId}`);
}

export function suspendAdminUser(userId: number): Promise<{ message: string }> {
  return adminRequest<{ message: string }>("PUT", `/users/${userId}/suspend`);
}

export function activateAdminUser(userId: number): Promise<{ message: string }> {
  return adminRequest<{ message: string }>("PUT", `/users/${userId}/activate`);
}

export function getAdminActivityLog(query: RequestOptions["query"] = {}): Promise<AuditLogResponse> {
  return adminRequest<AuditLogResponse>("GET", "/activity-log", { query });
}

export function getAdminSettings(): Promise<SettingsResponse> {
  return adminRequest<SettingsResponse>("GET", "/settings");
}

export function updateAdminSettings(settings: Record<string, unknown>): Promise<{ message: string }> {
  return adminRequest<{ message: string }>("PUT", "/settings", { body: { settings } });
}
