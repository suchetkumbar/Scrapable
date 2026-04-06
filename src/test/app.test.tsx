import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "@/App";

describe("App", () => {
  it("renders the main landing view", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", { name: /scrape smarter/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/web intelligence platform/i)).toBeInTheDocument();
  });
});
