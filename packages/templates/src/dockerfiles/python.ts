import type { DeploymentSuggestion } from "@awsify/deployment-schemas";
import { joinDockerfile, toShellArray } from "./shared.js";

export function pythonDockerfile(suggestion: DeploymentSuggestion): string {
  return joinDockerfile([
    "FROM python:3.12-slim",
    "WORKDIR /app",
    "ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1",
    "RUN apt-get update && apt-get install -y --no-install-recommends build-essential && rm -rf /var/lib/apt/lists/*",
    // Copy only manifest first for layer caching, then the rest.
    "COPY requirements*.txt pyproject.toml* Pipfile* Pipfile.lock* poetry.lock* ./",
    `RUN ${suggestion.installCommand}`,
    "COPY . .",
    `EXPOSE ${suggestion.port}`,
    `CMD ${toShellArray(suggestion.startCommand)}`
  ]);
}
