import { describe, expect, it } from "vitest";
import { parseEnvFile } from "./env-file";

describe("parseEnvFile", () => {
  it("parses comments, export syntax, and quoted values", () => {
    const result = parseEnvFile(`
# comment
DATABASE_URL=postgres://localhost/app
export API_KEY="secret value"
FEATURE_FLAG='enabled'
`);

    expect(result.invalid).toEqual([]);
    expect(result.entries).toEqual([
      { name: "DATABASE_URL", value: "postgres://localhost/app", line: 3 },
      { name: "API_KEY", value: "secret value", line: 4 },
      { name: "FEATURE_FLAG", value: "enabled", line: 5 }
    ]);
  });

  it("reports invalid names and malformed lines", () => {
    const result = parseEnvFile("lower=value\nNO_EQUALS");
    expect(result.entries).toEqual([]);
    expect(result.invalid.map((line) => line.line)).toEqual([1, 2]);
  });
});
