import { describe, expect, it } from "vitest";
import { redactSecrets } from "./redact";

describe("redactSecrets", () => {
  it("redacts GitHub installation token in clone URL", () => {
    const input = "fatal: unable to access 'https://x-access-token:ghs_abcdef1234567890abcd@github.com/foo/bar.git/'";
    const output = redactSecrets(input);
    expect(output).not.toContain("ghs_abcdef1234567890abcd");
    expect(output).not.toContain("x-access-token");
    expect(output).toContain("https://***:***@github.com/foo/bar.git");
  });

  it("redacts standalone GitHub tokens by prefix", () => {
    const input = "token=ghp_abcdef1234567890ABCDEF1234 also github_pat_11ABCDEFGHIJKLMNOPQR_rest";
    const output = redactSecrets(input);
    expect(output).not.toContain("ghp_abcdef");
    expect(output).not.toContain("github_pat_11ABCDEFGHIJKLMNOPQR_rest");
    expect(output).toContain("***");
  });

  it("redacts Authorization bearer tokens", () => {
    const input = "Authorization: Bearer eyJhbGciOiJSUzI1NiJ9.payload.sig";
    const output = redactSecrets(input);
    expect(output).toBe("Authorization: Bearer ***");
  });

  it("redacts AWS access key ids", () => {
    const input = "creds AKIAIOSFODNN7EXAMPLE and ASIAIOSFODNN7EXAMPLE used";
    const output = redactSecrets(input);
    expect(output).not.toContain("AKIAIOSFODNN7EXAMPLE");
    expect(output).not.toContain("ASIAIOSFODNN7EXAMPLE");
  });

  it("is a no-op for clean strings", () => {
    expect(redactSecrets("clean error message")).toBe("clean error message");
  });

  it("handles empty input", () => {
    expect(redactSecrets("")).toBe("");
  });
});
