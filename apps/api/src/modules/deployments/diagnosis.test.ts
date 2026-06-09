import { describe, expect, it } from "vitest";
import { diagnoseDeploymentFailure } from "./diagnosis";

describe("diagnoseDeploymentFailure", () => {
  it("classifies missing environment variables", () => {
    const result = diagnoseDeploymentFailure("Deployment requires project env vars that are not stored yet: DATABASE_URL");
    expect(result.category).toBe("missing_env_var");
    expect(result.suggestedFix).toContain("Environment variables");
  });

  it("classifies Docker build failures", () => {
    const result = diagnoseDeploymentFailure("Docker build failed. npm ERR! missing script: build");
    expect(result.category).toBe("docker_build");
  });

  it("falls back to unknown for unmatched failures", () => {
    const result = diagnoseDeploymentFailure("Something unexpected happened.");
    expect(result.category).toBe("unknown");
  });
});
