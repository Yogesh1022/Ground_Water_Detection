export interface District {
  district: string;
  depth: number;
  trend: "up" | "down" | "stable" | "flat";
  status: "danger" | "warning" | "ok" | "safe";
  avg_depth_mbgl?: number;
  depth_change_qoq?: number;
  risk_status?: string;
}

export interface DistrictResponse {
  data: District[];
}
