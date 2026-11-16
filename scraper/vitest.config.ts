import { defineProject } from "vitest/config";

export default defineProject({
  test: { name: "scraper", passWithNoTests: true },
});
