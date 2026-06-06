import type { DeploymentSuggestion } from "@awsify/deployment-schemas";
import { joinDockerfile } from "./shared.js";

export function rustDockerfile(suggestion: DeploymentSuggestion): string {
  // Binary path comes from the start command (`/app/<name>`).
  const binaryName = suggestion.startCommand.replace("/app/", "").trim() || "server";
  return joinDockerfile([
    "FROM rust:1-bookworm AS builder",
    "WORKDIR /src",
    "COPY Cargo.toml Cargo.lock* ./",
    "RUN mkdir -p src && echo 'fn main(){}' > src/main.rs && cargo build --release && rm -rf src",
    "COPY . .",
    `RUN ${suggestion.buildCommand}`,
    `RUN mkdir -p /app && cp target/release/${binaryName} /app/${binaryName}`,
    "",
    "FROM debian:bookworm-slim",
    "WORKDIR /app",
    "RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates && rm -rf /var/lib/apt/lists/*",
    `COPY --from=builder /app/${binaryName} /app/${binaryName}`,
    `EXPOSE ${suggestion.port}`,
    `CMD ["/app/${binaryName}"]`
  ]);
}
