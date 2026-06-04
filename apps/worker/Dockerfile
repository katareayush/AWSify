FROM node:22-bookworm-slim AS base
ENV PNPM_HOME=/root/.local/share/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /repo

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json tsconfig.base.json ./
COPY apps/worker/package.json apps/worker/
COPY packages/ai/package.json packages/ai/
COPY packages/config/package.json packages/config/
COPY packages/database/package.json packages/database/
COPY packages/deployment-schemas/package.json packages/deployment-schemas/
COPY packages/repo-scanner/package.json packages/repo-scanner/
COPY packages/pulumi-templates/package.json packages/pulumi-templates/
COPY packages/templates/package.json packages/templates/
RUN pnpm install --frozen-lockfile --filter @awsify/worker...

FROM deps AS build
COPY packages/ai packages/ai
COPY packages/config packages/config
COPY packages/database packages/database
COPY packages/deployment-schemas packages/deployment-schemas
COPY packages/repo-scanner packages/repo-scanner
COPY packages/pulumi-templates packages/pulumi-templates
COPY packages/templates packages/templates
COPY apps/worker apps/worker
RUN pnpm --filter @awsify/database prisma:generate \
 && pnpm exec turbo run build --filter=@awsify/worker...

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production
ENV PNPM_HOME=/root/.local/share/pnpm
ENV PATH=/root/.pulumi/bin:$PNPM_HOME:$PATH
RUN apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates curl git docker.io \
 && rm -rf /var/lib/apt/lists/*
RUN curl -fsSL https://get.pulumi.com | sh
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /repo
COPY --from=build /repo/pnpm-lock.yaml /repo/pnpm-workspace.yaml /repo/package.json /repo/turbo.json /repo/tsconfig.base.json ./
COPY --from=build /repo/apps/worker/package.json apps/worker/
COPY --from=build /repo/apps/worker/dist apps/worker/dist
COPY --from=build /repo/packages/ai packages/ai
COPY --from=build /repo/packages/config packages/config
COPY --from=build /repo/packages/database packages/database
COPY --from=build /repo/packages/deployment-schemas packages/deployment-schemas
COPY --from=build /repo/packages/repo-scanner packages/repo-scanner
COPY --from=build /repo/packages/pulumi-templates packages/pulumi-templates
COPY --from=build /repo/packages/templates packages/templates
RUN pnpm install --frozen-lockfile --filter @awsify/worker... --prod \
 && pnpm --filter @awsify/database prisma:generate
WORKDIR /repo/apps/worker
CMD ["node", "dist/main.js"]
