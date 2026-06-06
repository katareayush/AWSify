import type { DeploymentSuggestion } from "@awsify/deployment-schemas";
import { joinDockerfile, toShellArray } from "./shared.js";

export function rubyDockerfile(suggestion: DeploymentSuggestion): string {
  return joinDockerfile([
    "FROM ruby:3.3-slim",
    "WORKDIR /app",
    "ENV RAILS_ENV=production BUNDLE_DEPLOYMENT=1 BUNDLE_WITHOUT=development:test",
    "RUN apt-get update && apt-get install -y --no-install-recommends build-essential libpq-dev libyaml-dev nodejs && rm -rf /var/lib/apt/lists/*",
    "COPY Gemfile Gemfile.lock* ./",
    `RUN ${suggestion.installCommand}`,
    "COPY . .",
    `RUN ${suggestion.buildCommand} || echo 'skipping build step'`,
    `EXPOSE ${suggestion.port}`,
    `CMD ${toShellArray(suggestion.startCommand)}`
  ]);
}
