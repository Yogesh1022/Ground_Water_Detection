import axios, { type AxiosError } from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "/api/v1/common-user";
const API_CLIENT = (import.meta.env.VITE_API_CLIENT || "fetch").toLowerCase();

type QueryValue = string | number | boolean | null | undefined;
type QueryParams = Record<string, QueryValue>;
type HeaderMap = Record<string, string>;

type RequestOptions = {
  query?: QueryParams;
  body?: unknown;
  headers?: HeaderMap;
};

function withQuery(path: string, query?: QueryParams): string {
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

async function requestFetch<T>(method: string, path: string, { query, body, headers }: RequestOptions = {}): Promise<T> {
  const finalHeaders = {
    ...(headers || {})
  };

  if (body !== undefined && body !== null && !finalHeaders["Content-Type"]) {
    finalHeaders["Content-Type"] = "application/json";
  }

  const response = await fetch(withQuery(path, query), {
    method,
    headers: finalHeaders,
    body: body !== undefined && body !== null ? JSON.stringify(body) : undefined
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(getErrorMessage(payload, `HTTP ${response.status}`));
  }

  return payload as T;
}

async function requestAxios<T>(method: string, path: string, { query, body, headers }: RequestOptions = {}): Promise<T> {
  try {
    const finalHeaders = {
      ...(headers || {})
    };

    if (body !== undefined && body !== null && !finalHeaders["Content-Type"]) {
      finalHeaders["Content-Type"] = "application/json";
    }

    const response = await axios({
      baseURL: API_BASE_URL,
      url: path,
      method,
      params: query,
      data: body,
      headers: finalHeaders
    });
    return response.data as T;
  } catch (error) {
    const axiosError = error as AxiosError;
    const message = getErrorMessage(axiosError?.response?.data, axiosError?.message || "Request failed");
    throw new Error(message);
  }
}

export async function httpRequest<T = unknown>(method: string, path: string, options?: RequestOptions): Promise<T> {
  if (API_CLIENT === "axios") {
    return requestAxios<T>(method, path, options);
  }
  return requestFetch<T>(method, path, options);
}

export function getClientInfo(): { client: string; baseUrl: string } {
  return { client: API_CLIENT, baseUrl: API_BASE_URL };
}
