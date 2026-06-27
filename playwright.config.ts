import { defineConfig } from "@playwright/test";

export default defineConfig({
  testMatch: "**/*.spec.ts",
  use: {
    baseURL: "http://localhost:3000",
  },
});
