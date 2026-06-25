# Deployment pipeline: GitHub Actions → ECR → blue-green on ECS

This document describes the deployment flow AWSify uses for an approved project:
images are built in the customer's GitHub Actions and pushed to Amazon ECR via
OIDC, environment is sourced from GitHub and delivered through AWS Secrets
Manager, and the rollout is a zero-downtime blue-green deployment driven by AWS
CodeDeploy.

## End-to-end flow

```
push to GitHub
      │
      ▼
GitHub Actions workflow (.github/workflows/awsify-deploy.yml)
  1. assume the AWSify deploy role via OIDC (no stored AWS keys)
  2. docker build + push image to ECR  (tag: <sha>-<run id>)
  3. sync GitHub secrets/vars  →  AWS Secrets Manager (/awsify/<app>/env)
  4. POST /v1/deployments/redeploy  { projectId, branch, imageUri }
      │
      ▼
AWSify worker
  5. Pulumi: ECS Fargate service (CODE_DEPLOY controller),
     ALB, blue + green target groups, CodeDeploy app/group,
     task def references the ECR image + Secrets Manager env
  6. CodeDeploy CreateDeployment → green task set starts,
     health checks, traffic cutover, blue drained
      │
      ▼
new version live (zero downtime; auto-rollback on failure)
```

## 1. OIDC setup (no long-lived AWS keys)

The GitHub Action authenticates to AWS using GitHub's OIDC provider, so no AWS
access keys are stored in the repository.

**What the CloudFormation role template provisions** (`packages/templates/src/iam-role.ts`):

- An IAM OIDC provider for `token.actions.githubusercontent.com` (client id
  `sts.amazonaws.com`). Created by default; set `CreateGitHubOidcProvider=No`
  if the account already has one.
- A trust policy on the deploy role with two statements:
  - **AWSify account** assuming the role with the external ID (existing path).
  - **GitHub OIDC**: `sts:AssumeRoleWithWebIdentity` conditioned on
    `...:aud = sts.amazonaws.com` and, when `GitHubRepo` is provided,
    `...:sub = repo:<owner>/<repo>:*` so only that repo can assume the role.
- Permissions the role needs for the full pipeline: ECR push, ECS + task sets,
  CodeDeploy, Secrets Manager (`/awsify/*`), ELB listeners/rules, CloudWatch
  Logs, `iam:PassRole` for the roles AWSify creates, and
  `iam:CreateServiceLinkedRole` for ECS / CodeDeploy / ELB.

**What the workflow does** (`aws-actions/configure-aws-credentials@v4`):

```yaml
permissions:
  id-token: write          # required to request the OIDC token
  contents: read
steps:
  - uses: aws-actions/configure-aws-credentials@v4
    with:
      role-to-assume: ${{ vars.AWSIFY_DEPLOY_ROLE_ARN }}
      aws-region: <region>
```

**Repo settings the user wires** (surfaced in the deploy screen):

| Kind     | Name                     | Value                                  |
| -------- | ------------------------ | -------------------------------------- |
| secret   | `AWSIFY_API_TOKEN`       | CI redeploy token from AWSify          |
| variable | `AWSIFY_API_URL`         | AWSify API base URL                    |
| variable | `AWSIFY_DEPLOY_ROLE_ARN` | Role ARN output by the CloudFormation stack |

## 2. Environment via GitHub → Secrets Manager

GitHub is the source of truth for environment. GitHub Actions secrets are
write-only over the API, so they cannot be read back by AWS or AWSify; instead
the workflow (the one place they are readable) bridges them into AWS:

- The workflow reads `toJSON(secrets)` + `toJSON(vars)`, drops AWSify-internal
  keys, keeps only valid env-var identifiers, and writes the result to the
  Secrets Manager secret `/awsify/<app>/env`.
- The ECS task definition references each key with a `secrets` entry
  (`valueFrom: <secret-arn>:<key>::`). Values never pass through AWSify's
  backend, and they are not visible as plaintext in the task definition.
- For one-click deploys from the AWSify UI (no GitHub Action), the worker seeds
  the same secret from the project's stored env vars, so both paths use the same
  delivery mechanism.

## 3. Blue-green configuration (zero downtime)

`packages/pulumi-templates/src/ecs-fargate.ts` + `codedeploy.ts`:

- The ECS service uses `deploymentController: { type: "CODE_DEPLOY" }`, with
  `ignoreChanges` on `taskDefinition`, `loadBalancers` and `desiredCount` so
  Pulumi provisions the infrastructure while CodeDeploy owns the rollout.
- Two target groups (`<app>-tg-blue`, `<app>-tg-green`) behind the ALB listener;
  the listener default action is also under `ignoreChanges` because CodeDeploy
  flips it during the cutover.
- A CodeDeploy application + deployment group (BLUE_GREEN,
  WITH_TRAFFIC_CONTROL), with a CodeDeploy service role and
  `autoRollbackConfiguration` on `DEPLOYMENT_FAILURE`.

**The shift** (`apps/worker/src/codedeploy.ts`):

- After Pulumi registers the new task-definition revision, the worker checks the
  service's PRIMARY task set. If it already runs the target revision (e.g. the
  first deploy), it skips; otherwise it calls `CreateDeployment` with an ECS
  AppSpec (`version: "0.0"`) pointing at the new revision.
- It polls `GetDeployment` until `Succeeded`, or throws on `Failed`/`Stopped`
  (CodeDeploy rolls back automatically). The image is tagged uniquely per build
  so every deploy produces a fresh revision and actually rolls.

## Build vs UI path summary

| Step            | GitHub Actions path        | AWSify one-click UI path        |
| --------------- | -------------------------- | ------------------------------- |
| Image build     | GitHub runner → ECR        | Worker builds → ECR             |
| Image tag       | `<sha>-<run id>`           | `<branch>-<deployment id>`      |
| Env source      | GitHub → Secrets Manager   | Project env vars → Secrets Manager |
| Rollout         | CodeDeploy blue-green      | CodeDeploy blue-green           |

## Operational notes

- Existing AWS connections created before this change must update their
  CloudFormation stack with the new role template (OIDC + CodeDeploy +
  Secrets Manager + service-linked-role permissions).
- The worker no longer needs the host Docker socket on the GitHub Actions path,
  since builds happen on GitHub runners.
