import type { DeploymentSuggestion } from "@awsify/deployment-schemas";
import { joinDockerfile } from "./shared.js";

export function goDockerfile(suggestion: DeploymentSuggestion): string {
  return joinDockerfile([
    "FROM golang:1.23-alpine AS builder",
    "WORKDIR /src",
    "COPY go.mod go.sum* ./",
    `RUN ${suggestion.installCommand}`,
    "COPY . .",
    "ENV CGO_ENABLED=0",
    // Force binary path to /app/server regardless of suggestion's go build target.
    "RUN mkdir -p /app && go build -ldflags='-s -w' -o /app/server ./...",
    "",
    // Distroless has no shell, so CMD must be exec-form pointing at the binary.
    "FROM gcr.io/distroless/static-debian12",
    "WORKDIR /app",
    "COPY --from=builder /app/server /app/server",
    `EXPOSE ${suggestion.port}`,
    'CMD ["/app/server"]'
  ]);
}
