"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.awsConnectionSchema = exports.deploymentJobSchema = exports.deploymentPlanSchema = exports.generatedArtifactSchema = exports.deploymentSuggestionSchema = exports.envVarSchema = exports.healthPathSchema = exports.supportedServiceSchema = exports.computeTargetSchema = exports.supportedAppTypeSchema = void 0;
exports.isValidHealthPath = isValidHealthPath;
exports.parseDeploymentSuggestion = parseDeploymentSuggestion;
const zod_1 = require("zod");
exports.supportedAppTypeSchema = zod_1.z.enum(["node-backend", "nextjs-app"]);
exports.computeTargetSchema = zod_1.z.enum(["ecs-fargate"]);
exports.supportedServiceSchema = zod_1.z.enum(["frontend", "backend", "database", "worker", "cache"]);
const HEALTH_PATH_PATTERN = /^\/[A-Za-z0-9/_\-.]*$/;
function isValidHealthPath(value) {
    if (!HEALTH_PATH_PATTERN.test(value))
        return false;
    const segments = value.split("/");
    return !segments.includes("..");
}
exports.healthPathSchema = zod_1.z
    .string()
    .refine(isValidHealthPath, {
    message: "must start with / and contain only safe URL path characters (no '..' segments)"
})
    .default("/");
exports.envVarSchema = zod_1.z.object({
    name: zod_1.z.string().regex(/^[A-Z_][A-Z0-9_]*$/),
    required: zod_1.z.boolean().default(true),
    description: zod_1.z.string().max(300).optional(),
    valuePreview: zod_1.z.string().max(120).optional()
});
exports.deploymentSuggestionSchema = zod_1.z.object({
    appType: exports.supportedAppTypeSchema,
    computeTarget: exports.computeTargetSchema.default("ecs-fargate"),
    services: zod_1.z.array(exports.supportedServiceSchema).min(1),
    packageManager: zod_1.z.enum(["npm", "pnpm", "yarn", "bun"]),
    buildCommand: zod_1.z.string().min(1).max(200),
    startCommand: zod_1.z.string().min(1).max(200),
    installCommand: zod_1.z.string().min(1).max(200),
    port: zod_1.z.number().int().min(0).max(65535),
    healthPath: exports.healthPathSchema,
    hasDockerfile: zod_1.z.boolean(),
    envVars: zod_1.z.array(exports.envVarSchema),
    database: zod_1.z
        .object({
        required: zod_1.z.boolean(),
        engine: zod_1.z.enum(["postgresql", "mysql", "mongodb"]).optional(),
        instanceClass: zod_1.z.string().optional(),
        note: zod_1.z.string().max(300).optional()
    })
        .default({ required: false }),
    cache: zod_1.z
        .object({
        required: zod_1.z.boolean(),
        nodeType: zod_1.z.string().optional(),
        note: zod_1.z.string().max(300).optional()
    })
        .default({ required: false }),
    confidence: zod_1.z.number().min(0).max(1),
    notes: zod_1.z.array(zod_1.z.string().max(300)).default([])
});
exports.generatedArtifactSchema = zod_1.z.object({
    kind: zod_1.z.enum(["dockerfile", "github-action", "pulumi-preview", "cloudformation-role"]),
    path: zod_1.z.string(),
    content: zod_1.z.string(),
    summary: zod_1.z.string()
});
exports.deploymentPlanSchema = zod_1.z.object({
    id: zod_1.z.string(),
    projectId: zod_1.z.string(),
    appName: zod_1.z.string().regex(/^[a-z][a-z0-9-]{2,40}$/),
    region: zod_1.z.string().min(3),
    suggestion: exports.deploymentSuggestionSchema,
    resources: zod_1.z.array(zod_1.z.object({
        type: zod_1.z.enum([
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
        name: zod_1.z.string(),
        purpose: zod_1.z.string()
    })),
    artifacts: zod_1.z.array(exports.generatedArtifactSchema),
    estimatedMonthlyCostUsd: zod_1.z.object({
        low: zod_1.z.number().nonnegative(),
        high: zod_1.z.number().nonnegative(),
        notes: zod_1.z.array(zod_1.z.string())
    }),
    requiresApproval: zod_1.z.literal(true),
    status: zod_1.z.enum(["draft", "awaiting_approval", "approved", "rejected", "deploying", "deployed", "failed"])
});
exports.deploymentJobSchema = zod_1.z.object({
    projectId: zod_1.z.string(),
    repoFullName: zod_1.z.string(),
    branch: zod_1.z.string(),
    awsConnectionId: zod_1.z.string(),
    approvedPlanId: zod_1.z.string(),
    actorUserId: zod_1.z.string(),
    deploymentId: zod_1.z.string().optional()
});
exports.awsConnectionSchema = zod_1.z.object({
    id: zod_1.z.string(),
    accountId: zod_1.z.string(),
    roleArn: zod_1.z.string().startsWith("arn:aws:iam::"),
    externalId: zod_1.z.string().min(16),
    defaultRegion: zod_1.z.string().min(1),
    status: zod_1.z.enum(["pending", "valid", "invalid"]),
    lastValidationResult: zod_1.z.string().optional()
});
function parseDeploymentSuggestion(input) {
    return exports.deploymentSuggestionSchema.parse(input);
}
