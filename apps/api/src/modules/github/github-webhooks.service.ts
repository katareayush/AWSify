import { Injectable } from "@nestjs/common";
import { createHmac, timingSafeEqual } from "node:crypto";
import { PrismaService } from "../prisma.service";

// Only react to our own deploy workflow, not any other Actions in the repo.
const WORKFLOW_PATH = ".github/workflows/awsify-deploy.yml";

// Conclusions that mean the build never produced an image (so it never called
// the redeploy endpoint) — the placeholder deployment would otherwise hang.
const FAILED_CONCLUSIONS = new Set(["failure", "cancelled", "timed_out", "startup_failure", "stale", "action_required"]);

interface WorkflowRunPayload {
  action?: string;
  workflow_run?: {
    path?: string;
    name?: string;
    conclusion?: string | null;
    html_url?: string;
    head_branch?: string;
  };
  repository?: { full_name?: string };
}

/**
 * Handles GitHub App webhooks. Right now it only closes the loop on GitHub
 * Actions builds: a failed build never calls back into /deployments/redeploy,
 * so without this the placeholder deployment created by approve()/redeployLatest
 * would sit in "deploying" forever. On a failed run we mark that deployment
 * failed with a link to the run; a successful run is left alone (the redeploy
 * callback + worker own its lifecycle).
 */
@Injectable()
export class GithubWebhooksService {
  constructor(private readonly prisma: PrismaService) {}

  /** Returns true only when a webhook secret is set and the signature matches. */
  verifySignature(rawBody: Buffer | undefined, signature: string | undefined): boolean {
    const secret = process.env.GITHUB_WEBHOOK_SECRET;
    if (!secret || !rawBody || !signature) return false;
    const expected = `sha256=${createHmac("sha256", secret).update(rawBody).digest("hex")}`;
    const a = Buffer.from(expected);
    const b = Buffer.from(signature);
    return a.length === b.length && timingSafeEqual(a, b);
  }

  async handleEvent(event: string | undefined, payload: WorkflowRunPayload): Promise<void> {
    if (event !== "workflow_run") return;
    const run = payload.workflow_run;
    const fullName = payload.repository?.full_name;
    if (!run || run.path !== WORKFLOW_PATH || !fullName) return;

    // Find the deployment this build is standing in for: the newest one still
    // showing "deploying" for this repo (the placeholder awaiting a build).
    const pending = await this.prisma.deployment.findFirst({
      where: { status: "deploying", project: { repository: { fullName } } },
      orderBy: { createdAt: "desc" }
    });
    if (!pending) return;

    if ((payload.action === "requested" || payload.action === "in_progress") && run.html_url) {
      await this.appendLog(pending.id, "deploying", `GitHub Actions build in progress: ${run.html_url}`);
      return;
    }

    if (payload.action === "completed" && run.conclusion && FAILED_CONCLUSIONS.has(run.conclusion)) {
      const reason = `GitHub Actions build ${run.conclusion}${run.html_url ? ` (${run.html_url})` : ""}. Fix the build and push again — the release runs automatically once the image is built.`;
      await this.prisma.deployment.update({
        where: { id: pending.id },
        data: {
          status: "failed",
          failureReason: reason,
          logs: [...(Array.isArray(pending.logs) ? pending.logs : []), { status: "failed", message: reason, at: new Date().toISOString() }] as never
        }
      }).catch(() => {/* best-effort: never throw out of a webhook */});
    }
  }

  private async appendLog(deploymentId: string, status: string, message: string): Promise<void> {
    const current = await this.prisma.deployment.findUnique({ where: { id: deploymentId }, select: { logs: true } }).catch(() => null);
    if (!current) return;
    const logs = Array.isArray(current.logs) ? current.logs : [];
    await this.prisma.deployment.update({
      where: { id: deploymentId },
      data: { logs: [...logs, { status, message, at: new Date().toISOString() }] as never }
    }).catch(() => {/* best-effort */});
  }
}
