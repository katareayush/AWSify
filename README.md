# AWSify

AWSify is an AI-assisted deployment control plane for shipping a GitHub-hosted Node.js or Next.js app into a user's AWS account on ECS Fargate.

The safety rule is the product boundary:

> AI recommends. AWSify templates execute. Users approve before AWS is mutated.

## MVP Scope

- GitHub sign-in for identity.
- GitHub App installation for repository access.
- AWS account connection through a generated CloudFormation IAM role.
- Repo scanner for Node.js backend and Next.js apps.
- Bounded AI recommendation schema.
- Generated Dockerfile, GitHub Actions workflow, and infra plan preview.
- Worker-driven deployment to ECR, ECS Fargate, ALB, and CloudWatch through Pulumi Automation API.

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

No Docker installed? Use [docs/local-without-docker.md](docs/local-without-docker.md).

Frontend direction is tracked in [docs/frontend-roadmap.md](docs/frontend-roadmap.md).

Apps:

- Web: http://localhost:3000
- API: http://localhost:4000
- Worker: BullMQ process in `apps/worker`

## First Milestone

Take one Express repository, scan it, generate deployment artifacts, get user approval, create ECR/ECS/ALB/CloudWatch, and return a live URL without opening the AWS console.
