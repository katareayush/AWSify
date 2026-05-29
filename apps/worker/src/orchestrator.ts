import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createAiProvider } from "@awsify/ai";
import type { DeploymentJob } from "@awsify/deployment-schemas";
import { collectKeyFiles, scanRepository } from "@awsify/repo-scanner";
import { createDeploymentPlan } from "@awsify/templates";

const execFileAsync = promisify(execFile);

export interface DeploymentEvent {
  status: "queued" | "scanning" | "awaiting_approval" | "deploying" | "deployed" | "failed";
  message: string;
  at: string;
}

export class DeploymentOrchestrator {
  private readonly ai = createAiProvider({ anthropicApiKey: process.env.ANTHROPIC_API_KEY });

  async deploy(job: DeploymentJob) {
    const events: DeploymentEvent[] = [];
    const emit = (status: DeploymentEvent["status"], message: string) => {
      const event = { status, message, at: new Date().toISOString() };
      events.push(event);
      console.log(`[deployment:${job.projectId}] ${status}: ${message}`);
    };

    emit("queued", "Deployment job accepted by worker.");
    const repoPath = await this.cloneRepository(job.repoFullName, job.branch);
    emit("scanning", "Repository cloned; running static scanner.");

    const scan = scanRepository(repoPath);
    const keyFiles = collectKeyFiles(repoPath);
    emit("scanning", `Static scan complete (${scan.signals.length} signals, ${keyFiles.length} key files). Sending to Claude for analysis.`);

    const suggestion = await this.ai.recommendDeployment({
      repoFullName: job.repoFullName,
      scan,
      keyFiles
    });

    const region = process.env.AWS_REGION;
    const awsifyAccountId = process.env.AWSIFY_AWS_ACCOUNT_ID;

    if (!region || !awsifyAccountId) {
      throw new Error("AWS_REGION and AWSIFY_AWS_ACCOUNT_ID must be configured before deployment planning.");
    }

    const plan = createDeploymentPlan({
      projectId: job.projectId,
      appName: sanitizeAppName(job.repoFullName),
      region,
      awsifyAccountId,
      externalId: `awsify-${job.projectId}`,
      suggestion
    });

    emit("deploying", `Approved plan ${job.approvedPlanId} maps to ${plan.resources.length} strict resources.`);

    // The first real AWS implementation plugs in here:
    // 1. Assume the stored customer role.
    // 2. Build the generated Dockerfile.
    // 3. Push to ECR.
    // 4. Run Pulumi Automation API with @awsify/pulumi-templates.
    // 5. Poll ECS/ALB health and persist the live URL.
    emit("deployed", "Dry-run worker path complete. AWS mutation is intentionally gated behind persisted approval and credentials.");

    return {
      status: "deployed",
      dryRun: true,
      events,
      planSummary: {
        appType: suggestion.appType,
        port: suggestion.port,
        resources: plan.resources.map((resource) => resource.type)
      }
    };
  }

  private async cloneRepository(repoFullName: string, branch: string) {
    const destination = mkdtempSync(join(tmpdir(), "awsify-repo-"));
    const githubToken = process.env.GITHUB_TOKEN;
    const repoUrl = githubToken
      ? `https://x-access-token:${githubToken}@github.com/${repoFullName}.git`
      : `https://github.com/${repoFullName}.git`;

    await execFileAsync("git", ["clone", "--depth", "1", "--branch", branch, repoUrl, destination], {
      timeout: 120_000
    });

    return destination;
  }
}

function sanitizeAppName(repoFullName: string) {
  const name = repoFullName.split("/").pop() ?? "awsify-app";
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .padEnd(3, "x");
}
