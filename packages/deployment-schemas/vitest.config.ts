import { defineConfig } from "vitest/config";

// Stale CJS index.js sits next to index.ts in src/ (committed build artifact).
// Force vitest to prefer the TS source so tests run against the real schema.
export default defineConfig({
  resolve: {
    extensions: [".ts", ".tsx", ".mts", ".js", ".jsx", ".mjs", ".json"]
  }
});
