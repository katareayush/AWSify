import { describe, expect, it } from "vitest";

describe("worker deployment lifecycle", () => {
  it("documents the first supported state progression", () => {
    const states = ["queued", "scanning", "awaiting_approval", "deploying", "deployed", "failed"];
    expect(states).toContain("deploying");
    expect(states).toContain("failed");
  });
});
