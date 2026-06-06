import type { DeploymentSuggestion } from "@awsify/deployment-schemas";
import { joinDockerfile, toShellArray } from "./shared.js";

export function nodeDockerfile(suggestion: DeploymentSuggestion): string {
  const isNext = suggestion.appType === "nextjs-app";
  return joinDockerfile([
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
    `EXPOSE ${suggestion.port}`,
    `CMD ${toShellArray(suggestion.startCommand)}`
  ]);
}
