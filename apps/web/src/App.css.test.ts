import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Slice 1 acceptance: the app shell must have zero network dependencies.
// Static check: no fetch/XHR calls in the web app source.
describe("offline shell purity (slice 1)", () => {
  const srcDir = resolve(__dirname, ".");
  const files = ["App.tsx", "main.tsx"];

  it("contains no fetch/XHR calls in the shell", () => {
    for (const f of files) {
      const content = readFileSync(resolve(srcDir, f), "utf-8");
      expect(content.includes("fetch(")).toBe(false);
      expect(content.includes("XMLHttpRequest")).toBe(false);
    }
  });
});
