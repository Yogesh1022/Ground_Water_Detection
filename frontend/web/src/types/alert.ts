export interface Alert {
  id: string;
  district?: string;
  title: string;
  message: string;
  time: string;
  tone: "critical" | "warn" | "info" | "success";
  created_at?: string;
  type?: string;
}

export interface AlertResponse {
  data: Alert[];
}
