import { httpRequest } from "./httpClient";

export async function getAlerts(query = {}) {
  return httpRequest("GET", "/alerts", { query });
}

export async function getDistrictSummary() {
  return httpRequest("GET", "/districts/summary");
}

export async function getWells(query = {}) {
  return httpRequest("GET", "/wells", { query });
}

export async function createComplaint(payload) {
  return httpRequest("POST", "/complaints", { body: payload });
}

export async function trackComplaint(tracking) {
  return httpRequest("GET", `/complaints/track/${encodeURIComponent(tracking)}`);
}
