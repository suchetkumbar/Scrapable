import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import App from "@/App";

describe("App", () => {
  it("renders the Phase 0 foundation view", () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          service: "Scrapable API",
          status: "ok",
          version: "0.1.0",
          api_prefix: "/api",
          timestamp: new Date().toISOString(),
          allowed_origins: ["http://127.0.0.1:5173"],
          playwright: {
            browser: "chromium",
            executable_path: "C:/playwright/chromium.exe",
            installed: true,
          },
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        }
      )
    );

    render(<App />);

    expect(screen.getByRole("heading", { name: /^scrapable$/i })).toBeInTheDocument();
    expect(screen.getByText(/phase 0 foundation ready/i)).toBeInTheDocument();
    fetchSpy.mockRestore();
  });
});
