import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(__dirname, ".."), "");
  const backendHost = env.SCRAPABLE_BACKEND_HOST || "127.0.0.1";
  const backendPort = env.SCRAPABLE_BACKEND_PORT || "8000";
  const backendTarget = `http://${backendHost}:${backendPort}`;

  return {
    envDir: "..",
    server: {
      host: "127.0.0.1",
      port: Number(env.SCRAPABLE_FRONTEND_PORT || 5173),
      hmr: {
        overlay: false,
      },
      proxy: {
        "/api": {
          target: backendTarget,
          changeOrigin: true,
        },
      },
    },
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
      dedupe: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "@tanstack/react-query",
        "@tanstack/query-core",
      ],
    },
  };
});
