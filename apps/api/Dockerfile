FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /repo

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/
COPY packages/config/package.json packages/config/
COPY packages/database/package.json packages/database/
COPY packages/deployment-schemas/package.json packages/deployment-schemas/
COPY packages/templates/package.json packages/templates/
RUN pnpm install --frozen-lockfile --filter @awsify/api...

FROM deps AS build
COPY packages/config packages/config
COPY packages/database packages/database
COPY packages/deployment-schemas packages/deployment-schemas
COPY packages/templates packages/templates
COPY apps/api apps/api
RUN pnpm --filter @awsify/database prisma:generate \
 && pnpm exec turbo run build --filter=@awsify/api...

FROM base AS runtime
ENV NODE_ENV=production
ENV PORT=4000
WORKDIR /repo
COPY --from=build /repo/pnpm-lock.yaml /repo/pnpm-workspace.yaml /repo/package.json /repo/turbo.json /repo/tsconfig.base.json ./
COPY --from=build /repo/apps/api/package.json apps/api/
COPY --from=build /repo/apps/api/dist apps/api/dist
COPY --from=build /repo/packages/config packages/config
COPY --from=build /repo/packages/database packages/database
COPY --from=build /repo/packages/deployment-schemas packages/deployment-schemas
COPY --from=build /repo/packages/templates packages/templates
RUN pnpm install --frozen-lockfile --filter @awsify/api... --prod \
 && pnpm --filter @awsify/database prisma:generate
EXPOSE 4000
WORKDIR /repo/apps/api
CMD ["node", "dist/main.js"]
