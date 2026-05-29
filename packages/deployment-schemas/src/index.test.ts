import { describe, expect, it } from "vitest";
import { deploymentSuggestionSchema } from "./index";

describe("deploymentSuggestionSchema", () => {
  it("accepts a bounded Node.js backend suggestion", () => {
    const result = deploymentSuggestionSchema.safeParse({
      appType: "node-backend",
      services: ["backend"],
      packageManager: "npm",
      buildCommand: "npm run build",
      startCommand: "npm start",
      installCommand: "npm ci",
      port: 3000,
      hasDockerfile: false,
      envVars: [{ name: "DATABASE_URL", required: true }],
      database: { required: true, engine: "postgresql" },
      confidence: 0.9,
      notes: []
    });

    expect(result.success).toBe(true);
  });

  it("rejects unsupported AWS resources disguised as services", () => {
    const result = deploymentSuggestionSchema.safeParse({
      appType: "node-backend",
      services: ["lambda"],
      packageManager: "npm",
      buildCommand: "npm run build",
      startCommand: "npm start",
      installCommand: "npm ci",
      port: 3000,
      hasDockerfile: false,
      envVars: [],
      database: { required: false },
      confidence: 0.8,
      notes: []
    });

    expect(result.success).toBe(false);
  });
});
