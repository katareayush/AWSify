import { readFileSync } from "node:fs";
import { join } from "node:path";
import { detectEnvVars } from "../env-vars.js";
import { resolveDatabase } from "../detectors/database.js";
import { detectHealthPath } from "../detectors/health-path.js";
import { detectPort } from "../detectors/port.js";
import type { RepoScanResult } from "./types.js";

export function scanRust(root: string, hasDockerfile: boolean, signals: string[]): RepoScanResult {
  signals.push("Rust crate detected (Cargo.toml)");

  const cargo = safeRead(join(root, "Cargo.toml"));
  const lower = cargo.toLowerCase();
  const binaryName = parseBinaryName(cargo);

  if (lower.includes("actix-web")) signals.push("actix-web detected");
  if (lower.includes("\naxum")) signals.push("axum detected");
  if (lower.includes("rocket")) signals.push("rocket detected");

  const envVars = detectEnvVars(root, ["rs"]);
  const dbSignal = {
    hasPg: /sqlx[\s\S]*postgres|tokio-postgres|diesel[\s\S]*postgres/.test(lower),
    hasMysql: /sqlx[\s\S]*mysql|mysql_async|diesel[\s\S]*mysql/.test(lower),
    hasMongo: lower.includes("mongodb")
  };
  const { databaseRequired, databaseEngine } = resolveDatabase(dbSignal, envVars);
  const cacheRequired = lower.includes("\nredis") || lower.includes("deadpool-redis");

  if (databaseRequired) signals.push(`Database dependency detected (${databaseEngine ?? "unknown"})`);
  if (cacheRequired) signals.push("Redis/cache dependency detected");

  const port = detectPort(root, ["rs"]) ?? 8080;
  const healthPath = detectHealthPath(root, ["rs"]);

  return {
    root,
    packageManager: "npm",
    appType: "rust-backend",
    computeTarget: "ecs-fargate",
    buildCommand: "cargo build --release",
    startCommand: `/app/${binaryName}`,
    installCommand: "cargo fetch",
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

function parseBinaryName(cargo: string): string {
  // Prefer [[bin]] name, then [package] name.
  const bin = cargo.match(/\[\[bin\]\][\s\S]*?name\s*=\s*"([^"]+)"/);
  if (bin) return bin[1];
  const pkg = cargo.match(/\[package\][\s\S]*?name\s*=\s*"([^"]+)"/);
  return pkg ? pkg[1] : "server";
}

function safeRead(path: string): string {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return "";
  }
}
