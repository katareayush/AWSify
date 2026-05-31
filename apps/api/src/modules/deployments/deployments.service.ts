import { Injectable } from "@nestjs/common";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { encryptSecret, previewSecret } from "@awsify/config";
import { deploymentSuggestionSchema } from "@awsify/deployment-schemas";
import { PrismaService } from "../prisma.service";
import { QueueService } from "../queue/queue.service";
import type { GithubService } from "../github/github.service";

const SESSION_COOKIE = "aws_ify_session";

function sanitizeAppName(repoFullName: string): string {
  const name = repoFullName.split("/").pop() ?? "awsify-app";
  return name.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/^-+|-+$/g, "").slice(0, 40).padEnd(3, "x");
}

@Injectable()
export class DeploymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: QueueService,
    private readonly github: GithubService
  ) {}

  private getUserId(sessionToken: string | undefined): string | null {
    if (!sessionToken) return null;
    const session = this.github.verifySession(sessionToken);
    return session?.userId ?? null;
  }

  async trigger(
    sessionToken: string | undefined,
    input: { repoId: string; branch: string; awsConnectionId: string }
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

    const deployment = await this.prisma.deployment.create({
      data: { projectId: project.id, planId: plan.id, actorUserId: userId, status: "queued", logs: [] }
    });

    await this.queue.enqueueDeployment({
      projectId: project.id,
      repoFullName: repo.fullName,
      branch: input.branch,
      awsConnectionId: input.awsConnectionId,
      approvedPlanId: plan.id,
      actorUserId: userId,
      deploymentId: deployment.id
    });

    return { deploymentId: deployment.id };
  }

  async list(sessionToken: string | undefined) {
    const userId = this.getUserId(sessionToken);
    if (!userId) return { error: "not_authenticated" };

    const deployments = await this.prisma.deployment.findMany({
      where: { actorUserId: userId },
      include: { project: { include: { repository: true } } },
      orderBy: { createdAt: "desc" },
      take: 50
    });

    return {
      deployments: deployments.map(d => ({
        id: d.id,
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
    if (deployment.plan.status !== "awaiting_approval") return { error: "plan_not_awaiting_approval" };

    const suggestion = deploymentSuggestionSchema.safeParse(deployment.plan.suggestion);
    if (!suggestion.success) return { error: "plan_not_ready" };

    const allowed = new Map(suggestion.data.envVars.map((envVar) => [envVar.name, envVar]));
    const entries = Object.entries(input.env ?? {}).filter(([, value]) => value.length > 0);
    const unsupported = entries.map(([name]) => name).filter((name) => !allowed.has(name));
    if (unsupported.length > 0) return { error: `unsupported_env_vars: ${unsupported.join(", ")}` };

    await this.prisma.$transaction(
      entries.map(([name, value]) => {
        const requirement = allowed.get(name);
        return this.prisma.projectEnvVar.upsert({
          where: { projectId_name: { projectId: deployment.projectId, name } },
          create: {
            projectId: deployment.projectId,
            name,
            encryptedValue: encryptSecret(value),
            valuePreview: previewSecret(value),
            required: requirement?.required ?? true
          },
          update: {
            encryptedValue: encryptSecret(value),
            valuePreview: previewSecret(value),
            required: requirement?.required ?? true
          }
        });
      })
    );

    return { saved: entries.map(([name]) => name) };
  }

  async rotateCiToken(deploymentId: string, sessionToken: string | undefined) {
    const userId = this.getUserId(sessionToken);
    if (!userId) return { error: "not_authenticated" };

    const deployment = await this.prisma.deployment.findFirst({
      where: { id: deploymentId, actorUserId: userId },
      include: { project: true }
    });
    if (!deployment) return { error: "not_found" };

    const token = `awsify_${randomBytes(32).toString("base64url")}`;
    await this.prisma.project.update({
      where: { id: deployment.projectId },
      data: { deployTokenHash: hashDeployToken(token) }
    });

    return {
      token,
      secretName: "AWSIFY_API_TOKEN",
      variableName: "AWSIFY_API_URL",
      projectId: deployment.projectId
    };
  }

  async redeployWithToken(input: { projectId: string; branch?: string }, authorization: string | undefined) {
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
          message: "Code redeploy queued by GitHub Actions.",
          at: new Date().toISOString()
        }]
      }
    });

    await this.queue.enqueueDeployment({
      projectId: project.id,
      repoFullName: project.repository.fullName,
      branch,
      awsConnectionId: project.awsConnectionId,
      approvedPlanId: approvedPlan.id,
      actorUserId: project.userId,
      deploymentId: deployment.id
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

    const requiredEnvNames = suggestion.data.envVars.filter((envVar) => envVar.required).map((envVar) => envVar.name);
    if (requiredEnvNames.length > 0) {
      const stored = await this.prisma.projectEnvVar.findMany({
        where: { projectId: deployment.projectId, name: { in: requiredEnvNames } },
        select: { name: true }
      });
      const storedNames = new Set(stored.map((envVar) => envVar.name));
      const missing = requiredEnvNames.filter((name) => !storedNames.has(name));
      if (missing.length > 0) return { error: `missing_env_vars: ${missing.join(", ")}` };
    }

    await this.prisma.deploymentPlan.update({
      where: { id: deployment.planId },
      data: { status: "approved", approvedAt: new Date() }
    });

    await this.updateStatus(deployment.id, {
      status: "queued",
      appendLog: {
        status: "queued",
        message: "Plan approved; deployment queued.",
        at: new Date().toISOString()
      }
    });

    await this.queue.enqueueDeployment({
      projectId: deployment.projectId,
      repoFullName: deployment.project.repository.fullName,
      branch: deployment.project.branch,
      awsConnectionId: deployment.project.awsConnectionId,
      approvedPlanId: deployment.planId,
      actorUserId: userId,
      deploymentId: deployment.id
    });

    return { deploymentId: deployment.id, status: "queued" };
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
