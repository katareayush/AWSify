import type { DeploymentPlan, DeploymentSuggestion, GeneratedArtifact } from "@awsify/deployment-schemas";

export interface TemplateInput {
  projectId: string;
  appName: string;
  region: string;
  awsifyAccountId: string;
  externalId: string;
  suggestion: DeploymentSuggestion;
}

export function generateDockerfile(suggestion: DeploymentSuggestion): string {
  const exposedPort = suggestion.port;
  const isNext = suggestion.appType === "nextjs-app";

  return [
    "FROM node:22-alpine AS deps",
    "WORKDIR /app",
    "COPY package*.json pnpm-lock.yaml* yarn.lock* bun.lockb* ./",
    `RUN ${suggestion.installCommand}`,
    "",
    "FROM node:22-alpine AS builder",
    "WORKDIR /app",
    "COPY --from=deps /app/node_modules ./node_modules",
    "COPY . .",
    `RUN ${suggestion.buildCommand}`,
    "",
    "FROM node:22-alpine AS runner",
    "WORKDIR /app",
    "ENV NODE_ENV=production",
    isNext ? "ENV NEXT_TELEMETRY_DISABLED=1" : "",
    "COPY --from=builder /app ./",
    `EXPOSE ${exposedPort}`,
    `CMD ${toShellCommandArray(suggestion.startCommand)}`
  ]
    .filter(Boolean)
    .join("\n");
}

export function generateGithubAction(appName: string, region: string): string {
  return `name: Deploy ${appName}

on:
  workflow_dispatch:
  push:
    branches: [main]

permissions:
  contents: read
  id-token: write

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: AWSify managed deployment
        run: echo "AWSify worker performs the first approved deployment. CI/CD activation is planned after MVP validation."
        env:
          AWS_REGION: ${region}
`;
}

export function generateCloudFormationRoleTemplate(input: {
  awsifyAccountId: string;
  externalId: string;
  roleName?: string;
}): string {
  const roleName = input.roleName ?? "AWSifyDeploymentRole";

  return `AWSTemplateFormatVersion: "2010-09-09"
Description: AWSify deployment role for ECS Fargate MVP deployments.
Parameters: {}
Resources:
  AWSifyDeploymentRole:
    Type: AWS::IAM::Role
    Properties:
      RoleName: ${roleName}
      AssumeRolePolicyDocument:
        Version: "2012-10-17"
        Statement:
          - Effect: Allow
            Principal:
              AWS: arn:aws:iam::${input.awsifyAccountId}:root
            Action: sts:AssumeRole
            Condition:
              StringEquals:
                sts:ExternalId: ${input.externalId}
      Policies:
        - PolicyName: AWSifyEcsFargateMvpPolicy
          PolicyDocument:
            Version: "2012-10-17"
            Statement:
              - Effect: Allow
                Action:
                  - ecr:*
                  - ecs:*
                  - elasticloadbalancing:*
                  - logs:*
                  - iam:CreateRole
                  - iam:DeleteRole
                  - iam:GetRole
                  - iam:PassRole
                  - iam:PutRolePolicy
                  - iam:DeleteRolePolicy
                  - ec2:AuthorizeSecurityGroupIngress
                  - ec2:CreateSecurityGroup
                  - ec2:CreateTags
                  - ec2:DeleteSecurityGroup
                  - ec2:Describe*
                Resource: "*"
Outputs:
  RoleArn:
    Value: !GetAtt AWSifyDeploymentRole.Arn
`;
}

export function createDeploymentPlan(input: TemplateInput): DeploymentPlan {
  const artifacts: GeneratedArtifact[] = [
    {
      kind: "dockerfile",
      path: "Dockerfile",
      content: generateDockerfile(input.suggestion),
      summary: "Containerizes the detected Node.js or Next.js app."
    },
    {
      kind: "github-action",
      path: ".github/workflows/awsify-deploy.yml",
      content: generateGithubAction(input.appName, input.region),
      summary: "Placeholder workflow for activating CI/CD after the worker-driven first deployment."
    },
    {
      kind: "cloudformation-role",
      path: "awsify-role.yml",
      content: generateCloudFormationRoleTemplate({
        awsifyAccountId: input.awsifyAccountId,
        externalId: input.externalId
      }),
      summary: "Creates the IAM role AWSify assumes for approved deployments."
    }
  ];

  return {
    id: `plan_${input.projectId}`,
    projectId: input.projectId,
    appName: input.appName,
    region: input.region,
    suggestion: input.suggestion,
    resources: [
      { type: "ecr.repository", name: `${input.appName}-repo`, purpose: "Stores application container images." },
      { type: "ecs.cluster", name: `${input.appName}-cluster`, purpose: "Runs the Fargate service." },
      { type: "ecs.taskDefinition", name: `${input.appName}-task`, purpose: "Defines CPU, memory, image, port, and env vars." },
      { type: "ecs.service", name: `${input.appName}-service`, purpose: "Keeps the app running on Fargate." },
      { type: "elasticloadbalancingv2.loadBalancer", name: `${input.appName}-alb`, purpose: "Public HTTP entrypoint." },
      { type: "elasticloadbalancingv2.targetGroup", name: `${input.appName}-tg`, purpose: "Routes ALB traffic to ECS tasks." },
      { type: "cloudwatch.logGroup", name: `/awsify/${input.appName}`, purpose: "Captures application logs." },
      { type: "iam.role", name: `${input.appName}-task-role`, purpose: "Task execution permissions." },
      { type: "ec2.securityGroup", name: `${input.appName}-sg`, purpose: "Allows ALB and task networking." }
    ],
    artifacts,
    estimatedMonthlyCostUsd: {
      low: 20,
      high: 75,
      notes: ["Estimate covers one small Fargate service, ALB, logs, and image storage. Data transfer varies."]
    },
    requiresApproval: true,
    status: "awaiting_approval"
  };
}

function toShellCommandArray(command: string): string {
  return JSON.stringify(["sh", "-c", command]);
}
