import { collectSourceFiles, readFileSafe } from "./files.js";

export function detectPort(root: string, extensions: string[]): number | undefined {
  for (const file of collectSourceFiles(root, extensions)) {
    const content = readFileSafe(file);
    const match =
      content.match(/(?:process\.env\.PORT\s*\|\|\s*|PORT\s*=\s*)(\d{2,5})|listen\((\d{2,5})/) ||
      content.match(/os\.environ\.get\(['"]PORT['"],\s*['"]?(\d{2,5})/) ||
      content.match(/http\.ListenAndServe\([^,]*:(\d{2,5})/) ||
      // Spring Boot: server.port=8080
      content.match(/server\.port\s*[:=]\s*(\d{2,5})/) ||
      // Rails / generic ENV["PORT"] = 3000
      content.match(/ENV\[['"]PORT['"]\]\s*=\s*['"]?(\d{2,5})/) ||
      // Rust actix/axum: .bind("0.0.0.0:8080")
      content.match(/bind\(['"][^'"]*:(\d{2,5})['"]/) ||
      // PHP/Laravel: APP_PORT=8000
      content.match(/APP_PORT\s*=\s*(\d{2,5})/);
    const port = Number(match?.[1] ?? match?.[2]);
    if (Number.isInteger(port) && port > 0 && port < 65536) return port;
  }
  return undefined;
}
