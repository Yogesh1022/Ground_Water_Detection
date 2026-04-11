import { httpRequest } from "../../../services/api/client";
import type { AlertResponse, DistrictResponse, WellResponse, ComplaintPayload, ComplaintResponse, ComplaintTrackResponse } from "../../../types";

export async function getAlerts(query: Record<string, unknown> = {}): Promise<AlertResponse> {
  return httpRequest("GET", "/alerts", { query });
}

export async function getDistrictSummary(): Promise<DistrictResponse> {
  return httpRequest("GET", "/districts/summary");
}

export async function getWells(query: Record<string, unknown> = {}): Promise<WellResponse> {
  return httpRequest("GET", "/wells", { query });
}

export async function createComplaint(payload: ComplaintPayload): Promise<ComplaintResponse> {
  return httpRequest("POST", "/complaints", { body: payload });
}

export async function trackComplaint(tracking: string): Promise<ComplaintTrackResponse> {
  return httpRequest("GET", `/complaints/track/${encodeURIComponent(tracking)}`);
}

export async function getGroundwaterReadings(query: Record<string, unknown> = {}) {
  return httpRequest("GET", "/groundwater-readings", { query });
}

export async function predictDepth(payload: Record<string, unknown>) {
  return httpRequest("POST", "/predict", { body: payload });
}
