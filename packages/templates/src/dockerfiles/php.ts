import type { DeploymentSuggestion } from "@awsify/deployment-schemas";
import { joinDockerfile, toShellArray } from "./shared.js";

export function phpDockerfile(suggestion: DeploymentSuggestion): string {
  return joinDockerfile([
    "FROM composer:2 AS vendor",
    "WORKDIR /app",
    "COPY composer.json composer.lock* ./",
    `RUN ${suggestion.installCommand} --no-scripts --no-autoloader`,
    "",
    "FROM php:8.3-cli",
    "WORKDIR /app",
    "RUN apt-get update && apt-get install -y --no-install-recommends libpq-dev libzip-dev unzip && \\",
    "  docker-php-ext-install pdo pdo_pgsql pdo_mysql zip && \\",
    "  rm -rf /var/lib/apt/lists/*",
    "COPY --from=vendor /app/vendor ./vendor",
    "COPY . .",
    "RUN composer dump-autoload --optimize",
    `RUN ${suggestion.buildCommand}`,
    `EXPOSE ${suggestion.port}`,
    `CMD ${toShellArray(suggestion.startCommand)}`
  ]);
}
