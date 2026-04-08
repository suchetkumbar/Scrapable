const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();

const shouldUseDevProxy =
  import.meta.env.DEV &&
  (!configuredApiBaseUrl ||
    configuredApiBaseUrl === "http://127.0.0.1:8000/api" ||
    configuredApiBaseUrl === "http://localhost:8000/api");

export const apiBaseUrl = (
  shouldUseDevProxy ? "/api" : configuredApiBaseUrl || "http://127.0.0.1:8000/api"
).replace(/\/$/, "");
