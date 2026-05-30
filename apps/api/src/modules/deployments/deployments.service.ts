import { Injectable } from "@nestjs/common";
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

    const repo = await this.prisma.repository.findUnique({ where: { id: input.repoId } });
    if (!repo) return { error: "repo_not_found" };

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
        region: process.env.AWS_REGION ?? "us-east-1",
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
        project: { include: { repository: true } },
        plan: { include: { artifacts: true } }
      }
    });
    if (!deployment) return { error: "not_found" };

    return { deployment };
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
