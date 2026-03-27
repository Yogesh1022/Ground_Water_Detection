import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api/v1/common-user";
const API_CLIENT = (import.meta.env.VITE_API_CLIENT || "fetch").toLowerCase();

function withQuery(path, query) {
  if (!query || Object.keys(query).length === 0) return `${API_BASE_URL}${path}`;
  const qs = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      qs.append(key, String(value));
    }
  });
  const queryString = qs.toString();
  return queryString ? `${API_BASE_URL}${path}?${queryString}` : `${API_BASE_URL}${path}`;
}

function getErrorMessage(payload, fallback) {
  if (!payload) return fallback;
  if (typeof payload === "string") return payload;
  if (payload.error) return payload.error;
  if (payload.message) return payload.message;
  return fallback;
}

async function requestFetch(method, path, { query, body, headers } = {}) {
  const response = await fetch(withQuery(path, query), {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(headers || {})
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(getErrorMessage(payload, `HTTP ${response.status}`));
  }

  return payload;
}

async function requestAxios(method, path, { query, body, headers } = {}) {
  try {
    const response = await axios({
      baseURL: API_BASE_URL,
      url: path,
      method,
      params: query,
      data: body,
      headers: {
        "Content-Type": "application/json",
        ...(headers || {})
      }
    });
    return response.data;
  } catch (error) {
    const message = getErrorMessage(error?.response?.data, error.message || "Request failed");
    throw new Error(message);
  }
}

export async function httpRequest(method, path, options) {
  if (API_CLIENT === "axios") {
    return requestAxios(method, path, options);
  }
  return requestFetch(method, path, options);
}

export function getClientInfo() {
  return { client: API_CLIENT, baseUrl: API_BASE_URL };
}
