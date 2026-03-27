export interface Well {
  n: string;
  lt: number;
  ln: number;
  d: number;
  p: string;
  fam: number;
  t: string;
  name?: string;
  latitude?: number;
  longitude?: number;
  depth_total_m?: number;
  affected_families?: number;
  district?: string;
  taluka?: string;
  s?: DepthStyle;
}

export interface DepthStyle {
  color: string;
  risk: string;
  radius: number;
}

export interface WellResponse {
  data: Well[];
}
