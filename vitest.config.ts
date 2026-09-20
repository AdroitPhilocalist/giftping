import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Mirrors tsconfig's "@/*" path alias so tests can import app modules exactly as the app does.
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./", import.meta.url)) } },
  test: { environment: "node" },
});
