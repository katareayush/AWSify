import type { DeploymentSuggestion } from "@awsify/deployment-schemas";
import { joinDockerfile } from "./shared.js";

export function staticSpaDockerfile(suggestion: DeploymentSuggestion): string {
  return joinDockerfile([
    "FROM node:22-alpine AS builder",
    "WORKDIR /app",
    "COPY package*.json pnpm-lock.yaml* yarn.lock* bun.lockb* ./",
    `RUN ${suggestion.installCommand}`,
    "COPY . .",
    `RUN ${suggestion.buildCommand}`,
    // Normalise common output dirs into /app/_static so the runner stage has
    // a single, predictable COPY source regardless of toolchain (Vite -> dist,
    // CRA -> build, Astro static -> dist).
    'RUN mkdir -p /app/_static && \\',
    '  if [ -d /app/dist ]; then cp -r /app/dist/. /app/_static/; \\',
    '  elif [ -d /app/build ]; then cp -r /app/build/. /app/_static/; \\',
    '  elif [ -d /app/out ]; then cp -r /app/out/. /app/_static/; \\',
    '  else echo "no build output dir found" && exit 1; fi',
    "",
    "FROM nginx:1.27-alpine AS runner",
    "COPY --from=builder /app/_static /usr/share/nginx/html",
    `EXPOSE ${suggestion.port}`,
    'CMD ["nginx", "-g", "daemon off;"]'
  ]);
}
