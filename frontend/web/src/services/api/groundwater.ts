import { httpRequest } from "./client";

export interface GroundwaterReading {
  id: number;
  well_id: number;
  well_name: string;
  district: string;
  reading_date: string;
  depth_mbgl: number | null;
  rainfall_mm: number | null;
  temperature_avg: number | null;
  humidity: number | null;
  evapotranspiration: number | null;
  rainfall_lag_1m: number | null;
  rainfall_lag_2m: number | null;
  rainfall_deficit: number | null;
  depth_lag_1q: number | null;
  depth_lag_2q: number | null;
  month: number;
  season: string;
  latitude: number;
  longitude: number;
  ndvi: number | null;
}

export interface GroundwaterReadingResponse {
  data: GroundwaterReading[];
  meta: {
    page: number;
    limit: number;
    total_items: number;
    total_pages: number;
  };
}

export interface GroundwaterReadingFilters {
  page?: number;
  limit?: number;
  district?: string;
  well_id?: number;
  start_date?: string;
  end_date?: string;
  sort_by?: "reading_date" | "well_id" | "depth_mbgl" | "rainfall_mm";
  sort_order?: "ASC" | "DESC";
}

export async function fetchGroundwaterReadings(
  filters: GroundwaterReadingFilters = {}
): Promise<GroundwaterReadingResponse> {
  const defaultFilters = {
    page: 1,
    limit: 20,
    sort_by: "reading_date",
    sort_order: "DESC",
    ...filters,
  };

  return httpRequest("GET", "/groundwater-readings", {
    query: defaultFilters,
  });
}

export async function listAllDistricts(): Promise<string[]> {
  // This would typically come from a separate endpoint
  // For now, we'll provide the known districts from the CSV
  return [
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
    "Yavatmal",
  ];
}
