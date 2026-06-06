import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const IGNORED_DIRS = new Set([
  "node_modules", ".git", ".next", "dist", "build", "coverage",
  "__pycache__", ".venv", "venv", "vendor", ".turbo", ".cache",
  "target", "out", ".gradle", ".mvn", "bin", "obj"
]);

export function collectSourceFiles(root: string, extensions: string[], depth = 0): string[] {
  if (depth > 4) return [];
  let entries: string[];
  try {
    entries = readdirSync(root);
  } catch {
    return [];
  }
  const files: string[] = [];
  const extSet = new Set(extensions);

  for (const entry of entries) {
    if (IGNORED_DIRS.has(entry)) continue;
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
      if (extSet.has(ext)) files.push(path);
    }
  }

  return files;
}

export function readFileSafe(path: string): string {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return "";
  }
}
