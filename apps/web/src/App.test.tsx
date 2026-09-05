import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import App from "./App";

describe("App shell (slice 1)", () => {
  it("renders the shell without any network dependency", () => {
    render(<App />);
    expect(screen.getByText("🚗 TRIP OS")).toBeTruthy();
  });
});
