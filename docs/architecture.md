# AWSify MVP Architecture

## Product Boundary

AWSify is a deployment control plane. It does not let AI directly create AWS resources.

1. Static scanner and AI produce a bounded `DeploymentSuggestion`.
2. API validates the suggestion with shared Zod schemas.
3. AWSify templates create a deterministic `DeploymentPlan`.
4. User approves the plan.
5. Worker executes strict Pulumi templates against an assumed AWS role.

## Local Services

- `apps/web`: Next.js interface for onboarding, repo selection, approval, and deployment status.
- `apps/api`: NestJS API for GitHub, AWS connection, projects, plans, and queueing.
- `apps/worker`: BullMQ worker for scanning, artifact generation, and deployment orchestration.
- `packages/deployment-schemas`: Shared Zod contracts.
- `packages/repo-scanner`: Node/Next repo detector.
- `packages/ai`: Anthropic Claude recommendation adapter. Missing Anthropic configuration fails loudly.
- `packages/templates`: Dockerfile, GitHub Action, CloudFormation role, and deployment plan generators.
- `packages/pulumi-templates`: ECS Fargate/ECR/ALB/CloudWatch Pulumi resources.
- `packages/database`: Prisma schema and generated client boundary.

## First Real Milestone

The first production milestone should take one Express repository and return a live ALB URL:

1. GitHub sign-in.
2. GitHub App repo selection.
3. CloudFormation IAM role connection.
4. Repo scan and suggestion.
5. User approval.
6. Worker builds image, pushes to ECR, runs Pulumi, polls ECS health, returns URL.

Custom domains, TLS, preview environments, team access controls, and multi-service deploys should wait until the ECS/RDS/Redis path and teardown workflow are reliable.
