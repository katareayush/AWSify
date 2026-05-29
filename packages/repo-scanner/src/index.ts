import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import type { DeploymentSuggestion } from "@awsify/deployment-schemas";

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

  // Core project files
  tryRead("package.json");
  tryRead("tsconfig.json");
  tryRead("Dockerfile");

  // Framework configs
  tryRead("next.config.ts") || tryRead("next.config.mjs") || tryRead("next.config.js");

  // Env templates (most informative for required vars)
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
  buildCommand: string;
  startCommand: string;
  installCommand: string;
  port: number;
  hasDockerfile: boolean;
  envVars: DeploymentSuggestion["envVars"];
  databaseRequired: boolean;
  signals: string[];
}

export function scanRepository(root: string): RepoScanResult {
  const packageJsonPath = join(root, "package.json");
  if (!existsSync(packageJsonPath)) {
    throw new Error("Only repositories with a root package.json are supported in the MVP.");
  }

  const pkg = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
    scripts?: Record<string, string>;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };

  const dependencies = { ...pkg.dependencies, ...pkg.devDependencies };
  const signals: string[] = [];
  const packageManager = detectPackageManager(root);
  const isNext = Boolean(dependencies.next) || existsSync(join(root, "next.config.js")) || existsSync(join(root, "next.config.mjs"));
  const isExpress = Boolean(dependencies.express);

  if (isNext) signals.push("next dependency/config detected");
  if (isExpress) signals.push("express dependency detected");

  const envVars = findEnvVars(root);
  const databaseRequired = envVars.some((envVar) => envVar.name === "DATABASE_URL") || Boolean(dependencies.pg || dependencies.prisma || dependencies["@prisma/client"]);
  const appType = isNext ? "nextjs-app" : "node-backend";
  const buildCommand = pkg.scripts?.build ? `${packageManagerRun(packageManager)} build` : "npm run build";
  const startCommand = pkg.scripts?.start ? `${packageManagerRun(packageManager)} start` : "node server.js";
  const installCommand = packageManagerInstall(packageManager);

  return {
    root,
    packageManager,
    appType,
    buildCommand,
    startCommand,
    installCommand,
    port: detectPort(root) ?? (isNext ? 3000 : 3000),
    hasDockerfile: existsSync(join(root, "Dockerfile")),
    envVars,
    databaseRequired,
    signals
  };
}

export function scanToSuggestion(scan: RepoScanResult): DeploymentSuggestion {
  return {
    appType: scan.appType,
    services: scan.appType === "nextjs-app" ? ["frontend"] : ["backend"],
    packageManager: scan.packageManager,
    buildCommand: scan.buildCommand,
    startCommand: scan.startCommand,
    installCommand: scan.installCommand,
    port: scan.port,
    hasDockerfile: scan.hasDockerfile,
    envVars: scan.envVars,
    database: scan.databaseRequired
      ? { required: true, engine: "postgresql", note: "Detected DATABASE_URL or PostgreSQL/Prisma dependency. RDS provisioning is planned after MVP." }
      : { required: false },
    confidence: scan.signals.length > 0 ? 0.82 : 0.55,
    notes: scan.signals
  };
}

function detectPackageManager(root: string): DeploymentSuggestion["packageManager"] {
  if (existsSync(join(root, "pnpm-lock.yaml"))) return "pnpm";
  if (existsSync(join(root, "yarn.lock"))) return "yarn";
  if (existsSync(join(root, "bun.lockb"))) return "bun";
  if (existsSync(join(root, "package-lock.json"))) return "npm";
  return "npm";
}

function packageManagerRun(packageManager: DeploymentSuggestion["packageManager"]): string {
  if (packageManager === "yarn") return "yarn";
  if (packageManager === "pnpm") return "pnpm";
  if (packageManager === "bun") return "bun run";
  return "npm run";
}

function packageManagerInstall(packageManager: DeploymentSuggestion["packageManager"]): string {
  if (packageManager === "pnpm") return "corepack enable && pnpm install --frozen-lockfile";
  if (packageManager === "yarn") return "corepack enable && yarn install --frozen-lockfile";
  if (packageManager === "bun") return "bun install --frozen-lockfile";
  return "npm ci";
}

function detectPort(root: string): number | undefined {
  const files = collectSourceFiles(root);
  for (const file of files) {
    const content = readFileSync(file, "utf8");
    const match = content.match(/(?:process\.env\.PORT\s*\|\|\s*|PORT\s*=\s*)(\d{2,5})|listen\((\d{2,5})/);
    const port = Number(match?.[1] ?? match?.[2]);
    if (Number.isInteger(port) && port > 0 && port < 65536) return port;
  }
  return undefined;
}

function findEnvVars(root: string): DeploymentSuggestion["envVars"] {
  const names = new Set<string>();
  for (const file of collectSourceFiles(root)) {
    const content = readFileSync(file, "utf8");
    const matches = content.matchAll(/process\.env\.([A-Z_][A-Z0-9_]*)/g);
    for (const match of matches) names.add(match[1]);
  }

  return [...names].sort().map((name) => ({
    name,
    required: name !== "NODE_ENV" && name !== "PORT"
  }));
}

function collectSourceFiles(root: string, depth = 0): string[] {
  if (depth > 4) return [];
  const ignored = new Set(["node_modules", ".git", ".next", "dist", "build", "coverage"]);
  const entries = readdirSync(root);
  const files: string[] = [];

  for (const entry of entries) {
    if (ignored.has(entry)) continue;
    const path = join(root, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) files.push(...collectSourceFiles(path, depth + 1));
    if (stat.isFile() && /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(entry)) files.push(path);
  }

  return files;
}
