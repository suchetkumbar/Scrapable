import { apiBaseUrl } from "@/lib/config";

export async function apiRequest<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const response = await fetch(`${apiBaseUrl}${normalizedPath}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    let detail = `API request failed with status ${response.status}`;

    try {
      const payload = await response.json();
      if (typeof payload?.detail === "string") {
        detail = payload.detail;
      } else if (Array.isArray(payload?.detail)) {
        detail = "Request validation failed.";
      }
    } catch {
      // Fall back to the generic message when the response body is not JSON.
    }

    throw new Error(detail);
  }

  return (await response.json()) as T;
}
