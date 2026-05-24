import { httpRequest } from "../../../services/api/client";
import type { AlertResponse, DistrictResponse, WellResponse, ComplaintPayload, ComplaintResponse, ComplaintTrackResponse } from "../../../types";

type QueryValue = string | number | boolean | null | undefined;
type QueryParams = Record<string, QueryValue>;

type DistrictLike = {
  district?: string;
};

type GroundwaterReadingLike = DistrictLike & {
  well_name?: string;
  latitude?: number | string;
  longitude?: number | string;
  depth_mbgl?: number | string;
  reading_date?: string;
};

const DISTRICT_NAMES = [
  "Akola",
  "Amravati",
  "Bhandara",
  "Buldhana",
  "Chandrapur",
  "Gadchiroli",
  "Gondia",
  "Nagpur",
  "Wardha",
  "Washim",
  "Yavatmal"
];

function normalizeDistrictName(value?: string): string {
  const district = String(value || "").trim();
  const match = district.match(/^District_(\d+)$/i);
  if (!match) return district;

  const index = Number(match[1]);
  if (!Number.isInteger(index) || index < 0 || index >= DISTRICT_NAMES.length) {
    return district;
  }

  return DISTRICT_NAMES[index];
}

function normalizeDistrictResponse<T extends DistrictLike>(row: T): T {
  return {
    ...row,
    district: normalizeDistrictName(row.district)
  };
}

function normalizeDistrictText(value?: string): string {
  let text = String(value || "");
  for (let index = 0; index < DISTRICT_NAMES.length; index += 1) {
    const placeholder = new RegExp(`\\bDistrict_${index}\\b`, "gi");
    text = text.replace(placeholder, DISTRICT_NAMES[index]);
  }
  return text;
}

function normalizeAlertResponse<T extends { district?: string; title?: string; message?: string }>(row: T): T {
  return {
    ...row,
    district: normalizeDistrictName(row.district),
    title: normalizeDistrictText(row.title),
    message: normalizeDistrictText(row.message)
  };
}

export async function getAlerts(query: QueryParams = {}): Promise<AlertResponse> {
  const response = await httpRequest<AlertResponse>("GET", "/alerts", { query });
  return {
    ...response,
    data: Array.isArray(response?.data) ? response.data.map(normalizeAlertResponse) : []
  };
}

export async function getDistrictSummary(): Promise<DistrictResponse> {
  const response = await httpRequest<DistrictResponse>("GET", "/districts/summary");
  return {
    ...response,
    data: Array.isArray(response?.data) ? response.data.map(normalizeDistrictResponse) : []
  };
}

export async function getWells(query: QueryParams = {}): Promise<WellResponse> {
  const response = await httpRequest<WellResponse>("GET", "/wells", { query });
  return {
    ...response,
    data: Array.isArray(response?.data) ? response.data.map(normalizeDistrictResponse) : []
  };
}

export async function createComplaint(payload: ComplaintPayload): Promise<ComplaintResponse> {
  return httpRequest<ComplaintResponse>("POST", "/complaints", { body: payload });
}

export async function trackComplaint(tracking: string): Promise<ComplaintTrackResponse> {
  const response = await httpRequest<ComplaintTrackResponse>("GET", `/complaints/track/${encodeURIComponent(tracking)}`);
  return normalizeDistrictResponse(response);
}

export async function getGroundwaterReadings(query: QueryParams = {}) {
  const response = await httpRequest<{ data?: GroundwaterReadingLike[] }>("GET", "/groundwater-readings", { query });
  return {
    ...response,
    data: Array.isArray(response?.data)
      ? response.data.map((row) => normalizeDistrictResponse(row))
      : []
  };
}

export async function predictDepth(payload: Record<string, unknown>) {
  return httpRequest("POST", "/predict", { body: payload });
}
