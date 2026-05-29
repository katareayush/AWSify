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

  if (input.suggestion.appType !== "dockerfile-app") {
    artifacts.push({
      kind: "dockerfile",
      path: "Dockerfile",
      content: generateDockerfile(input.suggestion),
      summary: `Containerises the ${input.suggestion.appType} app.`
    });
  }

  artifacts.push({
    kind: "github-action",
    path: ".github/workflows/awsify-deploy.yml",
    content: generateGithubAction(input.appName, input.region),
    summary: "Triggers an AWSify deployment on every push to the main branch."
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
  const target = suggestion.computeTarget;
  const resources: DeploymentPlan["resources"] = [];

  const shared = [
    { type: "cloudwatch.logGroup" as const, name: `/awsify/${appName}`, purpose: "Captures application logs." },
    { type: "iam.role" as const, name: `${appName}-exec-role`, purpose: "Execution / task permissions." },
    { type: "ec2.securityGroup" as const, name: `${appName}-sg`, purpose: "Controls inbound / outbound traffic." }
  ];

  if (target === "s3-cloudfront") {
    resources.push(
      { type: "s3.bucket", name: `${appName}-assets`, purpose: "Stores built static files." },
      { type: "cloudfront.distribution", name: `${appName}-cdn`, purpose: "Global CDN serving the S3 bucket." }
    );
    return resources;
  }

  if (target === "lambda") {
    resources.push(
      { type: "ecr.repository", name: `${appName}-repo`, purpose: "Stores Lambda container image." },
      { type: "lambda.function", name: appName, purpose: "Runs the application as a serverless function." },
      { type: "apigateway.httpApi", name: `${appName}-api`, purpose: "Public HTTP endpoint routing to Lambda." },
      ...shared
    );
  } else if (target === "ec2-instance") {
    resources.push(
      { type: "ec2.instance", name: appName, purpose: "EC2 instance running the app in Docker." },
      { type: "elasticloadbalancingv2.loadBalancer", name: `${appName}-alb`, purpose: "Public HTTP entrypoint." },
      { type: "elasticloadbalancingv2.targetGroup", name: `${appName}-tg`, purpose: "Routes ALB traffic to EC2." },
      ...shared
    );
  } else if (target === "ecs-ec2") {
    resources.push(
      { type: "ecr.repository", name: `${appName}-repo`, purpose: "Stores container images." },
      { type: "ecs.cluster", name: `${appName}-cluster`, purpose: "ECS cluster with EC2 capacity." },
      { type: "ec2.launchTemplate", name: `${appName}-lt`, purpose: "EC2 launch config for ECS instances." },
      { type: "autoscaling.group", name: `${appName}-asg`, purpose: "Auto Scaling group for ECS EC2 capacity." },
      { type: "ecs.taskDefinition", name: `${appName}-task`, purpose: "Defines CPU, memory, image, port, and env vars." },
      { type: "ecs.service", name: `${appName}-service`, purpose: "Keeps the app running on ECS EC2." },
      { type: "elasticloadbalancingv2.loadBalancer", name: `${appName}-alb`, purpose: "Public HTTP entrypoint." },
      { type: "elasticloadbalancingv2.targetGroup", name: `${appName}-tg`, purpose: "Routes ALB traffic to ECS tasks." },
      ...shared
    );
  } else {
    // ecs-fargate (default)
    resources.push(
      { type: "ecr.repository", name: `${appName}-repo`, purpose: "Stores container images." },
      { type: "ecs.cluster", name: `${appName}-cluster`, purpose: "Runs the Fargate service." },
      { type: "ecs.taskDefinition", name: `${appName}-task`, purpose: "Defines CPU, memory, image, port, and env vars." },
      { type: "ecs.service", name: `${appName}-service`, purpose: "Keeps the app running on Fargate." },
      { type: "elasticloadbalancingv2.loadBalancer", name: `${appName}-alb`, purpose: "Public HTTP entrypoint." },
      { type: "elasticloadbalancingv2.targetGroup", name: `${appName}-tg`, purpose: "Routes ALB traffic to ECS tasks." },
      ...shared
    );
  }

  if (suggestion.database.required) {
    resources.push({
      type: "rds.dbInstance",
      name: `${appName}-db`,
      purpose: `Managed ${suggestion.database.engine ?? "relational"} database (RDS).`
    });
  }

  if (suggestion.cache.required) {
    resources.push({
      type: "elasticache.replicationGroup",
      name: `${appName}-redis`,
      purpose: "Managed Redis cache / queue backend (ElastiCache)."
    });
  }

  return resources;
}

function estimateCost(suggestion: DeploymentSuggestion): DeploymentPlan["estimatedMonthlyCostUsd"] {
  const target = suggestion.computeTarget;
  let low = 0;
  let high = 0;
  const notes: string[] = [];

  switch (target) {
    case "ecs-fargate":
      low = 20; high = 80;
      notes.push("Fargate (0.25 vCPU / 0.5 GB) + ALB + ECR + logs.");
      break;
    case "ecs-ec2":
      low = 15; high = 120;
      notes.push("ECS on t3.small EC2 + ALB. Cheaper at scale than Fargate.");
      break;
    case "ec2-instance":
      low = 8; high = 60;
      notes.push("Single t3.micro/small EC2 + ALB. No per-task overhead.");
      break;
    case "lambda":
      low = 1; high = 30;
      notes.push("Lambda (pay-per-invocation) + API Gateway HTTP API. Near-zero idle cost.");
      break;
    case "s3-cloudfront":
      low = 1; high = 15;
      notes.push("S3 storage + CloudFront data transfer. Very low for typical static sites.");
      break;
  }

  if (suggestion.database.required) {
    low += 15; high += 60;
    notes.push("RDS db.t3.micro (~$15-25/mo). Multi-AZ increases cost.");
  }

  if (suggestion.cache.required) {
    low += 12; high += 40;
    notes.push("ElastiCache cache.t3.micro (~$12-20/mo).");
  }

  return { low, high, notes };
}
