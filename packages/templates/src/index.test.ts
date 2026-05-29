import { describe, expect, it } from "vitest";
import { createDeploymentPlan } from "./index";

describe("createDeploymentPlan", () => {
  it("creates only approved MVP resource types", () => {
    const plan = createDeploymentPlan({
      projectId: "proj_1",
      appName: "demo-api",
      region: "us-east-1",
      awsifyAccountId: "123456789012",
      externalId: "external-id-123456",
      suggestion: {
        appType: "node-backend",
        services: ["backend"],
        packageManager: "npm",
        buildCommand: "npm run build",
        startCommand: "npm start",
        installCommand: "npm ci",
        port: 3000,
        hasDockerfile: false,
        envVars: [],
        database: { required: false },
        confidence: 0.9,
        notes: []
      }
    });

    expect(plan.requiresApproval).toBe(true);
    expect(plan.resources.map((resource) => resource.type)).not.toContain("lambda.function");
    expect(plan.artifacts.some((artifact) => artifact.kind === "dockerfile")).toBe(true);
  });
});
