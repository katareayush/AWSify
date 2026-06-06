import { readFileSync } from "node:fs";
import { join } from "node:path";
import { detectEnvVars } from "../env-vars.js";
import { resolveDatabase } from "../detectors/database.js";
import { detectHealthPath } from "../detectors/health-path.js";
import { detectPort } from "../detectors/port.js";
import type { RepoScanResult } from "./types.js";

export function scanPhp(root: string, hasDockerfile: boolean, signals: string[]): RepoScanResult {
  signals.push("PHP project detected (composer.json)");

  const composer = safeReadJson(join(root, "composer.json"));
  const deps = {
    ...(composer.require ?? {}),
    ...(composer["require-dev"] ?? {})
  } as Record<string, string>;
  const depNames = new Set(Object.keys(deps).map((k) => k.toLowerCase()));

  const isLaravel = depNames.has("laravel/framework");
  const isSymfony = depNames.has("symfony/framework-bundle") || depNames.has("symfony/symfony");
  if (isLaravel) signals.push("Laravel detected");
  if (isSymfony) signals.push("Symfony detected");

  const envVars = detectEnvVars(root, ["php"]);
  const dbSignal = {
    hasPg: hasExt(depNames, "pgsql") || hasExt(depNames, "pdo_pgsql") || depNames.has("doctrine/dbal"),
    hasMysql: hasExt(depNames, "mysql") || hasExt(depNames, "pdo_mysql") || hasExt(depNames, "mysqli"),
    hasMongo: depNames.has("mongodb/mongodb")
  };
  const { databaseRequired, databaseEngine } = resolveDatabase(dbSignal, envVars);
  const cacheRequired = depNames.has("predis/predis") || hasExt(depNames, "redis");

  if (databaseRequired) signals.push(`Database dependency detected (${databaseEngine ?? "unknown"})`);
  if (cacheRequired) signals.push("Redis/cache dependency detected");

  const port = detectPort(root, ["php"]) ?? 8080;
  const healthPath = detectHealthPath(root, ["php"]);

  const installCommand = "composer install --no-dev --optimize-autoloader --no-interaction";
  const buildCommand = isLaravel
    ? "php artisan config:cache && php artisan route:cache"
    : "echo 'no build step'";
  const startCommand = isLaravel
    ? `php artisan serve --host=0.0.0.0 --port=${port}`
    : `php -S 0.0.0.0:${port} -t public`;

  return {
    root,
    packageManager: "npm",
    appType: "php-backend",
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

function hasExt(deps: Set<string>, name: string): boolean {
  return deps.has(`ext-${name}`);
}

function safeReadJson(path: string): { require?: Record<string, string>; "require-dev"?: Record<string, string> } {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return {};
  }
}
