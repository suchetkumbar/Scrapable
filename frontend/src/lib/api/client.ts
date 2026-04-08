import { apiBaseUrl } from "@/lib/config";

export async function apiRequest<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  let response: Response;

  try {
    response = await fetch(`${apiBaseUrl}${normalizedPath}`, {
      ...init,
      headers: {
        Accept: "application/json",
        ...init?.headers,
      },
    });
  } catch (error) {
    throw new Error(
      "Could not reach the backend API. Check that the backend is running, then retry and inspect the backend terminal for scrape errors.",
      { cause: error }
    );
  }

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
