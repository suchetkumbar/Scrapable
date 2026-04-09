import { useMutation } from "@tanstack/react-query";

import { startScrapeJob, type StartScrapeJobInput } from "@/lib/scrape";

export function useScrapeJob() {
  return useMutation({
    mutationFn: (payload: StartScrapeJobInput) => startScrapeJob(payload),
  });
}
