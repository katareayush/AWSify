# AWSify Product Design Direction

## Feel

AWSify should feel like a serious developer control plane: calm, dense enough to scan quickly, and explicit about what will happen in AWS. The closest references are Linear's crisp workspace rhythm and Vercel's deployment clarity. Avoid a marketing landing page as the primary experience. The first screen should be the deployment workspace.

## Visual System

- Use a restrained light interface with white surfaces, soft borders, dark readable text, green primary actions, and amber attention states.
- Prefer compact panels, tables, timelines, tabs, and diagrams over oversized hero sections.
- Keep cards for actual repeated objects or framed tools: repositories, resources, artifacts, and deployment events.
- Use icons for concrete actions like sign in, preview, approve, deploy, logs, and settings.
- Use React Flow for infrastructure diagrams so users can inspect the deployment shape before approval.
- Keep the navigation and page hierarchy stable so deploying a repo feels like moving through a checklist, not a wizard that hides context.

## Core Screens

1. **Onboarding**
   - GitHub sign-in.
   - Install GitHub App.
   - Generate CloudFormation role template.
   - Validate AWS role.

2. **Project Setup**
   - Repo and branch selector.
   - Supported stack detection.
   - Deploy target choice: frontend, backend, database, worker.
   - Env var capture.

3. **Plan Review**
   - Detected framework and commands.
   - Generated Dockerfile and GitHub Actions preview.
   - Infra diagram.
   - Resource list with cost range and security notes.
   - Approval gate.

4. **Deployment Run**
   - Queue state, build logs, Pulumi events, ECS health checks.
   - Final ALB URL.
   - Failure summary with retry action.

## MVP UX Rule

Every AWS mutation must be preceded by a human-readable explanation: resource, reason, cost impact, and permission boundary.
