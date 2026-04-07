import { useMutation } from "@tanstack/react-query";

import { scrapeUrl } from "@/lib/scrape";

export function useScrapeUrl() {
  return useMutation({
    mutationFn: scrapeUrl,
  });
}
