import { Injectable } from "@nestjs/common";
import { deploymentSuggestionSchema, isValidHealthPath } from "@awsify/deployment-schemas";
import { createDeploymentPlan } from "@awsify/templates";
import { GithubService } from "../github/github.service";
import { PrismaService } from "../prisma.service";

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly github: GithubService
  ) {}

  private getUserId(sessionToken: string | undefined): string | null {
    if (!sessionToken) return null;
    const session = this.github.verifySession(sessionToken);
    return session?.userId ?? null;
  }

  list() {
    return { projects: [] };
  }

  create(input: { name: string; repoFullName: string; branch: string }) {
    return { project: { id: `proj_${crypto.randomUUID()}`, ...input } };
  }

  async get(id: string, sessionToken: string | undefined) {
    const userId = this.getUserId(sessionToken);
    if (!userId) return { error: "not_authenticated" };
    const project = await this.prisma.project.findFirst({
      where: { id, userId },
      include: { repository: true, awsConnection: true }
    });
    return { project };
  }

  async getSettings(id: string, sessionToken: string | undefined) {
    const userId = this.getUserId(sessionToken);
    if (!userId) return { error: "not_authenticated" };

    const project = await this.prisma.project.findFirst({
      where: { id, userId },
      include: {
        repository: true,
        awsConnection: true,
        envVars: { orderBy: { name: "asc" } },
        plans: { orderBy: { updatedAt: "desc" }, take: 1, include: { artifacts: true } },
        deployments: { orderBy: { createdAt: "desc" }, take: 1 }
      }
    });
    if (!project) return { error: "not_found" };

    const plan = project.plans[0] ?? null;
    const suggestion = deploymentSuggestionSchema.safeParse(plan?.suggestion);

    return {
      settings: {
        id: project.id,
        name: project.name,
        branch: project.branch,
        repoFullName: project.repository.fullName,
        defaultBranch: project.repository.defaultBranch,
        awsAccountId: project.awsConnection?.accountId ?? null,
        awsRegion: project.awsConnection?.defaultRegion ?? plan?.region ?? null,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        latestDeployment: project.deployments[0]
          ? {
              id: project.deployments[0].id,
              status: project.deployments[0].status,
              liveUrl: project.deployments[0].liveUrl,
              createdAt: project.deployments[0].createdAt
            }
          : null,
        plan: plan
          ? {
              id: plan.id,
              status: plan.status,
              region: plan.region,
              approvedAt: plan.approvedAt,
              updatedAt: plan.updatedAt,
              port: suggestion.success ? suggestion.data.port : null,
              healthPath: suggestion.success ? suggestion.data.healthPath : null,
              artifactCount: plan.artifacts.length,
              editable: plan.status === "awaiting_approval"
            }
          : null,
        envVars: project.envVars.map((envVar) => ({
          name: envVar.name,
          valuePreview: envVar.valuePreview,
          required: envVar.required,
          updatedAt: envVar.updatedAt
        })),
        detectedEnvVars: suggestion.success ? suggestion.data.envVars : [],
        hasCiToken: Boolean(project.deployTokenHash)
      }
    };
  }

  async updateSettings(
    id: string,
    sessionToken: string | undefined,
    input: { branch?: string; port?: number; healthPath?: string }
  ) {
    const userId = this.getUserId(sessionToken);
    if (!userId) return { error: "not_authenticated" };

    const project = await this.prisma.project.findFirst({
      where: { id, userId },
      include: {
        repository: true,
        plans: { orderBy: { updatedAt: "desc" }, take: 1, include: { artifacts: true } }
      }
    });
    if (!project) return { error: "not_found" };

    const branch = input.branch?.trim();
    if (branch !== undefined && !/^[A-Za-z0-9._/-]{1,200}$/.test(branch)) {
      return { error: "invalid_branch" };
    }

    const latestPlan = project.plans[0] ?? null;
    const runtimeRequested = input.port !== undefined || input.healthPath !== undefined;
    if (runtimeRequested) {
      if (!latestPlan || latestPlan.status !== "awaiting_approval") return { error: "plan_not_awaiting_approval" };
      const suggestion = deploymentSuggestionSchema.safeParse(latestPlan.suggestion);
      if (!suggestion.success) return { error: "plan_not_ready" };
      const port = input.port ?? suggestion.data.port;
      const healthPath = input.healthPath ?? suggestion.data.healthPath;
      if (!Number.isInteger(port) || port < 1 || port > 65535) return { error: "invalid_port" };
      if (!isValidHealthPath(healthPath)) return { error: "invalid_health_path" };

      const region = process.env.AWS_REGION;
      const awsifyAccountId = process.env.AWSIFY_AWS_ACCOUNT_ID;
      if (!region || !awsifyAccountId) return { error: "AWS_REGION and AWSIFY_AWS_ACCOUNT_ID must be configured." };

      const nextSuggestion = { ...suggestion.data, port, healthPath };
      const regenerated = createDeploymentPlan({
        projectId: project.id,
        appName: latestPlan.appName,
        region,
        awsifyAccountId,
        externalId: `awsify-${project.id}`,
        suggestion: nextSuggestion
      });

      await this.prisma.deploymentPlan.update({
        where: { id: latestPlan.id },
        data: {
          suggestion: nextSuggestion as object,
          resources: regenerated.resources as object[],
          estimatedCost: regenerated.estimatedMonthlyCostUsd as object,
          artifacts: {
            deleteMany: {},
            create: regenerated.artifacts.map((artifact) => ({
              kind: artifact.kind === "github-action" ? "github_action" : artifact.kind === "pulumi-preview" ? "pulumi_preview" : artifact.kind === "cloudformation-role" ? "cloudformation_role" : artifact.kind,
              path: artifact.path,
              content: artifact.content,
              summary: artifact.summary
            }))
          }
        }
      });
    }

    if (branch !== undefined && branch !== project.branch) {
      await this.prisma.project.update({ where: { id: project.id }, data: { branch } });
    }

    await this.recordAudit({
      userId,
      projectId: project.id,
      type: "project_settings_update",
      message: "Updated project settings.",
      metadata: {
        ...(branch !== undefined ? { branch } : {}),
        ...(input.port !== undefined ? { port: input.port } : {}),
        ...(input.healthPath !== undefined ? { healthPath: input.healthPath } : {})
      }
    });

    return this.getSettings(id, sessionToken);
  }

  async auditEvents(id: string, sessionToken: string | undefined) {
    const userId = this.getUserId(sessionToken);
    if (!userId) return { error: "not_authenticated" };

    const project = await this.prisma.project.findFirst({ where: { id, userId }, select: { id: true } });
    if (!project) return { error: "not_found" };

    const events = await (this.prisma as PrismaService & {
      auditEvent: { findMany: (args: Record<string, unknown>) => Promise<Array<Record<string, unknown>>> };
    }).auditEvent.findMany({
      where: { projectId: id, userId },
      orderBy: { createdAt: "desc" },
      take: 100
    });
    return { events };
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
    }).catch(() => {});
  }
}
