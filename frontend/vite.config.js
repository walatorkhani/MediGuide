import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.js",
    globals: true,
    css: true,
    // Exclut les specs Playwright (exécutées séparément via `npm run test:e2e`) :
    // sans ça, Vitest tente de les charger et échoue sur `test.describe` async.
    exclude: ["**/node_modules/**", "**/e2e/**", "**/playwright.config.js"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      thresholds: {
        lines: 70,
        functions: 70,
        statements: 70,
        branches: 60,
      },
    },
  },
});
