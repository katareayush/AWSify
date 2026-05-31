import type { DeploymentSuggestion } from "@awsify/deployment-schemas";

export function generateDockerfile(suggestion: DeploymentSuggestion): string {
  return generateNodeDockerfile(suggestion);
}

function generateNodeDockerfile(suggestion: DeploymentSuggestion): string {
  const port = suggestion.port;
  const isNext = suggestion.appType === "nextjs-app";
  return [
    "FROM node:22-alpine AS deps",
    "WORKDIR /app",
    "COPY package*.json pnpm-lock.yaml* yarn.lock* bun.lockb* ./",
    `RUN ${suggestion.installCommand}`,
    "",
    "FROM node:22-alpine AS builder",
    "WORKDIR /app",
    "COPY --from=deps /app/node_modules ./node_modules",
    "COPY . .",
    `RUN ${suggestion.buildCommand}`,
    "",
    "FROM node:22-alpine AS runner",
    "WORKDIR /app",
    "ENV NODE_ENV=production",
    isNext ? "ENV NEXT_TELEMETRY_DISABLED=1" : "",
    "COPY --from=builder /app ./",
    `EXPOSE ${port}`,
    `CMD ${toShellArray(suggestion.startCommand)}`
  ]
    .filter(line => line !== null && line !== undefined)
    .filter((line, i, arr) => !(line === "" && arr[i - 1] === ""))
    .join("\n");
}

function toShellArray(command: string): string {
  return JSON.stringify(["sh", "-c", command]);
}
