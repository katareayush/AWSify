import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { detectEnvVars } from "../env-vars.js";
import { resolveDatabase } from "../detectors/database.js";
import { detectHealthPath } from "../detectors/health-path.js";
import { detectPort } from "../detectors/port.js";
import type { RepoScanResult } from "./types.js";

const PY_EXT = ["py"];

export function scanPython(root: string, hasDockerfile: boolean, signals: string[]): RepoScanResult {
  const manifest = readPythonManifest(root);
  const deps = manifest.deps;
  signals.push(`Python project detected (${manifest.source})`);

  const isDjango = deps.has("django");
  const isFlask = deps.has("flask");
  const isFastapi = deps.has("fastapi");

  if (isDjango) signals.push("Django detected");
  if (isFlask) signals.push("Flask detected");
  if (isFastapi) signals.push("FastAPI detected");

  const envVars = detectEnvVars(root, ["py"]);
  const dbSignal = {
    hasPg: deps.has("psycopg2") || deps.has("psycopg2-binary") || deps.has("psycopg") || deps.has("asyncpg"),
    hasMysql: deps.has("mysqlclient") || deps.has("pymysql") || deps.has("aiomysql"),
    hasMongo: deps.has("pymongo") || deps.has("motor")
  };
  const { databaseRequired, databaseEngine } = resolveDatabase(dbSignal, envVars);
  const cacheRequired = deps.has("redis") || deps.has("aioredis") || deps.has("celery");

  if (databaseRequired) signals.push(`Database dependency detected (${databaseEngine ?? "unknown"})`);
  if (cacheRequired) signals.push("Redis/cache dependency detected");

  const port = detectPort(root, PY_EXT) ?? (isDjango ? 8000 : isFastapi ? 8000 : 5000);
  const healthPath = detectHealthPath(root, PY_EXT);

  const installCommand = manifest.installCommand;
  const buildCommand = "python -m compileall .";
  const startCommand = pickPythonStartCommand({ isDjango, isFastapi, isFlask, port });

  return {
    root,
    packageManager: "npm", // not meaningful for Python, schema requires a value
    appType: "python-backend",
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

interface PythonManifest {
  deps: Set<string>;
  installCommand: string;
  source: "requirements.txt" | "pyproject.toml" | "Pipfile";
}

function readPythonManifest(root: string): PythonManifest {
  if (existsSync(join(root, "requirements.txt"))) {
    const content = safeRead(join(root, "requirements.txt"));
    return {
      deps: parseRequirements(content),
      installCommand: "pip install --no-cache-dir -r requirements.txt",
      source: "requirements.txt"
    };
  }
  if (existsSync(join(root, "pyproject.toml"))) {
    const content = safeRead(join(root, "pyproject.toml"));
    const usesPoetry = /\[tool\.poetry\]/.test(content);
    return {
      deps: parsePyproject(content),
      installCommand: usesPoetry
        ? "pip install poetry && poetry install --no-root --without dev"
        : "pip install --no-cache-dir .",
      source: "pyproject.toml"
    };
  }
  if (existsSync(join(root, "Pipfile"))) {
    const content = safeRead(join(root, "Pipfile"));
    return {
      deps: parsePipfile(content),
      installCommand: "pip install pipenv && pipenv install --deploy --system",
      source: "Pipfile"
    };
  }
  return { deps: new Set(), installCommand: "pip install --no-cache-dir -r requirements.txt", source: "requirements.txt" };
}

function parseRequirements(content: string): Set<string> {
  const deps = new Set<string>();
  for (const raw of content.split(/\r?\n/)) {
    const line = raw.split("#")[0].trim();
    if (!line) continue;
    const match = /^([A-Za-z0-9_.\-]+)/.exec(line);
    if (match) deps.add(match[1].toLowerCase());
  }
  return deps;
}

function parsePyproject(content: string): Set<string> {
  const deps = new Set<string>();
  // PEP 621: dependencies = ["flask", "django>=4"]
  const pep621 = content.match(/dependencies\s*=\s*\[([\s\S]*?)\]/);
  if (pep621) {
    for (const m of pep621[1].matchAll(/["']([A-Za-z0-9_.\-]+)/g)) {
      deps.add(m[1].toLowerCase());
    }
  }
  // Poetry: [tool.poetry.dependencies] then key = "version"
  const poetrySection = content.match(/\[tool\.poetry\.dependencies\]([\s\S]*?)(?:\n\[|$)/);
  if (poetrySection) {
    for (const m of poetrySection[1].matchAll(/^\s*([A-Za-z0-9_.\-]+)\s*=/gm)) {
      const name = m[1].toLowerCase();
      if (name !== "python") deps.add(name);
    }
  }
  return deps;
}

function parsePipfile(content: string): Set<string> {
  const deps = new Set<string>();
  const section = content.match(/\[packages\]([\s\S]*?)(?:\n\[|$)/);
  if (!section) return deps;
  for (const m of section[1].matchAll(/^\s*([A-Za-z0-9_.\-]+)\s*=/gm)) {
    deps.add(m[1].toLowerCase());
  }
  return deps;
}

function pickPythonStartCommand(opts: { isDjango: boolean; isFastapi: boolean; isFlask: boolean; port: number }): string {
  if (opts.isFastapi) return `uvicorn main:app --host 0.0.0.0 --port ${opts.port}`;
  if (opts.isDjango) return `gunicorn --bind 0.0.0.0:${opts.port} $(python -c "import os,glob; print(next(iter([p.split('/')[0] for p in glob.glob('*/wsgi.py')]), 'app'))").wsgi:application`;
  if (opts.isFlask) return `gunicorn --bind 0.0.0.0:${opts.port} app:app`;
  return `python main.py`;
}

function safeRead(path: string): string {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return "";
  }
}
