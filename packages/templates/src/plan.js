"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDeploymentPlan = createDeploymentPlan;
const dockerfiles_js_1 = require("./dockerfiles.js");
const github_action_js_1 = require("./github-action.js");
const iam_role_js_1 = require("./iam-role.js");
function createDeploymentPlan(input) {
    const artifacts = buildArtifacts(input);
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
function buildArtifacts(input) {
    const artifacts = [];
    artifacts.push({
        kind: "dockerfile",
        path: "Dockerfile",
        content: (0, dockerfiles_js_1.generateDockerfile)(input.suggestion),
        summary: `Containerises the ${input.suggestion.appType} app.`
    });
    artifacts.push({
        kind: "github-action",
        path: ".github/workflows/awsify-deploy.yml",
        content: (0, github_action_js_1.generateGithubAction)(input.appName, input.region, input.projectId),
        summary: "Triggers an AWS-ify code redeploy for the approved plan on every push to the main branch."
    });
    artifacts.push({
        kind: "cloudformation-role",
        path: "awsify-role.yml",
        content: (0, iam_role_js_1.generateCloudFormationRoleTemplate)({
            awsifyAccountId: input.awsifyAccountId,
            externalId: input.externalId
        }),
        summary: "Creates the IAM role AWSify assumes for approved deployments."
    });
    return artifacts;
}
function buildResources(input) {
    const { appName, suggestion } = input;
    const resources = [];
    const shared = [
        { type: "cloudwatch.logGroup", name: `/awsify/${appName}`, purpose: "Captures application logs." },
        { type: "iam.role", name: `${appName}-exec-role`, purpose: "Execution / task permissions." },
        { type: "ec2.securityGroup", name: `${appName}-sg`, purpose: "Controls inbound / outbound traffic." }
    ];
    resources.push({ type: "ecr.repository", name: `${appName}-repo`, purpose: "Stores container images." }, { type: "ecs.cluster", name: `${appName}-cluster`, purpose: "Runs the Fargate service." }, { type: "ecs.taskDefinition", name: `${appName}-task`, purpose: "Defines CPU, memory, image, port, and env vars." }, { type: "ecs.service", name: `${appName}-service`, purpose: "Keeps the app running on Fargate." }, { type: "elasticloadbalancingv2.loadBalancer", name: `${appName}-alb`, purpose: "Public HTTP entrypoint." }, { type: "elasticloadbalancingv2.targetGroup", name: `${appName}-tg`, purpose: "Routes ALB traffic to ECS tasks." }, ...shared);
    return resources;
}
function estimateCost(suggestion) {
    let low = 20;
    let high = 80;
    const notes = [];
    notes.push("Fargate (0.25 vCPU / 0.5 GB) + ALB + ECR + logs.");
    if (suggestion.database.required) {
        notes.push("Database was detected, but RDS is not provisioned by the MVP template yet.");
    }
    if (suggestion.cache.required) {
        notes.push("Redis/cache was detected, but ElastiCache is not provisioned by the MVP template yet.");
    }
    return { low, high, notes };
}
