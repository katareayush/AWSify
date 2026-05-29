import type { DeploymentSuggestion } from "@awsify/deployment-schemas";

export function generateDockerfile(suggestion: DeploymentSuggestion): string {
  switch (suggestion.appType) {
    case "python-backend":
      return generatePythonDockerfile(suggestion);
    case "go-backend":
      return generateGoDockerfile(suggestion);
    case "static-site":
      return generateStaticDockerfile(suggestion);
    case "dockerfile-app":
      return "# Dockerfile already present in repository — using as-is.";
    default:
      return generateNodeDockerfile(suggestion);
  }
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

function generatePythonDockerfile(suggestion: DeploymentSuggestion): string {
  const port = suggestion.port || 8000;
  const isPoetry = suggestion.packageManager === "poetry";
  return [
    "FROM python:3.12-slim AS base",
    "WORKDIR /app",
    "ENV PYTHONDONTWRITEBYTECODE=1",
    "ENV PYTHONUNBUFFERED=1",
    "",
    isPoetry ? "RUN pip install --no-cache-dir poetry" : "",
    isPoetry ? "COPY pyproject.toml poetry.lock* ./" : "COPY requirements.txt ./",
    isPoetry ? "RUN poetry config virtualenvs.create false && poetry install --no-root --no-dev" : "RUN pip install --no-cache-dir -r requirements.txt",
    "",
    "COPY . .",
    `EXPOSE ${port}`,
    `CMD ${toShellArray(suggestion.startCommand || `uvicorn main:app --host 0.0.0.0 --port ${port}`)}`
  ]
    .filter(Boolean)
    .join("\n");
}

function generateGoDockerfile(suggestion: DeploymentSuggestion): string {
  const port = suggestion.port || 8080;
  return [
    "FROM golang:1.23-alpine AS builder",
    "WORKDIR /app",
    "COPY go.mod go.sum ./",
    "RUN go mod download",
    "COPY . .",
    "RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o server .",
    "",
    "FROM alpine:3.20",
    "RUN apk --no-cache add ca-certificates",
    "WORKDIR /root/",
    "COPY --from=builder /app/server ./",
    `EXPOSE ${port}`,
    `CMD ["./server"]`
  ].join("\n");
}

function generateStaticDockerfile(suggestion: DeploymentSuggestion): string {
  return [
    "FROM node:22-alpine AS builder",
    "WORKDIR /app",
    "COPY package*.json pnpm-lock.yaml* yarn.lock* bun.lockb* ./",
    `RUN ${suggestion.installCommand}`,
    "COPY . .",
    `RUN ${suggestion.buildCommand}`,
    "",
    "FROM nginx:alpine",
    "COPY --from=builder /app/dist /usr/share/nginx/html",
    "COPY --from=builder /app/out /usr/share/nginx/html 2>/dev/null || true",
    "EXPOSE 80",
    `CMD ["nginx", "-g", "daemon off;"]`
  ].join("\n");
}

function toShellArray(command: string): string {
  return JSON.stringify(["sh", "-c", command]);
}
