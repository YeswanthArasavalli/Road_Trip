import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["packages/*/src/**/*.test.ts", "apps/web/src/**/*.test.{ts,tsx}"],
    environment: "node",
    // React component tests run in jsdom; pure engine tests stay in node.
    environmentMatchGlobs: [["apps/web/src/**/*.test.tsx", "jsdom"]],
  },
});
