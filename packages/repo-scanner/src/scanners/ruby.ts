import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { detectEnvVars } from "../env-vars.js";
import { resolveDatabase } from "../detectors/database.js";
import { detectHealthPath } from "../detectors/health-path.js";
import { detectPort } from "../detectors/port.js";
import type { RepoScanResult } from "./types.js";

export function scanRuby(root: string, hasDockerfile: boolean, signals: string[]): RepoScanResult {
  signals.push("Ruby project detected (Gemfile)");

  const gemfile = safeRead(join(root, "Gemfile"));
  const gems = parseGemfile(gemfile);

  const isRails = gems.has("rails");
  const isSinatra = gems.has("sinatra");
  if (isRails) signals.push("Rails detected");
  if (isSinatra) signals.push("Sinatra detected");

  const envVars = detectEnvVars(root, ["rb"]);
  const dbSignal = {
    hasPg: gems.has("pg"),
    hasMysql: gems.has("mysql2"),
    hasMongo: gems.has("mongoid") || gems.has("mongo")
  };
  const { databaseRequired, databaseEngine } = resolveDatabase(dbSignal, envVars);
  const cacheRequired = gems.has("redis") || gems.has("sidekiq") || gems.has("hiredis");

  if (databaseRequired) signals.push(`Database dependency detected (${databaseEngine ?? "unknown"})`);
  if (cacheRequired) signals.push("Redis/cache dependency detected");

  const port = detectPort(root, ["rb"]) ?? 3000;
  const healthPath = detectHealthPath(root, ["rb"]);
  const hasBundlerLock = existsSync(join(root, "Gemfile.lock"));

  const installCommand = hasBundlerLock
    ? "bundle install --jobs 4 --deployment --without development test"
    : "bundle install --jobs 4 --without development test";

  const buildCommand = isRails ? "bundle exec rake assets:precompile" : "echo 'no build step'";
  const startCommand = isRails
    ? `bundle exec rails server -b 0.0.0.0 -p ${port}`
    : isSinatra
      ? `bundle exec rackup -o 0.0.0.0 -p ${port}`
      : `bundle exec ruby app.rb`;

  return {
    root,
    packageManager: "npm",
    appType: "ruby-backend",
    computeTarget: "ecs-fargate",
    buildCommand,
    startCommand,
    installCommand,
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

function parseGemfile(content: string): Set<string> {
  const gems = new Set<string>();
  for (const m of content.matchAll(/^\s*gem\s+['"]([A-Za-z0-9_\-]+)['"]/gm)) {
    gems.add(m[1].toLowerCase());
  }
  return gems;
}

function safeRead(path: string): string {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return "";
  }
}
