import { z } from "zod";

export const supportedAppTypeSchema = z.enum([
  "node-backend",
  "nextjs-app",
  "static-spa",
  "python-backend",
  "go-backend",
  "ruby-backend",
  "java-backend",
  "rust-backend",
  "php-backend"
]);

export const computeTargetSchema = z.enum(["ecs-fargate"]);

export const supportedServiceSchema = z.enum(["frontend", "backend", "database", "worker", "cache"]);

const HEALTH_PATH_PATTERN = /^\/[A-Za-z0-9/_\-.]*$/;

export function isValidHealthPath(value: string): boolean {
  if (!HEALTH_PATH_PATTERN.test(value)) return false;
  const segments = value.split("/");
  return !segments.includes("..");
}

export const healthPathSchema = z
  .string()
  .refine(isValidHealthPath, {
    message: "must start with / and contain only safe URL path characters (no '..' segments)"
  })
  .default("/");

export const envVarCategorySchema = z.enum([
  "secret",
  "config",
  "feature-flag",
  "build-time",
  "integration",
  "custom"
]);

export type EnvVarCategory = z.infer<typeof envVarCategorySchema>;

export const envVarSchema = z.object({
  name: z.string().regex(/^[A-Z_][A-Z0-9_]*$/),
  // Default to optional. `required: true` should be set only when the
  // app demonstrably cannot start without the variable (no default in
  // .env.example AND used unguarded in source).
  required: z.boolean().default(false),
  description: z.string().max(300).optional(),
  example: z.string().max(200).optional(),
  category: envVarCategorySchema.optional(),
  valuePreview: z.string().max(120).optional()
});

export const deploymentSuggestionSchema = z.object({
  appType: supportedAppTypeSchema,
  computeTarget: computeTargetSchema.default("ecs-fargate"),
  services: z.array(supportedServiceSchema).min(1),
  packageManager: z.enum(["npm", "pnpm", "yarn", "bun"]),
  buildCommand: z.string().min(1).max(200),
  startCommand: z.string().min(1).max(200),
  installCommand: z.string().min(1).max(200),
  port: z.number().int().min(0).max(65535),
  healthPath: healthPathSchema,
  hasDockerfile: z.boolean(),
  envVars: z.array(envVarSchema),
  database: z
    .object({
      required: z.boolean(),
      engine: z.enum(["postgresql", "mysql", "mongodb"]).optional(),
      instanceClass: z.string().optional(),
      note: z.string().max(300).optional()
    })
    .default({ required: false }),
  cache: z
    .object({
      required: z.boolean(),
      nodeType: z.string().optional(),
      note: z.string().max(300).optional()
    })
    .default({ required: false }),
  confidence: z.number().min(0).max(1),
  notes: z.array(z.string().max(300)).default([])
});

export type DeploymentSuggestion = z.infer<typeof deploymentSuggestionSchema>;
export type ComputeTarget = z.infer<typeof computeTargetSchema>;

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
  actorUserId: z.string(),
  deploymentId: z.string().optional()
});

export type DeploymentJob = z.infer<typeof deploymentJobSchema>;

export const awsConnectionSchema = z.object({
  id: z.string(),
  accountId: z.string(),
  roleArn: z.string().startsWith("arn:aws:iam::"),
  externalId: z.string().min(16),
  defaultRegion: z.string().min(1),
  status: z.enum(["pending", "valid", "invalid"]),
  lastValidationResult: z.string().optional()
});

export type AwsConnection = z.infer<typeof awsConnectionSchema>;

export function parseDeploymentSuggestion(input: unknown): DeploymentSuggestion {
  return deploymentSuggestionSchema.parse(input);
}
