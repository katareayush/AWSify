import { Injectable } from "@nestjs/common";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { encryptSecret, previewSecret } from "@awsify/config";
import {
  deploymentSuggestionSchema,
  isValidHealthPath,
  type DeploymentSuggestion,
  type GeneratedArtifact
} from "@awsify/deployment-schemas";
import { createDeploymentPlan } from "@awsify/templates";
import { PrismaService } from "../prisma.service";
import { QueueService } from "../queue/queue.service";
import { GithubCommitService } from "../github/github-commit.service";
import { GithubService } from "../github/github.service";
import { diagnoseDeploymentFailure } from "./diagnosis";
import { isValidEcrImageUri } from "./image-uri";

function sanitizeAppName(repoFullName: string): string {
  const name = repoFullName.split("/").pop() ?? "awsify-app";
  return name.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/^-+|-+$/g, "").slice(0, 40).padEnd(3, "x");
}

@Injectable()
export class DeploymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: QueueService,
    private readonly github: GithubService,
    private readonly githubCommit: GithubCommitService
  ) {}

  private getUserId(sessionToken: string | undefined): string | null {
    if (!sessionToken) return null;
    const session = this.github.verifySession(sessionToken);
    return session?.userId ?? null;
  }

  async commitArtifactsToRepo(deploymentId: string, sessionToken: string | undefined) {
    const userId = this.getUserId(sessionToken);
    if (!userId) return { error: "not_authenticated" };
    const result = await this.githubCommit.commitDeploymentArtifacts(deploymentId, userId);
    const deployment = await this.prisma.deployment.findFirst({
      where: { id: deploymentId, actorUserId: userId },
      select: { projectId: true }
    });
    if (deployment) {
      await this.recordAudit({
        userId,
        projectId: deployment.projectId,
        deploymentId,
        type: "artifact_pr",
        message: "Generated deployment artifact PR action completed.",
        metadata: "error" in result
          ? { ok: false, error: result.error, detail: result.detail }
          : { ok: true, branch: result.branch, prNumber: result.prNumber, committed: result.committed }
      });
    }
    return result;
  }

  async trigger(
    sessionToken: string | undefined,
    input: { repoId: string; branch: string; awsConnectionId: string; deploymentProfile?: string }
  ) {
    const userId = this.getUserId(sessionToken);
    if (!userId) return { error: "not_authenticated" };

    const repo = await this.prisma.repository.findFirst({
      where: { id: input.repoId, installation: { userId } }
    });
    if (!repo) return { error: "repo_not_found" };
    const awsConnection = await this.prisma.awsConnection.findFirst({
      where: { id: input.awsConnectionId, userId }
    });
    if (!awsConnection) return { error: "aws_connection_not_found" };
    const region = process.env.AWS_REGION;
    if (!region) return { error: "AWS_REGION not configured." };

    const slug = repo.fullName.replace(/[^a-z0-9-]/gi, "-").toLowerCase().slice(0, 50);

    const project = await this.prisma.project.upsert({
      where: { userId_slug: { userId, slug } },
      create: { name: repo.fullName.split("/")[1] ?? repo.fullName, slug, branch: input.branch, userId, repositoryId: repo.id, awsConnectionId: input.awsConnectionId },
      update: { awsConnectionId: input.awsConnectionId, branch: input.branch }
    });

    const plan = await this.prisma.deploymentPlan.create({
      data: {
        projectId: project.id,
        appName: sanitizeAppName(repo.fullName),
        region,
        suggestion: {},
        resources: [],
        estimatedCost: { low: 0, high: 0, notes: [] },
        status: "draft"
      }
    });

    const profileLabel = deploymentProfileLabel(input.deploymentProfile);
    const deployment = await this.prisma.deployment.create({
      data: {
        projectId: project.id,
        planId: plan.id,
        actorUserId: userId,
        status: "queued",
        logs: profileLabel ? [{
          status: "queued",
          message: `Deployment profile selected: ${profileLabel}.`,
          at: new Date().toISOString()
        }] : []
      }
    });

    try {
      await this.queue.enqueueDeployment({
        action: "deploy",
        projectId: project.id,
        repoFullName: repo.fullName,
        branch: input.branch,
        awsConnectionId: input.awsConnectionId,
        approvedPlanId: plan.id,
        actorUserId: userId,
        deploymentId: deployment.id
      });
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      await this.prisma.deployment.update({
        where: { id: deployment.id },
        data: {
          status: "failed",
          failureReason: `Could not enqueue the deployment job: ${detail}`,
          logs: [{ status: "failed", message: `Queue unavailable: ${detail}`, at: new Date().toISOString() }]
        }
      }).catch(() => undefined);
      return { error: "queue_unavailable", detail };
    }

    return { deploymentId: deployment.id };
  }

  async redeployLatest(deploymentId: string, sessionToken: string | undefined) {
    const userId = this.getUserId(sessionToken);
    if (!userId) return { error: "not_authenticated" };

    const source = await this.prisma.deployment.findFirst({
      where: { id: deploymentId, actorUserId: userId },
      include: { project: { include: { repository: true } }, plan: true }
    });
    if (!source) return { error: "not_found" };
    if (!source.project.awsConnectionId) return { error: "missing_aws_connection" };

    const approvedPlan = source.plan.status === "approved"
      ? source.plan
      : await this.prisma.deploymentPlan.findFirst({
          where: { projectId: source.projectId, status: "approved" },
          orderBy: { approvedAt: "desc" }
        });
    if (!approvedPlan) return { error: "no_approved_plan" };

    const deployment = await this.prisma.deployment.create({
      data: {
        projectId: source.projectId,
        planId: approvedPlan.id,
        actorUserId: userId,
        status: "queued",
        logs: [{
          status: "queued",
          message: `Redeploy queued for latest commit on ${source.project.branch}.`,
          at: new Date().toISOString()
        }]
      }
    });

    await this.queue.enqueueDeployment({
      action: "deploy",
      projectId: source.projectId,
      repoFullName: source.project.repository.fullName,
      branch: source.project.branch,
      awsConnectionId: source.project.awsConnectionId,
      approvedPlanId: approvedPlan.id,
      actorUserId: userId,
      deploymentId: deployment.id
    });

    await this.recordAudit({
      userId,
      projectId: source.projectId,
      deploymentId: deployment.id,
      type: "manual_redeploy",
      message: "Queued redeploy for latest commit.",
      metadata: { branch: source.project.branch }
    });

    return { deploymentId: deployment.id, status: "queued" };
  }

  async destroyInfrastructure(deploymentId: string, sessionToken: string | undefined) {
    const userId = this.getUserId(sessionToken);
    if (!userId) return { error: "not_authenticated" };

    const deployment = await this.prisma.deployment.findFirst({
      where: { id: deploymentId, actorUserId: userId },
      include: { project: { include: { repository: true } }, plan: true }
    });
    if (!deployment) return { error: "not_found" };
    if (String(deployment.status) === "destroyed") {
      return { deploymentId: deployment.id, status: "destroyed" };
    }
    if (["queued", "scanning", "deploying", "destroying"].includes(deployment.status)) {
      return { error: "deployment_running" };
    }
    if (!deployment.project.awsConnectionId) return { error: "missing_aws_connection" };
    if (!["approved", "deploying", "deployed", "failed"].includes(deployment.plan.status)) {
      return { error: "plan_not_approved" };
    }

    await this.updateStatus(deployment.id, {
      status: "destroying",
      appendLog: {
        status: "destroying",
        message: "Infrastructure teardown queued. AWSify will destroy the Pulumi-managed stack and ECR repository.",
        at: new Date().toISOString()
      }
    });

    try {
      await this.queue.enqueueDeployment({
        action: "destroy",
        projectId: deployment.projectId,
        repoFullName: deployment.project.repository.fullName,
        branch: deployment.project.branch,
        awsConnectionId: deployment.project.awsConnectionId,
        approvedPlanId: deployment.planId,
        actorUserId: userId,
        deploymentId: deployment.id
      });
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      await this.updateStatus(deployment.id, {
        status: "failed",
        failureReason: `Could not enqueue the teardown job: ${detail}`,
        appendLog: {
          status: "failed",
          message: `Queue unavailable: ${detail}`,
          at: new Date().toISOString()
        }
      }).catch(() => undefined);
      return { error: "queue_unavailable", detail };
    }

    await this.recordAudit({
      userId,
      projectId: deployment.projectId,
      deploymentId: deployment.id,
      type: "infrastructure_destroy_queued",
      message: "Queued infrastructure teardown.",
      metadata: { appName: deployment.plan.appName, branch: deployment.project.branch }
    });

    return { deploymentId: deployment.id, status: "destroying" };
  }

  async list(sessionToken: string | undefined) {
    const userId = this.getUserId(sessionToken);
    if (!userId) return { error: "not_authenticated" };

    const deployments = await this.prisma.deployment.findMany({
      where: { actorUserId: userId },
      include: { project: { include: { repository: true } } },
      orderBy: { createdAt: "desc" }
    });

    return {
      deployments: deployments.map(d => ({
        id: d.id,
        projectId: d.projectId,
        status: d.status,
        liveUrl: d.liveUrl,
        failureReason: d.failureReason,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
        project: { name: d.project.name, repoFullName: d.project.repository.fullName, branch: d.project.branch }
      }))
    };
  }

  async get(id: string, sessionToken: string | undefined) {
    const userId = this.getUserId(sessionToken);
    if (!userId) return { error: "not_authenticated" };

    const deployment = await this.prisma.deployment.findFirst({
      where: { id, actorUserId: userId },
      include: {
        project: { include: { repository: true, envVars: true } },
        plan: { include: { artifacts: true } }
      }
    });
    if (!deployment) return { error: "not_found" };

    return {
      deployment: {
        ...deployment,
        projectEnvVars: deployment.project.envVars.map((envVar) => ({
          name: envVar.name,
          valuePreview: envVar.valuePreview,
          required: envVar.required,
          updatedAt: envVar.updatedAt
        }))
      }
    };
  }

  async delete(deploymentId: string, sessionToken: string | undefined) {
    const userId = this.getUserId(sessionToken);
    if (!userId) return { error: "not_authenticated" };

    const deployment = await this.prisma.deployment.findFirst({
      where: { id: deploymentId, actorUserId: userId },
      select: { id: true, projectId: true, status: true }
    });
    if (!deployment) return { error: "not_found" };
    // Deleting only removes the AWSify record (logs/timeline) — it never touches
    // AWS resources — so allow it even for in-progress/stuck deployments. A still
    // -running worker job just fails its next log write harmlessly.

    await this.recordAudit({
      userId,
      projectId: deployment.projectId,
      type: "deployment_delete",
      message: "Deleted deployment record.",
      metadata: { deploymentId, status: deployment.status }
    });

    await this.prisma.deployment.delete({
      where: { id: deploymentId }
    });

    return { deleted: deploymentId };
  }

  async getDiagnosis(deploymentId: string, sessionToken: string | undefined) {
    const userId = this.getUserId(sessionToken);
    if (!userId) return { error: "not_authenticated" };

    const deployment = await this.prisma.deployment.findFirst({
      where: { id: deploymentId, actorUserId: userId },
      select: { id: true, projectId: true, failureReason: true, logs: true, status: true }
    });
    if (!deployment) return { error: "not_found" };
    if (!deployment.failureReason) return { error: "no_failure_reason" };

    const logs = Array.isArray(deployment.logs)
      ? deployment.logs.filter((log): log is { status?: string; message?: string } => Boolean(log && typeof log === "object"))
      : [];
    const diagnosis = diagnoseDeploymentFailure(deployment.failureReason, logs);

    await this.recordAudit({
      userId,
      projectId: deployment.projectId,
      deploymentId,
      type: "failure_diagnosis",
      message: `Viewed deployment failure diagnosis: ${diagnosis.category}.`,
      metadata: { category: diagnosis.category, status: deployment.status }
    });

    return { diagnosis };
  }

  async getArtifactDiff(deploymentId: string, sessionToken: string | undefined) {
    const userId = this.getUserId(sessionToken);
    if (!userId) return { error: "not_authenticated" };

    const deployment = await this.prisma.deployment.findFirst({
      where: { id: deploymentId, actorUserId: userId },
      select: { id: true, projectId: true }
    });
    if (!deployment) return { error: "not_found" };

    const diff = await this.githubCommit.getDeploymentArtifactDiff(deploymentId, userId);
    await this.recordAudit({
      userId,
      projectId: deployment.projectId,
      deploymentId,
      type: "artifact_diff",
      message: "Viewed generated artifact diff.",
      metadata: "error" in diff ? { ok: false, error: diff.error } : { ok: true, files: diff.files.length }
    });
    return diff;
  }

  async saveEnvVars(
    deploymentId: string,
    sessionToken: string | undefined,
    input: { env: Record<string, string> }
  ) {
    const userId = this.getUserId(sessionToken);
    if (!userId) return { error: "not_authenticated" };

    const deployment = await this.prisma.deployment.findFirst({
      where: { id: deploymentId, actorUserId: userId },
      include: { plan: true }
    });
    if (!deployment) return { error: "not_found" };

    const suggestion = deploymentSuggestionSchema.safeParse(deployment.plan.suggestion);
    if (!suggestion.success) return { error: "plan_not_ready" };

    const NAME_PATTERN = /^[A-Z_][A-Z0-9_]*$/;
    const entries = Object.entries(input.env ?? {}).filter(([, value]) => value.length > 0);
    const invalid = entries.map(([name]) => name).filter((name) => !NAME_PATTERN.test(name));
    if (invalid.length > 0) return { error: `invalid_env_var_names: ${invalid.join(", ")}` };

    // Vars in the suggestion keep their detected metadata. User-added vars
    // are treated as optional + category "custom" so the UI can flag them.
    const detected = new Map(suggestion.data.envVars.map((envVar) => [envVar.name, envVar]));
    const userAdded: typeof suggestion.data.envVars = [];

    await this.prisma.$transaction(
      entries.map(([name, value]) => {
        const det = detected.get(name);
        if (!det) {
          userAdded.push({ name, required: false, category: "custom" });
        }
        return this.prisma.projectEnvVar.upsert({
          where: { projectId_name: { projectId: deployment.projectId, name } },
          create: {
            projectId: deployment.projectId,
            name,
            encryptedValue: encryptSecret(value),
            valuePreview: previewSecret(value),
            required: det?.required ?? false
          },
          update: {
            encryptedValue: encryptSecret(value),
            valuePreview: previewSecret(value),
            required: det?.required ?? false
          }
        });
      })
    );

    // Persist user-added vars onto the plan's suggestion so the panel keeps
    // showing them on reload, and so future re-scans don't drop them.
    if (userAdded.length > 0 && deployment.plan.status === "awaiting_approval") {
      const nextSuggestion = {
        ...suggestion.data,
        envVars: [...suggestion.data.envVars, ...userAdded]
      };
      await this.prisma.deploymentPlan.update({
        where: { id: deployment.planId },
        data: { suggestion: nextSuggestion as object }
      });
    }

    await this.recordAudit({
      userId,
      projectId: deployment.projectId,
      deploymentId,
      type: entries.length > 1 ? "env_bulk_save" : "env_save",
      message: `Saved ${entries.length} environment variable${entries.length === 1 ? "" : "s"}.`,
      metadata: { names: entries.map(([name]) => name), added: userAdded.map((envVar) => envVar.name) }
    });

    return { saved: entries.map(([name]) => name), added: userAdded.map((envVar) => envVar.name) };
  }

  async deleteEnvVar(deploymentId: string, sessionToken: string | undefined, name: string) {
    const userId = this.getUserId(sessionToken);
    if (!userId) return { error: "not_authenticated" };
    if (!/^[A-Z_][A-Z0-9_]*$/.test(name)) return { error: "invalid_env_var_name" };

    const deployment = await this.prisma.deployment.findFirst({
      where: { id: deploymentId, actorUserId: userId }
    });
    if (!deployment) return { error: "not_found" };

    await this.prisma.projectEnvVar.deleteMany({
      where: { projectId: deployment.projectId, name }
    });
    await this.recordAudit({
      userId,
      projectId: deployment.projectId,
      deploymentId,
      type: "env_delete",
      message: `Removed environment variable ${name}.`,
      metadata: { name }
    });
    return { deleted: name };
  }

  async saveRuntimeSettings(
    deploymentId: string,
    sessionToken: string | undefined,
    input: { port?: number; healthPath?: string }
  ) {
    const userId = this.getUserId(sessionToken);
    if (!userId) return { error: "not_authenticated" };

    const deployment = await this.prisma.deployment.findFirst({
      where: { id: deploymentId, actorUserId: userId },
      include: { plan: true }
    });
    if (!deployment) return { error: "not_found" };
    const originalPlanStatus = String(deployment.plan.status);
    if (!["draft", "awaiting_approval"].includes(originalPlanStatus)) return { error: "plan_not_awaiting_approval" };

    const suggestion = deploymentSuggestionSchema.safeParse(deployment.plan.suggestion);
    if (!suggestion.success) return { error: "plan_not_ready" };

    const port = input.port ?? suggestion.data.port;
    const healthPath = input.healthPath ?? suggestion.data.healthPath;
    if (!Number.isInteger(port) || port < 1 || port > 65535) return { error: "invalid_port" };
    if (!isValidHealthPath(healthPath)) return { error: "invalid_health_path" };

    const nextSuggestion = {
      ...suggestion.data,
      port,
      healthPath
    };

    await this.prisma.deploymentPlan.update({
      where: { id: deployment.planId },
      data: { suggestion: nextSuggestion as object }
    });

    await this.recordAudit({
      userId,
      projectId: deployment.projectId,
      deploymentId,
      type: "runtime_settings_update",
      message: "Updated deployment runtime settings.",
      metadata: { port, healthPath }
    });

    return { suggestion: nextSuggestion };
  }

  async saveScanReview(
    deploymentId: string,
    sessionToken: string | undefined,
    input: {
      appType?: string;
      packageManager?: string;
      buildCommand?: string;
      startCommand?: string;
      installCommand?: string;
      port?: number;
      healthPath?: string;
    }
  ) {
    const userId = this.getUserId(sessionToken);
    if (!userId) return { error: "not_authenticated" };

    const deployment = await this.prisma.deployment.findFirst({
      where: { id: deploymentId, actorUserId: userId },
      include: { plan: true }
    });
    if (!deployment) return { error: "not_found" };
    const originalPlanStatus = String(deployment.plan.status);
    if (!["draft", "awaiting_approval"].includes(originalPlanStatus)) return { error: "plan_not_awaiting_approval" };

    const suggestion = deploymentSuggestionSchema.safeParse(deployment.plan.suggestion);
    if (!suggestion.success) return { error: "plan_not_ready" };

    const nextSuggestion: DeploymentSuggestion = {
      ...suggestion.data,
      ...(input.appType ? { appType: input.appType as DeploymentSuggestion["appType"] } : {}),
      ...(input.packageManager ? { packageManager: input.packageManager as DeploymentSuggestion["packageManager"] } : {}),
      ...(input.buildCommand ? { buildCommand: input.buildCommand.trim() } : {}),
      ...(input.startCommand ? { startCommand: input.startCommand.trim() } : {}),
      ...(input.installCommand ? { installCommand: input.installCommand.trim() } : {}),
      ...(input.port !== undefined ? { port: input.port } : {}),
      ...(input.healthPath !== undefined ? { healthPath: input.healthPath.trim() || "/" } : {})
    };

    const parsed = deploymentSuggestionSchema.safeParse(nextSuggestion);
    if (!parsed.success) {
      return { error: "invalid_scan_review", validation: { reason: parsed.error.issues[0]?.message } };
    }

    const region = process.env.AWS_REGION;
    const awsifyAccountId = process.env.AWSIFY_AWS_ACCOUNT_ID;
    if (!region || !awsifyAccountId) return { error: "AWS_REGION and AWSIFY_AWS_ACCOUNT_ID must be configured." };

    const plan = createDeploymentPlan({
      projectId: deployment.projectId,
      appName: deployment.plan.appName,
      region,
      awsifyAccountId,
      externalId: `awsify-${deployment.projectId}`,
      suggestion: parsed.data
    });

    await this.prisma.deploymentPlan.update({
      where: { id: deployment.planId },
      data: {
        suggestion: parsed.data as object,
        resources: plan.resources as object[],
        estimatedCost: plan.estimatedMonthlyCostUsd as object,
        status: "awaiting_approval",
        artifacts: {
          deleteMany: {},
          create: plan.artifacts.map((artifact) => ({
            kind: toDbArtifactKind(artifact.kind),
            path: artifact.path,
            content: artifact.content,
            summary: artifact.summary
          }))
        }
      }
    });

    if (originalPlanStatus === "draft") {
      await this.updateStatus(deploymentId, {
        status: "awaiting_approval",
        appendLog: {
          status: "awaiting_approval",
          message: "Scan review confirmed; plan and preview artifacts are ready for approval.",
          at: new Date().toISOString()
        }
      });
    }

    await this.recordAudit({
      userId,
      projectId: deployment.projectId,
      deploymentId,
      type: "scan_review_update",
      message: "Updated scan review settings and regenerated deployment artifacts.",
      metadata: {
        appType: parsed.data.appType,
        packageManager: parsed.data.packageManager,
        port: parsed.data.port,
        healthPath: parsed.data.healthPath
      }
    });

    return { suggestion: parsed.data };
  }

  async rotateCiToken(deploymentId: string, sessionToken: string | undefined) {
    const userId = this.getUserId(sessionToken);
    if (!userId) return { error: "not_authenticated" };

    const deployment = await this.prisma.deployment.findFirst({
      where: { id: deploymentId, actorUserId: userId },
      include: { project: { include: { awsConnection: true } } }
    });
    if (!deployment) return { error: "not_found" };

    const token = `awsify_${randomBytes(32).toString("base64url")}`;
    await this.prisma.project.update({
      where: { id: deployment.projectId },
      data: { deployTokenHash: hashDeployToken(token) }
    });

    await this.recordAudit({
      userId,
      projectId: deployment.projectId,
      deploymentId,
      type: "ci_token_rotate",
      message: "Rotated CI redeploy token.",
      metadata: { secretName: "AWSIFY_API_TOKEN", variables: ["AWSIFY_API_URL", "AWSIFY_DEPLOY_ROLE_ARN"] }
    });

    // The GitHub Action needs three repo settings: one secret (the CI token) and
    // two variables (the API URL and the OIDC role ARN it assumes to push to ECR).
    return {
      token,
      secretName: "AWSIFY_API_TOKEN",
      variables: [
        { name: "AWSIFY_API_URL", value: process.env.API_URL ?? "" },
        { name: "AWSIFY_DEPLOY_ROLE_ARN", value: deployment.project.awsConnection?.roleArn ?? "" }
      ],
      // Retained for backwards compatibility with existing UI callers.
      variableName: "AWSIFY_API_URL",
      variableValue: process.env.API_URL ?? "",
      projectId: deployment.projectId
    };
  }

  async redeployWithToken(
    input: { projectId: string; branch?: string; imageUri?: string },
    authorization: string | undefined
  ) {
    const token = parseBearerToken(authorization);
    if (!token) return { error: "not_authenticated" };

    const project = await this.prisma.project.findUnique({
      where: { id: input.projectId },
      include: { repository: true }
    });
    if (!project?.deployTokenHash || !verifyDeployToken(token, project.deployTokenHash)) {
      return { error: "invalid_deploy_token" };
    }
    if (!project.awsConnectionId) return { error: "missing_aws_connection" };

    const imageUri = input.imageUri?.trim();
    if (imageUri && !isValidEcrImageUri(imageUri)) {
      return { error: "invalid_image_uri" };
    }

    const approvedPlan = await this.prisma.deploymentPlan.findFirst({
      where: { projectId: project.id, status: "approved" },
      orderBy: { approvedAt: "desc" }
    });
    if (!approvedPlan) return { error: "no_approved_plan" };

    const branch = input.branch || project.branch;
    if (branch !== project.branch) {
      await this.prisma.project.update({ where: { id: project.id }, data: { branch } });
    }

    const deployment = await this.prisma.deployment.create({
      data: {
        projectId: project.id,
        planId: approvedPlan.id,
        actorUserId: project.userId,
        status: "queued",
        logs: [{
          status: "queued",
          message: imageUri
            ? `Code redeploy queued by GitHub Actions with prebuilt image ${imageUri}.`
            : "Code redeploy queued by GitHub Actions.",
          at: new Date().toISOString()
        }]
      }
    });

    await this.queue.enqueueDeployment({
      action: "deploy",
      projectId: project.id,
      repoFullName: project.repository.fullName,
      branch,
      awsConnectionId: project.awsConnectionId,
      approvedPlanId: approvedPlan.id,
      actorUserId: project.userId,
      deploymentId: deployment.id,
      ...(imageUri ? { imageUri } : {})
    });

    return { deploymentId: deployment.id, status: "queued" };
  }

  async approve(deploymentId: string, sessionToken: string | undefined) {
    const userId = this.getUserId(sessionToken);
    if (!userId) return { error: "not_authenticated" };

    const deployment = await this.prisma.deployment.findFirst({
      where: { id: deploymentId, actorUserId: userId },
      include: {
        plan: { include: { artifacts: true } },
        project: { include: { repository: true } }
      }
    });
    if (!deployment) return { error: "not_found" };
    if (deployment.plan.status !== "awaiting_approval") return { error: "plan_not_awaiting_approval" };
    if (!deployment.project.awsConnectionId) return { error: "missing_aws_connection" };

    const suggestion = deploymentSuggestionSchema.safeParse(deployment.plan.suggestion);
    const hasSuggestion = suggestion.success;
    const hasResources = Array.isArray(deployment.plan.resources) && deployment.plan.resources.length > 0;
    const hasArtifacts = deployment.plan.artifacts.length > 0;
    if (!hasSuggestion || !hasResources || !hasArtifacts) return { error: "plan_not_ready" };

    // We *warn* about missing required env vars but no longer block approval.
    // Required-detection is heuristic; sometimes it's wrong, and the user
    // is the final arbiter. The deploy may still fail at runtime if the app
    // really needs them — surfaced in logs.
    const requiredEnvNames = suggestion.data.envVars.filter((envVar) => envVar.required).map((envVar) => envVar.name);
    let missingRequired: string[] = [];
    if (requiredEnvNames.length > 0) {
      const stored = await this.prisma.projectEnvVar.findMany({
        where: { projectId: deployment.projectId, name: { in: requiredEnvNames } },
        select: { name: true }
      });
      const storedNames = new Set(stored.map((envVar) => envVar.name));
      missingRequired = requiredEnvNames.filter((name) => !storedNames.has(name));
    }

    await this.prisma.deploymentPlan.update({
      where: { id: deployment.planId },
      data: { status: "approved", approvedAt: new Date() }
    });

    const approvalLog = missingRequired.length > 0
      ? `Plan approved with ${missingRequired.length} unset required var${missingRequired.length === 1 ? "" : "s"} (${missingRequired.join(", ")}); deployment queued — may fail at runtime if app needs them.`
      : "Plan approved; deployment queued.";

    await this.updateStatus(deployment.id, {
      status: "queued",
      appendLog: {
        status: "queued",
        message: approvalLog,
        at: new Date().toISOString()
      }
    });

    try {
      await this.queue.enqueueDeployment({
        action: "deploy",
        projectId: deployment.projectId,
        repoFullName: deployment.project.repository.fullName,
        branch: deployment.project.branch,
        awsConnectionId: deployment.project.awsConnectionId,
        approvedPlanId: deployment.planId,
        actorUserId: userId,
        deploymentId: deployment.id
      });
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      await this.updateStatus(deployment.id, {
        status: "failed",
        failureReason: `Could not enqueue the deployment job: ${detail}`,
        appendLog: {
          status: "failed",
          message: `Queue unavailable: ${detail}`,
          at: new Date().toISOString()
        }
      }).catch(() => undefined);
      return { error: "queue_unavailable", detail };
    }

    await this.recordAudit({
      userId,
      projectId: deployment.projectId,
      deploymentId: deployment.id,
      type: "deployment_approve",
      message: "Approved deployment plan and queued deployment.",
      metadata: { missingRequired }
    });

    return {
      deploymentId: deployment.id,
      status: "queued",
      ...(missingRequired.length > 0 ? { warning: { missingRequired } } : {})
    };
  }

  async updateStatus(
    deploymentId: string,
    update: { status?: string; liveUrl?: string; failureReason?: string; appendLog?: unknown }
  ) {
    const data: Record<string, unknown> = {};
    if (update.status) data.status = update.status;
    if (update.liveUrl !== undefined) data.liveUrl = update.liveUrl;
    if (update.failureReason !== undefined) data.failureReason = update.failureReason;

    if (update.appendLog) {
      const current = await this.prisma.deployment.findUnique({ where: { id: deploymentId }, select: { logs: true } });
      const logs = Array.isArray(current?.logs) ? current.logs : [];
      data.logs = [...logs, update.appendLog];
    }

    await this.prisma.deployment.update({ where: { id: deploymentId }, data });
  }

  private async recordAudit(input: {
    userId: string;
    projectId?: string | null;
    deploymentId?: string | null;
    type: string;
    message: string;
    metadata?: Record<string, unknown>;
  }) {
    await (this.prisma as PrismaService & {
      auditEvent: { create: (args: { data: Record<string, unknown> }) => Promise<unknown> };
    }).auditEvent.create({
      data: {
        userId: input.userId,
        projectId: input.projectId ?? undefined,
        deploymentId: input.deploymentId ?? undefined,
        type: input.type,
        message: input.message,
        metadata: input.metadata ?? {}
      }
    }).catch(() => {
      // Audit must never block a deployment workflow.
    });
  }
}

function toDbArtifactKind(kind: GeneratedArtifact["kind"]) {
  if (kind === "github-action") return "github_action";
  if (kind === "pulumi-preview") return "pulumi_preview";
  if (kind === "cloudformation-role") return "cloudformation_role";
  return kind;
}

function hashDeployToken(token: string): string {
  return createHash("sha256").update(token).digest("base64url");
}

function verifyDeployToken(token: string, expectedHash: string): boolean {
  const actual = Buffer.from(hashDeployToken(token));
  const expected = Buffer.from(expectedHash);
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

function parseBearerToken(authorization: string | undefined): string | null {
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}

function deploymentProfileLabel(profile: string | undefined): string | null {
  if (profile === "growth") return "Growth traffic";
  if (profile === "high-scale") return "Large user base";
  if (profile === "lean") return "Lean launch";
  return null;
}
