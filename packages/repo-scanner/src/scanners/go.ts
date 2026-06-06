import { readFileSync } from "node:fs";
import { join } from "node:path";
import { detectEnvVars } from "../env-vars.js";
import { resolveDatabase } from "../detectors/database.js";
import { detectHealthPath } from "../detectors/health-path.js";
import { detectPort } from "../detectors/port.js";
import type { RepoScanResult } from "./types.js";

export function scanGo(root: string, hasDockerfile: boolean, signals: string[]): RepoScanResult {
  signals.push("Go module detected (go.mod)");

  const goMod = safeRead(join(root, "go.mod"));
  const deps = parseGoMod(goMod);

  const envVars = detectEnvVars(root, ["go"]);
  const dbSignal = {
    hasPg: deps.some((d) => /pgx|lib\/pq|pgconn|gorm\.io\/driver\/postgres/.test(d)),
    hasMysql: deps.some((d) => /go-sql-driver\/mysql|gorm\.io\/driver\/mysql/.test(d)),
    hasMongo: deps.some((d) => /mongo-go-driver|go\.mongodb\.org\/mongo-driver/.test(d))
  };
  const { databaseRequired, databaseEngine } = resolveDatabase(dbSignal, envVars);
  const cacheRequired = deps.some((d) => /go-redis|redigo/.test(d));

  if (databaseRequired) signals.push(`Database dependency detected (${databaseEngine ?? "unknown"})`);
  if (cacheRequired) signals.push("Redis/cache dependency detected");

  const port = detectPort(root, ["go"]) ?? 8080;
  const healthPath = detectHealthPath(root, ["go"]);

  return {
    root,
    packageManager: "npm",
    appType: "go-backend",
    computeTarget: "ecs-fargate",
    buildCommand: "go build -o /app/server ./...",
    startCommand: "/app/server",
    installCommand: "go mod download",
    port,
    healthPath,
    hasDockerfile,
    envVars,
    databaseRequired,
    databaseEngine,
    cacheRequired,
    signals
  };
}

function parseGoMod(content: string): string[] {
  const deps: string[] = [];
  for (const raw of content.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("//")) continue;
    const m = /^(?:require\s+)?([a-zA-Z0-9._\-/]+)\s+v/.exec(line);
    if (m) deps.push(m[1]);
  }
  return deps;
}

function safeRead(path: string): string {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return "";
  }
}
