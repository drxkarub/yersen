import { defineProject } from "vitest/config";

export default defineProject({
  test: { name: "scraper", passWithNoTests: true, globalSetup: ["../api/src/test/globalSetup.ts"] },
});
