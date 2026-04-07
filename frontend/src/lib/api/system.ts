import { apiRequest } from "@/lib/api/client";

export interface BackendHealth {
  service: string;
  status: string;
  version: string;
  api_prefix: string;
  timestamp: string;
  allowed_origins: string[];
  playwright: {
    browser: string;
    executable_path: string | null;
    installed: boolean;
  };
}

export function getBackendHealth(): Promise<BackendHealth> {
  return apiRequest<BackendHealth>("/system/health");
}
