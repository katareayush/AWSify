import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import type { ComputeTarget, DeploymentSuggestion } from "@awsify/deployment-schemas";

export interface KeyFile {
  path: string;
  content: string;
}

const KEY_FILE_MAX_CHARS = 4000;

export function collectKeyFiles(root: string): KeyFile[] {
  const results: KeyFile[] = [];

  const tryRead = (relPath: string): boolean => {
    const full = join(root, relPath);
    if (!existsSync(full)) return false;
    try {
      if (!statSync(full).isFile()) return false;
      results.push({ path: relPath, content: readFileSync(full, "utf8").slice(0, KEY_FILE_MAX_CHARS) });
      return true;
    } catch {
      return false;
    }
  };

  // Node.js projects
  tryRead("package.json");
  tryRead("tsconfig.json");

  // Container
  tryRead("Dockerfile");

  // Framework configs
  tryRead("next.config.ts") || tryRead("next.config.mjs") || tryRead("next.config.js");

  // Env templates
  tryRead(".env.example") || tryRead(".env.sample") || tryRead("env.example") || tryRead(".env.template");

  // First found entry point
  const entryPoints = [
    "src/index.ts", "src/main.ts", "src/server.ts", "src/app.ts",
    "index.ts", "server.ts", "app.ts",
    "src/index.js", "index.js", "server.js"
  ];
  for (const ep of entryPoints) {
    if (tryRead(ep)) break;
  }

  return results;
}

export interface RepoScanResult {
  root: string;
  packageManager: DeploymentSuggestion["packageManager"];
  appType: DeploymentSuggestion["appType"];
  computeTarget: ComputeTarget;
  buildCommand: string;
  startCommand: string;
  installCommand: string;
  port: number;
  healthPath: string;
  hasDockerfile: boolean;
  envVars: DeploymentSuggestion["envVars"];
  databaseRequired: boolean;
  databaseEngine: "postgresql" | "mysql" | "mongodb" | undefined;
  cacheRequired: boolean;
  signals: string[];
}

export function scanRepository(root: string): RepoScanResult {
  const signals: string[] = [];
  const hasDockerfile = existsSync(join(root, "Dockerfile"));

  const hasPackageJson = existsSync(join(root, "package.json"));

  if (hasDockerfile) signals.push("Dockerfile present");

  if (hasPackageJson) return scanNode(root, hasDockerfile, signals);

  throw new Error("Unsupported project type. MVP currently requires a Node.js or Next.js repo with package.json.");
}

function scanNode(root: string, hasDockerfile: boolean, signals: string[]): RepoScanResult {
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as {
    scripts?: Record<string, string>;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };

  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  const packageManager = detectNodePackageManager(root);

  const isNext = Boolean(deps.next) || existsSync(join(root, "next.config.js")) || existsSync(join(root, "next.config.mjs")) || existsSync(join(root, "next.config.ts"));
  const isExpress = Boolean(deps.express);
  const isVite = Boolean(deps.vite) || existsSync(join(root, "vite.config.ts")) || existsSync(join(root, "vite.config.js"));
  const isAstro = Boolean(deps.astro) || existsSync(join(root, "astro.config.mjs"));
  const isCra = Boolean(deps["react-scripts"]);

  const isStaticOnly = (isVite || isAstro || isCra) && !isNext && !isExpress && !hasServerEntryPoint(root, deps);
  if (isStaticOnly) {
    throw new Error("Static-only frontend repos are not supported in the ECS Fargate MVP yet. Select a Next.js app or Node.js backend.");
  }

  if (isNext) signals.push("Next.js detected");
  if (isExpress) signals.push("Express detected");

  const envVars = findEnvVars(root, ["ts", "tsx", "js", "jsx", "mjs"]);
  const { databaseRequired, databaseEngine } = detectDatabase(deps, envVars);
  const cacheRequired = detectRedis(deps);

  if (databaseRequired) signals.push(`Database dependency detected (${databaseEngine ?? "unknown"})`);
  if (cacheRequired) signals.push("Redis/cache dependency detected");

  const pm = packageManagerRun(packageManager);
  const appType = isNext ? "nextjs-app" : "node-backend";
  const computeTarget: ComputeTarget = "ecs-fargate";
  const buildCommand = pkg.scripts?.build ? `${pm} build` : "npm run build";
  const startCommand = pkg.scripts?.start ? `${pm} start` : "node server.js";
  const installCommand = packageManagerInstall(packageManager);
  const port = detectPort(root, ["ts", "tsx", "js"]) ?? (isNext ? 3000 : 3000);
  const healthPath = detectHealthPath(root, ["ts", "tsx", "js", "jsx", "mjs"]);

  return {
    root,
    packageManager,
    appType,
    computeTarget,
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

export function scanToSuggestion(scan: RepoScanResult): DeploymentSuggestion {
  return {
    appType: scan.appType,
    computeTarget: scan.computeTarget,
    services: buildServices(scan),
    packageManager: scan.packageManager,
    buildCommand: scan.buildCommand,
    startCommand: scan.startCommand,
    installCommand: scan.installCommand,
    port: scan.port,
    healthPath: scan.healthPath,
    hasDockerfile: scan.hasDockerfile,
    envVars: scan.envVars,
    database: scan.databaseRequired
      ? { required: true, engine: scan.databaseEngine, note: "Detected database dependency. RDS will be provisioned." }
      : { required: false },
    cache: scan.cacheRequired
      ? { required: true, note: "Detected Redis dependency. ElastiCache will be provisioned." }
      : { required: false },
    confidence: scan.signals.length >= 2 ? 0.82 : 0.55,
    notes: scan.signals
  };
}

// --- helpers ---

function buildServices(scan: RepoScanResult): DeploymentSuggestion["services"] {
  const services: DeploymentSuggestion["services"] = [];
  if (scan.appType === "nextjs-app") services.push("frontend");
  else services.push("backend");
  if (scan.databaseRequired) services.push("database");
  if (scan.cacheRequired) services.push("cache");
  return services;
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

function detectDatabase(
  deps: Record<string, string | undefined>,
  envVars: DeploymentSuggestion["envVars"]
): { databaseRequired: boolean; databaseEngine: "postgresql" | "mysql" | "mongodb" | undefined } {
  const hasPg = Boolean(deps.pg || deps["@prisma/client"] || deps.prisma);
  const hasMysql = Boolean(deps.mysql2);
  const hasMongo = Boolean(deps.mongoose || deps.mongodb);
  const hasDbUrl = envVars.some(v => v.name === "DATABASE_URL");

  const databaseRequired = hasPg || hasMysql || hasMongo || hasDbUrl;
  const databaseEngine = hasPg ? "postgresql" : hasMysql ? "mysql" : hasMongo ? "mongodb" : undefined;
  return { databaseRequired, databaseEngine };
}

function detectRedis(deps: Record<string, string | undefined>): boolean {
  return Boolean(deps.ioredis || deps.redis || deps.bullmq || deps["@bull-board/express"]);
}

function detectHealthPath(root: string, extensions: string[]): string {
  const files = collectSourceFiles(root, extensions).slice(0, 60);
  const candidates = ["/health", "/healthz", "/api/health", "/ready", "/status"];
  for (const file of files) {
    const content = readFileSafe(file);
    const found = candidates.find((path) =>
      content.includes(`"${path}"`) ||
      content.includes(`'${path}'`) ||
      content.includes(`\`${path}\``)
    );
    if (found) return found;
  }
  return "/";
}

function hasServerEntryPoint(root: string, deps: Record<string, string | undefined>): boolean {
  if (deps.express || deps.fastify || deps.koa || deps.hapi) return true;
  const entryPoints = ["src/server.ts", "src/server.js", "server.ts", "server.js", "src/main.ts", "src/main.js"];
  return entryPoints.some(ep => existsSync(join(root, ep)));
}

function detectPort(root: string, extensions: string[]): number | undefined {
  for (const file of collectSourceFiles(root, extensions)) {
    const content = readFileSafe(file);
    const match = content.match(/(?:process\.env\.PORT\s*\|\|\s*|PORT\s*=\s*)(\d{2,5})|listen\((\d{2,5})/) ||
                  content.match(/os\.environ\.get\(['"]PORT['"],\s*['"]?(\d{2,5})/) ||
                  content.match(/http\.ListenAndServe\([^,]*:(\d{2,5})/);
    const port = Number(match?.[1] ?? match?.[2]);
    if (Number.isInteger(port) && port > 0 && port < 65536) return port;
  }
  return undefined;
}

function findEnvVars(root: string, extensions: string[]): DeploymentSuggestion["envVars"] {
  const names = new Set<string>();
  const patterns = [
    /process\.env\.([A-Z_][A-Z0-9_]*)/g,
    /os\.environ\.get\(['"]([A-Z_][A-Z0-9_]*)['"]/g,
    /os\.environ\[['"]([A-Z_][A-Z0-9_]*)['"]\]/g,
    /os\.Getenv\(['"]([A-Z_][A-Z0-9_]*)['"]\)/g
  ];

  for (const file of collectSourceFiles(root, extensions)) {
    const content = readFileSafe(file);
    for (const pattern of patterns) {
      for (const match of content.matchAll(pattern)) names.add(match[1]);
    }
  }

  return [...names].sort().map(name => ({
    name,
    required: name !== "NODE_ENV" && name !== "PORT"
  }));
}

function collectSourceFiles(root: string, extensions: string[], depth = 0): string[] {
  if (depth > 4) return [];
  const ignored = new Set(["node_modules", ".git", ".next", "dist", "build", "coverage", "__pycache__", ".venv", "vendor"]);
  let entries: string[];
  try {
    entries = readdirSync(root);
  } catch {
    return [];
  }
  const files: string[] = [];
  const extSet = new Set(extensions);

  for (const entry of entries) {
    if (ignored.has(entry)) continue;
    const path = join(root, entry);
    let stat;
    try {
      stat = statSync(path);
    } catch {
      continue;
    }
    if (stat.isDirectory()) files.push(...collectSourceFiles(path, extensions, depth + 1));
    if (stat.isFile()) {
      const ext = entry.split(".").pop() ?? "";
      if (extSet.has(ext)) files.push(path);
    }
  }

  return files;
}

function readFileSafe(path: string): string {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return "";
  }
}
