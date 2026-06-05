import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";
import type { DeploymentSuggestion } from "@awsify/deployment-schemas";

type EnvVar = DeploymentSuggestion["envVars"][number];

interface SourceHit {
  required: boolean;          // inferred from source: bare process.env.X ⇒ required, with `|| "..."` ⇒ optional
  files: string[];            // for debugging / hover-help (not yet surfaced in UI)
}

interface DeclaredVar {
  required: boolean;          // from .env.example: comment hint or "VAR=" with no default
  description?: string;       // comment text above or after the var
  hasDefault: boolean;        // if .env.example has VAR=somevalue, treat as optional unless commented otherwise
}

// Vars we never want to surface — internal to Node, npm, build toolchains, CI.
const INTERNAL_DENYLIST = new Set([
  "NODE_ENV",
  "NODE_OPTIONS",
  "NODE_PATH",
  "NODE_TLS_REJECT_UNAUTHORIZED",
  "PORT",
  "HOSTNAME",
  "HOME",
  "PATH",
  "PWD",
  "USER",
  "SHELL",
  "TERM",
  "CI",
  "DEBUG",
  "TZ",
  "LANG",
  "LC_ALL"
]);

const INTERNAL_PREFIXES = ["npm_", "NPM_", "VERCEL_", "NEXT_RUNTIME", "TURBO_", "VSCODE_", "GITHUB_ACTIONS"];

function isInternal(name: string): boolean {
  if (INTERNAL_DENYLIST.has(name)) return true;
  return INTERNAL_PREFIXES.some((prefix) => name.startsWith(prefix));
}

/**
 * Scan a repo for env-var usage. Merges source-code findings with .env.example
 * declarations. Source code is authoritative for "is this var even referenced?";
 * .env.example is authoritative for "is it required, and what's it for?".
 */
export function detectEnvVars(root: string, sourceExtensions: string[]): EnvVar[] {
  const fromSource = scanSource(root, sourceExtensions);
  const fromDeclared = scanDeclared(root);

  const merged = new Map<string, EnvVar>();

  for (const [name, hit] of fromSource) {
    if (isInternal(name)) continue;
    const declared = fromDeclared.get(name);
    merged.set(name, {
      name,
      required: declared ? declared.required : hit.required,
      ...(declared?.description ? { description: declared.description } : {})
    });
  }

  // declared-only vars: documented intent, keep even if not yet referenced in code
  for (const [name, declared] of fromDeclared) {
    if (merged.has(name) || isInternal(name)) continue;
    merged.set(name, {
      name,
      required: declared.required,
      ...(declared.description ? { description: declared.description } : {})
    });
  }

  return [...merged.values()].sort((a, b) => {
    if (a.required !== b.required) return a.required ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

// --- source-code scanning ----------------------------------------------------

const SOURCE_PATTERNS: Array<{ regex: RegExp; group: number }> = [
  // JS/TS: process.env.X — with optional fallback after it
  { regex: /process\.env\.([A-Z_][A-Z0-9_]*)\s*(\|\|)?/g, group: 1 },
  // JS/TS: process.env["X"] / process.env['X']
  { regex: /process\.env\[\s*['"]([A-Z_][A-Z0-9_]*)['"]\s*\]\s*(\|\|)?/g, group: 1 },
  // Python: os.environ.get("X", "default")  — second arg means optional
  { regex: /os\.environ\.get\(\s*['"]([A-Z_][A-Z0-9_]*)['"]\s*(,)?/g, group: 1 },
  // Python: os.environ["X"]
  { regex: /os\.environ\[\s*['"]([A-Z_][A-Z0-9_]*)['"]\s*\]/g, group: 1 },
  // Python: os.getenv("X", "default")
  { regex: /os\.getenv\(\s*['"]([A-Z_][A-Z0-9_]*)['"]\s*(,)?/g, group: 1 },
  // Go: os.Getenv("X")
  { regex: /os\.Getenv\(\s*['"]([A-Z_][A-Z0-9_]*)['"]\s*\)/g, group: 1 }
];

function scanSource(root: string, extensions: string[]): Map<string, SourceHit> {
  const exts = new Set([...extensions, "py", "go"]); // always include Python / Go too
  const hits = new Map<string, SourceHit>();

  for (const file of collectSourceFiles(root, exts)) {
    const content = readFileSafe(file);
    for (const { regex, group } of SOURCE_PATTERNS) {
      for (const match of content.matchAll(regex)) {
        const name = match[group];
        if (!name) continue;
        // The second capture group is "|| fallback" or "," (Python default) presence.
        const hasFallback = Boolean(match[group + 1]);
        const previous = hits.get(name);
        hits.set(name, {
          required: previous ? previous.required && !hasFallback : !hasFallback,
          files: previous ? Array.from(new Set([...previous.files, file])) : [file]
        });
      }
    }
  }

  return hits;
}

// --- .env.example parsing ----------------------------------------------------

const DECLARED_FILENAMES = [".env.example", ".env.sample", ".env.template", ".env.dist"];

function scanDeclared(root: string): Map<string, DeclaredVar> {
  const declared = new Map<string, DeclaredVar>();

  for (const filename of DECLARED_FILENAMES) {
    const path = join(root, filename);
    if (!existsSync(path)) continue;
    parseEnvFile(readFileSafe(path), declared);
  }

  return declared;
}

function parseEnvFile(content: string, out: Map<string, DeclaredVar>): void {
  const lines = content.split(/\r?\n/);
  let pendingDescription = "";

  for (const raw of lines) {
    const line = raw.trim();

    if (!line) {
      pendingDescription = "";
      continue;
    }

    if (line.startsWith("#")) {
      // accumulate adjacent comment lines as the description for the next var
      const text = line.replace(/^#+\s*/, "").trim();
      pendingDescription = pendingDescription ? `${pendingDescription} ${text}` : text;
      continue;
    }

    const match = /^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!match) {
      pendingDescription = "";
      continue;
    }

    const [, name, rawValue] = match;
    const value = rawValue.trim().replace(/^["']|["']$/g, "");
    const hasDefault = value.length > 0;

    // Required by default. Optional if the description hints so, or if a default value is supplied.
    const hint = pendingDescription.toLowerCase();
    const explicitOptional = /\b(optional|defaults?\s+to|leave\s+blank)\b/.test(hint);
    const explicitRequired = /\b(required|must|mandatory)\b/.test(hint);

    out.set(name, {
      required: explicitRequired ? true : explicitOptional || hasDefault ? false : true,
      description: pendingDescription.slice(0, 300) || undefined,
      hasDefault
    });

    pendingDescription = "";
  }
}

// --- file walking ------------------------------------------------------------

function collectSourceFiles(root: string, extensions: Set<string>, depth = 0): string[] {
  if (depth > 4) return [];
  const ignored = new Set([
    "node_modules", ".git", ".next", "dist", "build", "coverage",
    "__pycache__", ".venv", "venv", "vendor", ".turbo", ".cache"
  ]);
  let entries: string[];
  try {
    entries = readdirSync(root);
  } catch {
    return [];
  }
  const files: string[] = [];

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
    else if (stat.isFile()) {
      const ext = entry.split(".").pop() ?? "";
      if (extensions.has(ext)) files.push(path);
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
