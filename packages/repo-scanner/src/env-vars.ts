import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";
import type { DeploymentSuggestion, EnvVarCategory } from "@awsify/deployment-schemas";

type EnvVar = DeploymentSuggestion["envVars"][number];

interface SourceHit {
  // True iff EVERY source reference is unguarded (no `|| default`, no `os.environ.get(..., default)`).
  // A single guarded reference is enough to demote the whole var to "guarded".
  unguarded: boolean;
  files: string[];
}

interface DeclaredVar {
  // From .env.example: only `true` when there's strong evidence — comment
  // explicitly says "required/must/mandatory", OR the line has no default
  // value AND no "optional" hint.
  required: boolean;
  description?: string;
  hasDefault: boolean;
  example?: string;
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
 * Scan a repo for env-var usage. This is now a HINT producer for the AI step,
 * not the source of truth. We deliberately err toward `required: false`:
 *
 *   required = true  ⇔  declared in .env.example with no default
 *                       (or explicit "required" comment hint)
 *                       AND used unguarded in source code.
 *
 * Anything weaker (single signal, default value present, fallback in code,
 * guarded `if (process.env.X)` access) maps to `required: false`. Claude
 * gets the final say in the AI step and can promote vars back to required
 * when it has framework-specific knowledge the regex lacks.
 */
export function detectEnvVars(root: string, sourceExtensions: string[]): EnvVar[] {
  const fromSource = scanSource(root, sourceExtensions);
  const fromDeclared = scanDeclared(root);

  const merged = new Map<string, EnvVar>();

  const finalize = (name: string, declared: DeclaredVar | undefined, hit: SourceHit | undefined): EnvVar => {
    const declaredRequired = declared?.required ?? false;
    const sourceUnguarded = hit?.unguarded ?? false;
    // Strong evidence: env.example marks it required AND source uses it unguarded.
    // A `.env.example` entry without a default is the strongest single signal,
    // so we honour it even if source isn't touched (declared-only vars).
    const required = declaredRequired && (sourceUnguarded || !hit);

    return {
      name,
      required,
      ...(declared?.description ? { description: declared.description } : {}),
      ...(declared?.example ? { example: declared.example } : {}),
      category: categorize(name)
    };
  };

  for (const [name, hit] of fromSource) {
    if (isInternal(name)) continue;
    merged.set(name, finalize(name, fromDeclared.get(name), hit));
  }

  for (const [name, declared] of fromDeclared) {
    if (merged.has(name) || isInternal(name)) continue;
    merged.set(name, finalize(name, declared, undefined));
  }

  return [...merged.values()].sort((a, b) => {
    if (a.required !== b.required) return a.required ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

function categorize(name: string): EnvVarCategory {
  const upper = name.toUpperCase();
  if (/(SECRET|TOKEN|API_KEY|PRIVATE_KEY|PASSWORD|CREDENTIAL|ACCESS_KEY)/.test(upper)) return "secret";
  if (/(DATABASE_URL|DB_URL|MONGO_URI|REDIS_URL|S3_BUCKET|SMTP_|SES_|SQS_|STRIPE_|TWILIO_|SENTRY_|OPENAI_|ANTHROPIC_|GITHUB_|GOOGLE_|AWS_)/.test(upper)) return "integration";
  if (/^(ENABLE|DISABLE|FEATURE|FF)_/.test(upper)) return "feature-flag";
  if (/^(NODE_ENV|RAILS_ENV|APP_ENV|ENV|PORT|HOST|HOSTNAME|LOG_LEVEL|TZ)$/.test(upper) || /_LOG_LEVEL$/.test(upper)) return "config";
  return "config";
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
  { regex: /os\.Getenv\(\s*['"]([A-Z_][A-Z0-9_]*)['"]\s*\)/g, group: 1 },
  // Ruby: ENV["X"] / ENV.fetch("X")
  { regex: /ENV\[\s*['"]([A-Z_][A-Z0-9_]*)['"]\s*\]/g, group: 1 },
  { regex: /ENV\.fetch\(\s*['"]([A-Z_][A-Z0-9_]*)['"]\s*(,)?/g, group: 1 },
  // Java/Spring: System.getenv("X") / @Value("${X}")
  { regex: /System\.getenv\(\s*"([A-Z_][A-Z0-9_]*)"\s*\)/g, group: 1 },
  { regex: /\$\{\s*([A-Z_][A-Z0-9_]*)\s*[:}]/g, group: 1 },
  // Rust: std::env::var("X") / env::var("X")
  { regex: /env::var\(\s*"([A-Z_][A-Z0-9_]*)"\s*\)/g, group: 1 },
  // PHP: getenv("X") / $_ENV["X"] / env("X") (Laravel)
  { regex: /getenv\(\s*['"]([A-Z_][A-Z0-9_]*)['"]\s*\)/g, group: 1 },
  { regex: /\$_ENV\[\s*['"]([A-Z_][A-Z0-9_]*)['"]\s*\]/g, group: 1 },
  { regex: /\benv\(\s*['"]([A-Z_][A-Z0-9_]*)['"]\s*(,)?/g, group: 1 }
];

function scanSource(root: string, extensions: string[]): Map<string, SourceHit> {
  // Always sweep every language we know how to scan; the per-scanner
  // `extensions` arg is now just a hint, not a hard filter.
  const exts = new Set([...extensions, "py", "go", "rb", "java", "kt", "rs", "php", "properties", "yml", "yaml"]);
  const hits = new Map<string, SourceHit>();

  for (const file of collectSourceFiles(root, exts)) {
    const content = readFileSafe(file);
    for (const { regex, group } of SOURCE_PATTERNS) {
      for (const match of content.matchAll(regex)) {
        const name = match[group];
        if (!name) continue;
        // group+1 is the "|| fallback" or "," (Python default) marker. Its
        // presence demotes this *individual* reference to "guarded".
        const guarded = Boolean(match[group + 1]) || isGuardedContext(content, match.index ?? 0, name);
        const previous = hits.get(name);
        hits.set(name, {
          // unguarded only if EVERY reference seen so far is unguarded
          unguarded: previous ? previous.unguarded && !guarded : !guarded,
          files: previous ? Array.from(new Set([...previous.files, file])) : [file]
        });
      }
    }
  }

  return hits;
}

/**
 * Cheap heuristic: is this env-var read inside an `if (process.env.X)` /
 * `if X != ""` style guard? We look at the 80 chars before the match.
 * Imperfect, but catches the most common false-positives that today force
 * users to fill bogus fields.
 */
function isGuardedContext(content: string, index: number, name: string): boolean {
  const window = content.slice(Math.max(0, index - 80), index);
  if (/\bif\s*\(\s*$/.test(window)) return true;
  if (/\bif\s+[A-Z_][A-Z0-9_]*\s*(==|!=|is\s+None|is\s+not\s+None)\s*$/.test(window)) return true;
  if (new RegExp(`\\b${name}\\s*\\?\\s*$`).test(window)) return true; // X ? a : b ternary
  return false;
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

    const hint = pendingDescription.toLowerCase();
    const explicitOptional = /\b(optional|defaults?\s+to|leave\s+blank|nullable)\b/.test(hint);
    const explicitRequired = /\b(required|must|mandatory|needed)\b/.test(hint);

    // Required only with strong evidence: explicit comment OR no default.
    // Note we no longer flip "no default" to required when the comment hints
    // optional, and we still respect "optional" comments over no-default.
    const required = explicitRequired
      ? true
      : explicitOptional
        ? false
        : !hasDefault;

    out.set(name, {
      required,
      description: pendingDescription.slice(0, 300) || undefined,
      hasDefault,
      example: hasDefault ? value.slice(0, 200) : undefined
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
