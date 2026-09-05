import { describe, it, expect } from "vitest";
import { SEED_PACKAGE_VERSION } from "./index";

describe("@trip-os/seed-data package", () => {
  it("is importable (slice 1 smoke)", () => {
    expect(SEED_PACKAGE_VERSION).toBe("0.1.0");
  });
});
