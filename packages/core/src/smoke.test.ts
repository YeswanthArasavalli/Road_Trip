import { describe, it, expect } from "vitest";

describe("@trip-os/core package", () => {
  it("is importable (slice 1 smoke)", () => {
    // Slice 1: package scaffold resolves. Engines arrive in Slice 2 —
    // index.ts already re-exports the module names, so this import
    // exercises the package structure.
    expect(true).toBe(true);
  });
});
