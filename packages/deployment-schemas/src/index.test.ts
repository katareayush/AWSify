import { describe, expect, it } from "vitest";
import { deploymentSuggestionSchema, isValidHealthPath } from "./index";

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
      healthPath: "/health",
      hasDockerfile: false,
      envVars: [{ name: "DATABASE_URL", required: true }],
      database: { required: true, engine: "postgresql" },
      confidence: 0.9,
      notes: []
    });

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.healthPath).toBe("/health");
  });

  it("defaults health path to root", () => {
    const result = deploymentSuggestionSchema.parse({
      appType: "nextjs-app",
      services: ["frontend"],
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

    expect(result.healthPath).toBe("/");
  });

  it("rejects health paths containing '..' traversal segments", () => {
    const result = deploymentSuggestionSchema.safeParse({
      appType: "node-backend",
      services: ["backend"],
      packageManager: "npm",
      buildCommand: "npm run build",
      startCommand: "npm start",
      installCommand: "npm ci",
      port: 3000,
      healthPath: "/../etc/passwd",
      hasDockerfile: false,
      envVars: [],
      database: { required: false },
      confidence: 0.8,
      notes: []
    });

    expect(result.success).toBe(false);
  });

  it("isValidHealthPath rejects traversal and bad characters", () => {
    expect(isValidHealthPath("/health")).toBe(true);
    expect(isValidHealthPath("/")).toBe(true);
    expect(isValidHealthPath("/api/v1/_status-1.json")).toBe(true);
    expect(isValidHealthPath("/..")).toBe(false);
    expect(isValidHealthPath("/foo/../bar")).toBe(false);
    expect(isValidHealthPath("/../etc/passwd")).toBe(false);
    expect(isValidHealthPath("health")).toBe(false);
    expect(isValidHealthPath("/health?x=1")).toBe(false);
    expect(isValidHealthPath("/health space")).toBe(false);
  });

  it("accepts the new env-var category + example fields", () => {
    const result = deploymentSuggestionSchema.parse({
      appType: "node-backend",
      services: ["backend"],
      packageManager: "npm",
      buildCommand: "npm run build",
      startCommand: "npm start",
      installCommand: "npm ci",
      port: 3000,
      hasDockerfile: false,
      envVars: [
        { name: "DATABASE_URL", required: true, description: "Primary Postgres connection.", example: "postgres://u:p@h/db", category: "integration" },
        { name: "FEATURE_NEW_UI", required: false, category: "feature-flag" },
        { name: "CUSTOM_THING", required: false, category: "custom" }
      ],
      database: { required: false },
      confidence: 0.8,
      notes: []
    });

    expect(result.envVars[0].example).toBe("postgres://u:p@h/db");
    expect(result.envVars[0].category).toBe("integration");
    expect(result.envVars[1].category).toBe("feature-flag");
    expect(result.envVars[2].category).toBe("custom");
  });

  it("rejects unknown env-var category values", () => {
    const result = deploymentSuggestionSchema.safeParse({
      appType: "node-backend",
      services: ["backend"],
      packageManager: "npm",
      buildCommand: "npm run build",
      startCommand: "npm start",
      installCommand: "npm ci",
      port: 3000,
      hasDockerfile: false,
      envVars: [{ name: "WAT", required: false, category: "nonsense" }],
      database: { required: false },
      confidence: 0.5,
      notes: []
    });
    expect(result.success).toBe(false);
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
