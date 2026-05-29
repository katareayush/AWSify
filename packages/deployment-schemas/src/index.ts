import { z } from "zod";

export const supportedAppTypeSchema = z.enum(["node-backend", "nextjs-app"]);
export const supportedServiceSchema = z.enum(["frontend", "backend", "database", "worker"]);

export const envVarSchema = z.object({
  name: z.string().regex(/^[A-Z_][A-Z0-9_]*$/),
  required: z.boolean().default(true),
  description: z.string().max(300).optional(),
  valuePreview: z.string().max(120).optional()
});

export const deploymentSuggestionSchema = z.object({
  appType: supportedAppTypeSchema,
  services: z.array(supportedServiceSchema).min(1),
  packageManager: z.enum(["npm", "pnpm", "yarn", "bun", "unknown"]),
  buildCommand: z.string().min(1).max(200),
  startCommand: z.string().min(1).max(200),
  installCommand: z.string().min(1).max(200),
  port: z.number().int().min(1).max(65535),
  hasDockerfile: z.boolean(),
  envVars: z.array(envVarSchema),
  database: z
    .object({
      required: z.boolean(),
      engine: z.enum(["postgresql"]).optional(),
      note: z.string().max(300).optional()
    })
    .default({ required: false }),
  confidence: z.number().min(0).max(1),
  notes: z.array(z.string().max(300)).default([])
});

export type DeploymentSuggestion = z.infer<typeof deploymentSuggestionSchema>;

export const generatedArtifactSchema = z.object({
  kind: z.enum(["dockerfile", "github-action", "pulumi-preview", "cloudformation-role"]),
  path: z.string(),
  content: z.string(),
  summary: z.string()
});

export type GeneratedArtifact = z.infer<typeof generatedArtifactSchema>;

export const deploymentPlanSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  appName: z.string().regex(/^[a-z][a-z0-9-]{2,40}$/),
  region: z.string().min(3),
  suggestion: deploymentSuggestionSchema,
  resources: z.array(
    z.object({
      type: z.enum([
        "ecr.repository",
        "ecs.cluster",
        "ecs.service",
        "ecs.taskDefinition",
        "elasticloadbalancingv2.loadBalancer",
        "elasticloadbalancingv2.targetGroup",
        "cloudwatch.logGroup",
        "iam.role",
        "ec2.securityGroup"
      ]),
      name: z.string(),
      purpose: z.string()
    })
  ),
  artifacts: z.array(generatedArtifactSchema),
  estimatedMonthlyCostUsd: z.object({
    low: z.number().nonnegative(),
    high: z.number().nonnegative(),
    notes: z.array(z.string())
  }),
  requiresApproval: z.literal(true),
  status: z.enum(["draft", "awaiting_approval", "approved", "rejected", "deploying", "deployed", "failed"])
});

export type DeploymentPlan = z.infer<typeof deploymentPlanSchema>;

export const deploymentJobSchema = z.object({
  projectId: z.string(),
  repoFullName: z.string(),
  branch: z.string(),
  awsConnectionId: z.string(),
  approvedPlanId: z.string(),
  actorUserId: z.string()
});

export type DeploymentJob = z.infer<typeof deploymentJobSchema>;

export const awsConnectionSchema = z.object({
  id: z.string(),
  accountId: z.string(),
  roleArn: z.string().startsWith("arn:aws:iam::"),
  externalId: z.string().min(16),
  defaultRegion: z.string().default("us-east-1"),
  status: z.enum(["pending", "valid", "invalid"]),
  lastValidationResult: z.string().optional()
});

export type AwsConnection = z.infer<typeof awsConnectionSchema>;

export function parseDeploymentSuggestion(input: unknown): DeploymentSuggestion {
  return deploymentSuggestionSchema.parse(input);
}
