import { useQuery } from "@tanstack/react-query";

import { getBackendHealth } from "@/lib/api/system";

export function useBackendHealth() {
  return useQuery({
    queryKey: ["backend-health"],
    queryFn: getBackendHealth,
    retry: 1,
    staleTime: 30000,
  });
}
