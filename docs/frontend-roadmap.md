# Frontend Roadmap

AWSify should move toward a Linear/Vercel-style control plane: compact, fast, quiet, and precise. The product should open directly into the deployment workspace, not a marketing page.

## Current Direction

- Left sidebar for product areas: deployments, repositories, connections, templates, settings.
- Top command/header area for search, branch, connection, and primary approval actions.
- Main deployment workspace with scan results, generated plan, infra graph, resources, files, env vars, and logs.
- Right rail for readiness, missing inputs, and deployment status.
- Approval gate that clearly explains what will happen before AWS is mutated.

## Next Screens To Build

1. **Sign In**
   - GitHub sign-in only for MVP.
   - Minimal centered auth panel with product mark and security copy.

2. **Connect GitHub**
   - GitHub App installation status.
   - Installed account/org list.
   - Repo permission explanation.

3. **Connect AWS**
   - CloudFormation template download/copy.
   - External ID display.
   - Role ARN input.
   - Validation result.

4. **Repository Select**
   - Searchable repo table.
   - Branch selector.
   - Supported/unsupported stack status.

5. **Scan Review**
   - Detected app type, package manager, scripts, port, env vars.
   - AI recommendation confidence and notes.
   - Manual correction controls for app type, port, build command, start command.

6. **Plan Approval**
   - Infrastructure graph.
   - Resource list.
   - Cost range.
   - Generated Dockerfile and GitHub Action previews.
   - Required env vars.

7. **Deployment Run**
   - Live worker logs.
   - Pulumi event stream.
   - ECS health state.
   - Final ALB URL and retry controls.

## Interaction Principles

- Every screen should answer: what is connected, what AWSify inferred, what will be created, and what needs approval.
- Prefer dense tables, tabs, side panels, segmented controls, and logs over decorative sections.
- Use icons for actions and recognizable infra objects.
- Keep copy short and operational.
- Never hide cost, permission, or ownership implications behind an AI summary.
