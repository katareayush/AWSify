import type { DeploymentPlan, DeploymentSuggestion, GeneratedArtifact } from "@awsify/deployment-schemas";
import { generateDockerfile } from "./dockerfiles.js";
import { generateGithubAction } from "./github-action.js";
import { generateCloudFormationRoleTemplate } from "./iam-role.js";

export interface TemplateInput {
  projectId: string;
  appName: string;
  region: string;
  awsifyAccountId: string;
  externalId: string;
  suggestion: DeploymentSuggestion;
}

export function createDeploymentPlan(input: TemplateInput): DeploymentPlan {
  const artifacts: GeneratedArtifact[] = buildArtifacts(input);
  const resources = buildResources(input);
  const cost = estimateCost(input.suggestion);

  return {
    id: `plan_${input.projectId}`,
    projectId: input.projectId,
    appName: input.appName,
    region: input.region,
    suggestion: input.suggestion,
    resources,
    artifacts,
    estimatedMonthlyCostUsd: cost,
    requiresApproval: true,
    status: "awaiting_approval"
  };
}

function buildArtifacts(input: TemplateInput): GeneratedArtifact[] {
  const artifacts: GeneratedArtifact[] = [];

  artifacts.push({
    kind: "dockerfile",
    path: "Dockerfile",
    content: generateDockerfile(input.suggestion),
    summary: `Containerises the ${input.suggestion.appType} app.`
  });

  artifacts.push({
    kind: "github-action",
    path: ".github/workflows/awsify-deploy.yml",
    content: generateGithubAction(input.appName, input.region, input.projectId),
    summary: "Triggers an AWS-ify code redeploy for the approved plan on every push to the main branch."
  });

  artifacts.push({
    kind: "cloudformation-role",
    path: "awsify-role.yml",
    content: generateCloudFormationRoleTemplate({
      awsifyAccountId: input.awsifyAccountId,
      externalId: input.externalId
    }),
    summary: "Creates the IAM role AWSify assumes for approved deployments."
  });

  return artifacts;
}

function buildResources(input: TemplateInput): DeploymentPlan["resources"] {
  const { appName, suggestion } = input;
  const resources: DeploymentPlan["resources"] = [];

  const shared = [
    { type: "cloudwatch.logGroup" as const, name: `/awsify/${appName}`, purpose: "Captures application logs." },
    { type: "iam.role" as const, name: `${appName}-exec-role`, purpose: "Execution / task permissions." },
    { type: "ec2.securityGroup" as const, name: `${appName}-sg`, purpose: "Controls inbound / outbound traffic." }
  ];

  resources.push(
    { type: "ecr.repository", name: `${appName}-repo`, purpose: "Stores container images." },
    { type: "ecs.cluster", name: `${appName}-cluster`, purpose: "Runs the Fargate service." },
    { type: "ecs.taskDefinition", name: `${appName}-task`, purpose: "Defines CPU, memory, image, port, and env vars." },
    { type: "ecs.service", name: `${appName}-service`, purpose: "Keeps the app running on Fargate." },
    { type: "elasticloadbalancingv2.loadBalancer", name: `${appName}-alb`, purpose: "Public HTTP entrypoint." },
    { type: "elasticloadbalancingv2.targetGroup", name: `${appName}-tg`, purpose: "Routes ALB traffic to ECS tasks." },
    ...shared
  );

  if (suggestion.database.required && suggestion.database.engine !== "mongodb") {
    resources.push(
      { type: "rds.instance", name: `${appName}-db`, purpose: "Managed relational database for application data." },
      { type: "secretsmanager.secret", name: `/awsify/${appName}/db-password`, purpose: "Stores the generated database password." },
      { type: "ec2.securityGroup", name: `${appName}-db-sg`, purpose: "Allows database access from ECS tasks only." }
    );
  }

  if (suggestion.cache.required) {
    resources.push(
      { type: "elasticache.replicationGroup", name: `${appName}-redis`, purpose: "Managed Redis cache for the application." },
      { type: "ec2.securityGroup", name: `${appName}-redis-sg`, purpose: "Allows Redis access from ECS tasks only." }
    );
  }

  return resources;
}

function estimateCost(suggestion: DeploymentSuggestion): DeploymentPlan["estimatedMonthlyCostUsd"] {
  let low = 20;
  let high = 80;
  const notes: string[] = [];

  notes.push("Fargate (0.25 vCPU / 0.5 GB) + ALB + ECR + logs.");

  if (suggestion.database.required && suggestion.database.engine !== "mongodb") {
    low += 15;
    high += 55;
    notes.push("Includes a small single-AZ RDS instance and Secrets Manager database password.");
  } else if (suggestion.database.required) {
    notes.push("MongoDB was detected; AWSify does not provision MongoDB yet. Bring an external DATABASE_URL.");
  }

  if (suggestion.cache.required) {
    low += 12;
    high += 45;
    notes.push("Includes a single-node ElastiCache Redis replication group.");
  }

  return { low, high, notes };
}
