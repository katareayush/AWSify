# AWSify Environment Variables

Copy `.env.example` to `.env` for local development.

## Local Runtime

| Name | Required | Example | Notes |
| --- | --- | --- | --- |
| `NODE_ENV` | Yes | `development` | Runtime mode. |
| `APP_URL` | Yes | `http://localhost:3000` | Next.js web URL. |
| `API_URL` | Yes | `http://localhost:4000` | NestJS API URL. |
| `DATABASE_URL` | Yes | `postgresql://awsify:awsify@localhost:5432/awsify` | Prisma/Postgres connection. |
| `REDIS_URL` | Yes | `redis://localhost:6379` | BullMQ queue connection. |
| `SESSION_SECRET` | Yes | random 32+ chars | Used when first-party sessions are wired. |

## GitHub

| Name | Required | Notes |
| --- | --- | --- |
| `GITHUB_CLIENT_ID` | Yes | OAuth app client ID for GitHub sign-in. |
| `GITHUB_CLIENT_SECRET` | Yes | OAuth app client secret. |
| `GITHUB_APP_ID` | Yes | GitHub App ID for repo installation access. |
| `GITHUB_APP_SLUG` | Yes | Used to build the app install URL. |
| `GITHUB_APP_PRIVATE_KEY_BASE64` | Yes | Base64-encoded GitHub App private key. |
| `GITHUB_WEBHOOK_SECRET` | Later | Required when webhook ingestion is added. |
| `GITHUB_TOKEN` | Dev-only | Lets the worker clone private repos before GitHub App token exchange is fully wired. |

## AWSify AWS Identity

| Name | Required | Notes |
| --- | --- | --- |
| `AWSIFY_AWS_ACCOUNT_ID` | Yes | AWS account ID that users allow in their CloudFormation trust policy. |
| `AWSIFY_EXTERNAL_ID_SALT` | Yes | Salt used when deriving stable external IDs. |
| `AWS_REGION` | Yes | Default deployment region, e.g. `us-east-1`. |
| `PULUMI_CONFIG_PASSPHRASE` | Yes | Required for local Pulumi Automation API state encryption. |

## AI Providers

| Name | Required | Notes |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | Optional | Enables Claude repo-analysis recommendations. |
| `OPENAI_API_KEY` | Later | Reserved for a future OpenAI adapter. |

If `ANTHROPIC_API_KEY` is missing, the worker uses deterministic static-scan recommendations.

## Customer App Environment Variables

Customer repo env vars are not stored in `.env`. They should be captured per project/deployment plan, encrypted before persistence, and injected into ECS task definitions only after user approval.
