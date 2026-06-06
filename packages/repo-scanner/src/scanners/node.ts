import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { DeploymentSuggestion } from "@awsify/deployment-schemas";
import { detectEnvVars } from "../env-vars.js";
import { resolveDatabase } from "../detectors/database.js";
import { detectHealthPath } from "../detectors/health-path.js";
import { detectPort } from "../detectors/port.js";
import type { RepoScanResult } from "./types.js";

type PkgJson = {
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

export function scanNode(root: string, hasDockerfile: boolean, signals: string[]): RepoScanResult {
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as PkgJson;
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  const packageManager = detectNodePackageManager(root);

  const isNext = Boolean(deps.next)
    || existsSync(join(root, "next.config.js"))
    || existsSync(join(root, "next.config.mjs"))
    || existsSync(join(root, "next.config.ts"));
  const isExpress = Boolean(deps.express || deps.fastify || deps.koa || deps.hapi || deps["@nestjs/core"]);
  const isVite = Boolean(deps.vite) || existsSync(join(root, "vite.config.ts")) || existsSync(join(root, "vite.config.js"));
  const isAstro = Boolean(deps.astro) || existsSync(join(root, "astro.config.mjs")) || existsSync(join(root, "astro.config.ts"));
  const isCra = Boolean(deps["react-scripts"]);
  const hasServerEntry = hasServerEntryPoint(root, deps);

  const isStaticOnly = (isVite || isAstro || isCra) && !isNext && !isExpress && !hasServerEntry;
  if (isStaticOnly) {
    return scanStaticSpa(root, hasDockerfile, signals, pkg, packageManager, { isVite, isAstro, isCra });
  }

  if (isNext) signals.push("Next.js detected");
  if (isExpress) signals.push("Node backend framework detected");

  const envVars = detectEnvVars(root, ["ts", "tsx", "js", "jsx", "mjs"]);
  const dbSignal = {
    hasPg: Boolean(deps.pg || deps["@prisma/client"] || deps.prisma || deps["pg-promise"] || deps.postgres),
    hasMysql: Boolean(deps.mysql2 || deps.mysql || deps.sequelize),
    hasMongo: Boolean(deps.mongoose || deps.mongodb)
  };
  const { databaseRequired, databaseEngine } = resolveDatabase(dbSignal, envVars);
  const cacheRequired = Boolean(deps.ioredis || deps.redis || deps.bullmq || deps["@bull-board/express"]);

  if (databaseRequired) signals.push(`Database dependency detected (${databaseEngine ?? "unknown"})`);
  if (cacheRequired) signals.push("Redis/cache dependency detected");

  const pm = packageManagerRun(packageManager);
  const appType: DeploymentSuggestion["appType"] = isNext ? "nextjs-app" : "node-backend";
  const buildCommand = pkg.scripts?.build ? `${pm} build` : "npm run build";
  const startCommand = pkg.scripts?.start ? `${pm} start` : "node server.js";
  const installCommand = packageManagerInstall(packageManager);
  const port = detectPort(root, ["ts", "tsx", "js"]) ?? 3000;
  const healthPath = detectHealthPath(root, ["ts", "tsx", "js", "jsx", "mjs"]);

  return {
    root,
    packageManager,
    appType,
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

function scanStaticSpa(
  root: string,
  hasDockerfile: boolean,
  signals: string[],
  pkg: PkgJson,
  packageManager: DeploymentSuggestion["packageManager"],
  flags: { isVite: boolean; isAstro: boolean; isCra: boolean }
): RepoScanResult {
  if (flags.isVite) signals.push("Vite static SPA detected");
  if (flags.isAstro) signals.push("Astro static site detected");
  if (flags.isCra) signals.push("Create React App detected");

  const pm = packageManagerRun(packageManager);
  const envVars = detectEnvVars(root, ["ts", "tsx", "js", "jsx", "mjs"]);
  const buildCommand = pkg.scripts?.build ? `${pm} build` : `${pm} build`;
  // Nginx serves the bundle; no node start command needed.
  const startCommand = "nginx -g 'daemon off;'";

  return {
    root,
    packageManager,
    appType: "static-spa",
    computeTarget: "ecs-fargate",
    buildCommand,
    startCommand,
    installCommand: packageManagerInstall(packageManager),
    port: 80,
    healthPath: "/",
    hasDockerfile,
    envVars,
    databaseRequired: false,
    databaseEngine: undefined,
    cacheRequired: false,
    signals
  };
}

function hasServerEntryPoint(root: string, deps: Record<string, string | undefined>): boolean {
  if (deps.express || deps.fastify || deps.koa || deps.hapi || deps["@nestjs/core"]) return true;
  const entryPoints = ["src/server.ts", "src/server.js", "server.ts", "server.js", "src/main.ts", "src/main.js"];
  return entryPoints.some((ep) => existsSync(join(root, ep)));
}

function detectNodePackageManager(root: string): DeploymentSuggestion["packageManager"] {
  if (existsSync(join(root, "pnpm-lock.yaml"))) return "pnpm";
  if (existsSync(join(root, "yarn.lock"))) return "yarn";
  if (existsSync(join(root, "bun.lockb"))) return "bun";
  return "npm";
}

function packageManagerRun(pm: DeploymentSuggestion["packageManager"]): string {
  if (pm === "yarn") return "yarn";
  if (pm === "pnpm") return "pnpm";
  if (pm === "bun") return "bun run";
  return "npm run";
}

function packageManagerInstall(pm: DeploymentSuggestion["packageManager"]): string {
  if (pm === "pnpm") return "corepack enable && pnpm install --frozen-lockfile";
  if (pm === "yarn") return "corepack enable && yarn install --frozen-lockfile";
  if (pm === "bun") return "bun install --frozen-lockfile";
  return "npm ci";
}
