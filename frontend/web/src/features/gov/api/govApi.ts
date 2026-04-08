export interface GovProfile {
  id: number;
  name: string;
  email: string;
  role: string;
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

export async function getGovProfile(): Promise<GovProfile> {
  const token = sessionStorage.getItem("aqua_token");
  const response = await fetch(`${GOV_BASE_URL}/me`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });

  const text = await response.text();
  const payload = text ? (JSON.parse(text) as unknown) : null;

  if (!response.ok) {
    throw new Error(getErrorMessage(payload, `HTTP ${response.status}`));
  }

  return payload as GovProfile;
}
