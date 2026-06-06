import { collectSourceFiles, readFileSafe } from "./files.js";

const CANDIDATES = ["/health", "/healthz", "/api/health", "/ready", "/status", "/ping", "/livez", "/readyz"];

export function detectHealthPath(root: string, extensions: string[]): string {
  const files = collectSourceFiles(root, extensions).slice(0, 80);
  for (const file of files) {
    const content = readFileSafe(file);
    const found = CANDIDATES.find((path) =>
      content.includes(`"${path}"`) ||
      content.includes(`'${path}'`) ||
      content.includes(`\`${path}\``)
    );
    if (found) return found;
  }
  return "/";
}
