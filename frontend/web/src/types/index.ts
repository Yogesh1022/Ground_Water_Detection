export * from "./alert";
export * from "./district";
export * from "./well";
export * from "./complaint";

export interface ApiResponse<T> {
  data: T;
  message?: string;
  error?: string;
}
