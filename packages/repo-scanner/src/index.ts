import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import type { DeploymentSuggestion } from "@awsify/deployment-schemas";
import { scanNode } from "./scanners/node.js";
import { scanPython } from "./scanners/python.js";
import { scanGo } from "./scanners/go.js";
import { scanRuby } from "./scanners/ruby.js";
import { scanJava } from "./scanners/java.js";
import { scanRust } from "./scanners/rust.js";
import { scanPhp } from "./scanners/php.js";
import type { RepoScanResult } from "./scanners/types.js";

export type { RepoScanResult } from "./scanners/types.js";

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

  // Node manifests + configs
  tryRead("package.json");
  tryRead("tsconfig.json");
  tryRead("next.config.ts") || tryRead("next.config.mjs") || tryRead("next.config.js");
  tryRead("vite.config.ts") || tryRead("vite.config.js");
  tryRead("astro.config.mjs") || tryRead("astro.config.ts");

  // Python
  tryRead("requirements.txt");
  tryRead("pyproject.toml");
  tryRead("Pipfile");

  // Go
  tryRead("go.mod");

  // Ruby
  tryRead("Gemfile");

  // Java
  tryRead("pom.xml");
  tryRead("build.gradle.kts") || tryRead("build.gradle");
  tryRead("src/main/resources/application.yml")
    || tryRead("src/main/resources/application.yaml")
    || tryRead("src/main/resources/application.properties");

  // Rust
  tryRead("Cargo.toml");

  // PHP
  tryRead("composer.json");

  // Container + env templates
  tryRead("Dockerfile");
  tryRead(".env.example") || tryRead(".env.sample") || tryRead("env.example") || tryRead(".env.template");

  // First found entry point across languages
  const entryPoints = [
    // Node / TS
    "src/index.ts", "src/main.ts", "src/server.ts", "src/app.ts",
    "index.ts", "server.ts", "app.ts",
    "src/index.js", "index.js", "server.js",
    // Python
    "main.py", "app.py", "wsgi.py", "asgi.py", "manage.py",
    // Go
    "main.go", "cmd/server/main.go",
    // Ruby
    "config.ru",
    // Rust
    "src/main.rs",
    // PHP
    "public/index.php", "index.php", "artisan"
  ];
  for (const ep of entryPoints) {
    if (tryRead(ep)) break;
  }

  return results;
}

export function scanRepository(root: string): RepoScanResult {
  const signals: string[] = [];
  const hasDockerfile = existsSync(join(root, "Dockerfile"));
  if (hasDockerfile) signals.push("Dockerfile present");

  // Order matters — first match wins. Node is checked first because mixed
  // Node + something repos (e.g. a Rails app with a package.json for asset
  // pipeline) are dominated by their actual runtime.
  if (existsSync(join(root, "package.json"))) {
    return scanNode(root, hasDockerfile, signals);
  }
  if (
    existsSync(join(root, "requirements.txt")) ||
    existsSync(join(root, "pyproject.toml")) ||
    existsSync(join(root, "Pipfile"))
  ) {
    return scanPython(root, hasDockerfile, signals);
  }
  if (existsSync(join(root, "go.mod"))) {
    return scanGo(root, hasDockerfile, signals);
  }
  if (existsSync(join(root, "Gemfile"))) {
    return scanRuby(root, hasDockerfile, signals);
  }
  if (
    existsSync(join(root, "pom.xml")) ||
    existsSync(join(root, "build.gradle")) ||
    existsSync(join(root, "build.gradle.kts"))
  ) {
    return scanJava(root, hasDockerfile, signals);
  }
  if (existsSync(join(root, "Cargo.toml"))) {
    return scanRust(root, hasDockerfile, signals);
  }
  if (existsSync(join(root, "composer.json"))) {
    return scanPhp(root, hasDockerfile, signals);
  }

  throw new Error(
    "Unsupported project type. AWS-ify currently detects Node.js, Next.js, static SPAs, Python, Go, Ruby, Java, Rust, and PHP repos. Add a recognised manifest (package.json, requirements.txt / pyproject.toml / Pipfile, go.mod, Gemfile, pom.xml / build.gradle, Cargo.toml, or composer.json) at the repo root."
  );
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

function buildServices(scan: RepoScanResult): DeploymentSuggestion["services"] {
  const services: DeploymentSuggestion["services"] = [];
  if (scan.appType === "nextjs-app" || scan.appType === "static-spa") {
    services.push("frontend");
  } else {
    services.push("backend");
  }
  if (scan.databaseRequired) services.push("database");
  if (scan.cacheRequired) services.push("cache");
  return services;
}
