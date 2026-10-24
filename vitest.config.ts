import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.{js,ts}"],
    exclude: ["tests/e2e/**"],
  },
});
