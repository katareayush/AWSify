import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { scanRepository, scanToSuggestion } from "./index";

describe("repo scanner", () => {
  it("detects an Express backend", () => {
    const root = mkdtempSync(join(tmpdir(), "awsify-express-"));
    writeFileSync(
      join(root, "package.json"),
      JSON.stringify({
        scripts: { build: "tsc", start: "node dist/index.js" },
        dependencies: { express: "^4.18.0" }
      })
    );
    writeFileSync(join(root, "server.js"), "app.listen(process.env.PORT || 8080); process.env.DATABASE_URL;");

    const suggestion = scanToSuggestion(scanRepository(root));

    expect(suggestion.appType).toBe("node-backend");
    expect(suggestion.port).toBe(8080);
    expect(suggestion.envVars.map((envVar) => envVar.name)).toContain("DATABASE_URL");
  });

  it("detects a Next.js app", () => {
    const root = mkdtempSync(join(tmpdir(), "awsify-next-"));
    writeFileSync(
      join(root, "package.json"),
      JSON.stringify({
        scripts: { build: "next build", start: "next start" },
        dependencies: { next: "^15.0.0", react: "^19.0.0" }
      })
    );

    const suggestion = scanToSuggestion(scanRepository(root));

    expect(suggestion.appType).toBe("nextjs-app");
    expect(suggestion.services).toEqual(["frontend"]);
  });
});
