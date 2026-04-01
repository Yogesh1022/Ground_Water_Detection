const ADMIN_BASE_URL = (window.AQUA_ADMIN_BASE_URL || localStorage.getItem("aqua_admin_base_url") || "http://localhost:8080/api/v1/admin").replace(/\/$/, "");
const AUTH_BASE_URL = (window.AQUA_AUTH_BASE_URL || localStorage.getItem("aqua_auth_base_url") || "http://localhost:8080/api/v1/auth").replace(/\/$/, "");

function withQuery(path, query) {
  const url = new URL(`${ADMIN_BASE_URL}${path}`);
  if (query && typeof query === "object") {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    });
  }
  return url.toString();
}

function errorText(payload, fallback) {
  if (!payload) return fallback;
  if (typeof payload === "string") return payload;
  if (typeof payload === "object") {
    if (typeof payload.error === "string") return payload.error;
    if (typeof payload.message === "string") return payload.message;
  }
  return fallback;
}

export async function adminRequest(method, path, { query, body } = {}) {
  const token = sessionStorage.getItem("aqua_token");
  const response = await fetch(withQuery(path, query), {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const text = await response.text();
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  if (!response.ok) {
    throw new Error(errorText(payload, `HTTP ${response.status}`));
  }

  return payload;
}

export async function authLogin(payload) {
  const response = await fetch(`${AUTH_BASE_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    throw new Error(errorText(data, `HTTP ${response.status}`));
  }

  return data;
}

export const adminApi = {
  me: () => adminRequest("GET", "/me"),
  overview: () => adminRequest("GET", "/overview"),

  listUsers: (query = {}) => adminRequest("GET", "/users", { query }),
  getUser: (id) => adminRequest("GET", `/users/${id}`),
  createUser: (payload) => adminRequest("POST", "/users", { body: payload }),
  updateUser: (id, payload) => adminRequest("PUT", `/users/${id}`, { body: payload }),
  suspendUser: (id) => adminRequest("PUT", `/users/${id}/suspend`),
  activateUser: (id) => adminRequest("PUT", `/users/${id}/activate`),
  deleteUser: (id) => adminRequest("DELETE", `/users/${id}`),

  listWells: (query = {}) => adminRequest("GET", "/wells", { query }),
  createWell: (payload) => adminRequest("POST", "/wells", { body: payload }),

  listSettings: () => adminRequest("GET", "/settings"),
  updateSettings: (settings) => adminRequest("PUT", "/settings", { body: { settings } }),

  listModels: () => adminRequest("GET", "/models"),
  listDataSources: () => adminRequest("GET", "/data-sources"),

  listActivityLog: (query = {}) => adminRequest("GET", "/activity-log", { query })
};
