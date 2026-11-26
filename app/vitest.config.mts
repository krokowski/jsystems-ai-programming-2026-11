import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Two projects (ADR-001 §3.7):
// - unit: node environment for server code, shared lib code and integration tests
// - ui: jsdom environment for React components
export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "node",
          include: [
            "src/server/**/*.test.ts",
            "src/lib/**/*.test.ts",
            "tests/integration/**/*.test.ts",
            "tests/unit/**/*.test.ts",
          ],
          setupFiles: ["./tests/setup/unit.ts"],
          testTimeout: 20_000,
        },
      },
      {
        extends: true,
        test: {
          name: "ui",
          environment: "jsdom",
          include: ["src/components/**/*.test.tsx", "tests/components/**/*.test.tsx"],
          setupFiles: ["./tests/setup/ui.ts"],
          testTimeout: 20_000,
        },
      },
    ],
  },
});
