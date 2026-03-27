export type SeverityLevel = "low" | "medium" | "high" | "critical";
export type ComplaintType = "water_shortage" | "infrastructure" | "contamination" | "other";
export type ComplaintStatus = "open" | "in_review" | "urgent" | "resolved" | "waiting";

export interface Complaint {
  id: string;
  problem: string;
  location: string;
  date: string;
  status: ComplaintStatus;
  note: string;
  cls: "progress" | "resolved" | "info" | "danger";
  type?: ComplaintType;
  district?: string;
  taluka?: string;
  village?: string;
  severity?: SeverityLevel;
  description?: string;
  tracking_number?: string;
  created_at?: string;
}

export interface ComplaintPayload {
  type: ComplaintType;
  district: string;
  taluka: string;
  village: string;
  severity: SeverityLevel;
  description: string;
}

export interface ComplaintResponse {
  tracking_number: string;
}

export interface ComplaintTrackResponse extends Complaint {
  tracking_number: string;
  created_at: string;
}
