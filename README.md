# AWS-ify

AWS-ify is an AI-assisted deployment control plane for shipping a GitHub-hosted Node.js or Next.js app into a user's AWS account on ECS Fargate.

The safety rule is the product boundary:

> AI recommends. AWS-ify templates execute. Users approve before AWS is mutated.

## MVP Scope

- GitHub sign-in for identity.
- GitHub App installation for repository access.
- AWS account connection through a generated CloudFormation IAM role.
- Repo scanner for Node.js backend and Next.js apps.
- Bounded AI recommendation schema.
- Generated Dockerfile, GitHub Actions workflow, and infra plan preview.
- Worker-driven deployment to ECR, ECS Fargate, ALB, and CloudWatch through Pulumi Automation API.
- GitHub Actions redeploy for already-approved infrastructure.

## Local Setup

```bash
pnpm install
cp .env.example .env
docker compose up -d
pnpm db:generate
pnpm db:migrate
pnpm dev
```

Use [.env.example](.env.example) as the environment checklist.

GitHub App setup URL:

```text
http://localhost:4000/v1/github/app/callback
```

For production, use your deployed API URL with the same path.

After the first approved deployment, generate a CI token from the deployment detail page and add these to the customer repo:

- Secret: `AWSIFY_API_TOKEN`
- Variable: `AWSIFY_API_URL`, for example `http://localhost:4000` locally or your production API origin

No Docker installed? Use [docs/local-without-docker.md](docs/local-without-docker.md).

Frontend direction is tracked in [docs/frontend-roadmap.md](docs/frontend-roadmap.md).

Apps:

- Web: http://localhost:3000
- API: http://localhost:4000
- Worker: BullMQ process in `apps/worker`

## First Milestone

Take one Express repository, scan it, generate deployment artifacts, get user approval, create ECR/ECS/ALB/CloudWatch, and return a live URL without opening the AWS console.

## Launch Checklist

1. Fill every required value in `.env`, especially GitHub OAuth, GitHub App, Anthropic, AWS account, Pulumi, and encryption secrets.
2. Start PostgreSQL and Redis with `docker compose up -d`.
3. Run `pnpm db:generate` and `pnpm db:migrate`.
4. Start web, API, and worker with `pnpm dev`.
5. Sign in, install the GitHub App, refresh repositories, connect AWS, select a Node/Next repo, save env vars, approve, deploy.
