# Product Roadmap

AWSify is moving from a single-service MVP toward a production deployment control plane. These tracks are intentionally ordered by safety and blast radius.

## 1. Infrastructure Teardown

Status: first implementation in place.

- Queue explicit teardown jobs through `POST /deployments/:id/destroy`.
- Run Pulumi destroy against the same project/stack used for deploys.
- Delete the ECR repository after stack teardown.
- Keep delete-record separate from destroy-infrastructure in the UI.

Next:

- Store Pulumi stack metadata on deployments instead of deriving it from `projectId` and `appName`.
- Add a dry-run destroy preview before queueing teardown.
- Record destroyed resource summaries in audit events.

## 2. Managed Data Services

Status: first implementation in place for RDS and ElastiCache.

- Add RDS resources when the approved suggestion requires PostgreSQL or MySQL.
- Add ElastiCache Redis when the approved suggestion requires cache.
- Inject generated database and Redis connection values into the ECS task environment.
- Include managed data resources in plan resources and cost estimates.

Next:

- Add an approval-time toggle for "bring my own DATABASE_URL" vs "provision RDS".
- Move generated passwords into ECS task secrets instead of plain container environment variables.
- Add migration/bootstrap command support for apps that need schema setup.

## 3. Custom Domains And TLS

Status: planned.

- Collect domain name, hosted zone, and certificate preference in project settings.
- Provision ACM certificates and HTTPS ALB listeners.
- Optionally create Route 53 alias records when the hosted zone is in the connected AWS account.
- Keep a manual DNS verification path for external DNS providers.

## 4. Preview Environments

Status: planned.

- Model environment types: production, branch preview, pull request preview.
- Generate isolated app names, stacks, URLs, env vars, and teardown policies per preview.
- Wire GitHub webhook events to create, update, and destroy previews.
- Add spend controls: max previews per project and automatic expiry.

## 5. Teams And Access Control

Status: planned.

- Add organizations, memberships, roles, and project ownership transfer.
- Scope repositories, AWS connections, deployments, and audit events to organizations.
- Add invite flow and role-based permissions for approve, deploy, destroy, settings, and billing.
- Preserve the current single-user path as a personal workspace.
