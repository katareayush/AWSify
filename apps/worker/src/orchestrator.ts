import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile, exec } from "node:child_process";
import { promisify } from "node:util";
import { createAiProvider } from "@awsify/ai";
import { PrismaClient } from "@awsify/database";
import type { DeploymentJob, DeploymentPlan } from "@awsify/deployment-schemas";
import { collectKeyFiles, scanRepository, type RepoScanResult } from "@awsify/repo-scanner";
import { createDeploymentPlan, generateDockerfile } from "@awsify/templates";
import { createStack } from "@awsify/pulumi-templates";
import type { AiRecommendationResult } from "@awsify/ai";
import { ECRClient, CreateRepositoryCommand, DescribeRepositoriesCommand, GetAuthorizationTokenCommand } from "@aws-sdk/client-ecr";
import { STSClient, AssumeRoleCommand } from "@aws-sdk/client-sts";
import { LocalWorkspace, type PulumiFn } from "@pulumi/pulumi/automation";

const execFileAsync = promisify(execFile);
const execAsync = promisify(exec);

export interface DeploymentEvent {
  status: "queued" | "scanning" | "awaiting_approval" | "deploying" | "deployed" | "failed";
  message: string;
  at: string;
}

interface AwsCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken: string;
}

export class DeploymentOrchestrator {
  private readonly ai = createAiProvider({ anthropicApiKey: process.env.ANTHROPIC_API_KEY });
  private readonly prisma = new PrismaClient();

  async deploy(job: DeploymentJob) {
    const events: DeploymentEvent[] = [];
    const emit = async (status: DeploymentEvent["status"], message: string) => {
      const event = { status, message, at: new Date().toISOString() };
      events.push(event);
      console.log(`[deployment:${job.projectId}] ${status}: ${message}`);
      if (job.deploymentId) {
        await this.prisma.deployment.update({
          where: { id: job.deploymentId },
          data: {
            status: status as never,
            logs: { push: event } as never
          }
        }).catch(() => {/* non-fatal — don't break deployment over a log write */});
      }
    };

    try {
    await emit("scanning", "Deployment job accepted by worker.");

    const repoPath = await this.cloneRepository(job.repoFullName, job.branch);
    await emit("scanning", "Repository cloned; running static scanner.");

    const scan = scanRepository(repoPath);
    const keyFiles = collectKeyFiles(repoPath);
    await emit("scanning", `Scan complete: ${scan.appType} → ${scan.computeTarget} (${scan.signals.length} signals). Sending to Claude.`);

    const aiResult = await this.ai.recommendDeployment({ repoFullName: job.repoFullName, scan, keyFiles });
    const { suggestion } = aiResult;
    await emit("scanning", `AI recommendation: ${suggestion.appType} on ${suggestion.computeTarget} (confidence ${suggestion.confidence.toFixed(2)})`);

    const region = process.env.AWS_REGION;
    const awsifyAccountId = process.env.AWSIFY_AWS_ACCOUNT_ID;
    if (!region || !awsifyAccountId) {
      throw new Error("AWS_REGION and AWSIFY_AWS_ACCOUNT_ID must be configured.");
    }

    const plan = createDeploymentPlan({
      projectId: job.projectId,
      appName: sanitizeAppName(job.repoFullName),
      region,
      awsifyAccountId,
      externalId: `awsify-${job.projectId}`,
      suggestion
    });

    // Persist the real plan data to the placeholder plan record
    if (job.deploymentId) {
      await this.prisma.deploymentPlan.update({
        where: { id: job.approvedPlanId },
        data: {
          suggestion: suggestion as object,
          resources: plan.resources as object[],
          estimatedCost: plan.estimatedMonthlyCostUsd as object,
          status: "approved"
        }
      }).catch(() => {});
    }

    // Load customer AWS connection
    const connection = await this.prisma.awsConnection.findUnique({ where: { id: job.awsConnectionId } });
    if (!connection) throw new Error(`AWS connection ${job.awsConnectionId} not found.`);

    await emit("deploying", `Assuming customer role ${connection.roleArn}`);
    const credentials = await this.assumeRole(connection.roleArn, connection.externalId, region);

    let imageUri: string | undefined;

    if (suggestion.computeTarget !== "s3-cloudfront") {
      const dockerfilePath = await this.resolveDockerfile(repoPath, scan, aiResult, emit);
      await emit("deploying", `Dockerfile source: ${dockerfilePath}`);
      await emit("deploying", "Creating ECR repository and building container image.");
      const repositoryUri = await this.ensureEcrRepo(plan.appName, region, credentials);
      imageUri = `${repositoryUri}:${job.branch.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
      await this.buildAndPushImage(repoPath, imageUri, repositoryUri, region, credentials);
      await emit("deploying", `Image pushed: ${imageUri}`);
    } else {
      await emit("deploying", "Static site: building assets.");
      const pm = suggestion.packageManager === "pnpm" ? "pnpm" : suggestion.packageManager === "yarn" ? "yarn" : "npm";
      await execFileAsync(pm, ["run", "build"], { cwd: repoPath });
      await emit("deploying", "Static build complete.");
    }

    await emit("deploying", `Running Pulumi stack (${suggestion.computeTarget}).`);
    const outputs = await this.runPulumiStack(plan, imageUri, credentials, repoPath, emit);

    const liveUrl =
      typeof outputs.liveUrl?.value === "string"
        ? outputs.liveUrl.value
        : (outputs as Record<string, { value: string } | undefined>)["liveUrl"]?.value;

    if (suggestion.computeTarget === "s3-cloudfront" && outputs.bucketName?.value) {
      await emit("deploying", `Syncing static files to s3://${outputs.bucketName.value}`);
      const { statSync } = await import("node:fs");
      const buildDir = ["dist", "out", "build"].find(d => {
        try { statSync(join(repoPath, d)); return true; } catch { return false; }
      }) ?? "dist";
      await execFileAsync("aws", ["s3", "sync", join(repoPath, buildDir), `s3://${outputs.bucketName.value}`, "--delete", "--region", region], {
        env: { ...process.env, AWS_ACCESS_KEY_ID: credentials.accessKeyId, AWS_SECRET_ACCESS_KEY: credentials.secretAccessKey, AWS_SESSION_TOKEN: credentials.sessionToken }
      });
      await emit("deploying", "Static files synced to S3.");
    }

    await emit("deployed", `Live at: ${liveUrl ?? "(URL pending DNS propagation)"}`);

    if (job.deploymentId && liveUrl) {
      await this.prisma.deployment.update({ where: { id: job.deploymentId }, data: { liveUrl, status: "deployed" } }).catch(() => {});
    }

    return { status: "deployed", liveUrl, events };

    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      await emit("failed", `Deployment failed: ${reason}`);
      if (job.deploymentId) {
        await this.prisma.deployment.update({ where: { id: job.deploymentId }, data: { status: "failed", failureReason: reason } }).catch(() => {});
      }
      throw err;
    }
  }

  /**
   * Three-tier Dockerfile resolution:
   *   1. Repo already has one → use it, nothing to write.
   *   2. AI detected non-standard structure → write AI-generated content.
   *   3. Standard project → write static template content.
   * Returns a short label for the emit log.
   */
  private async resolveDockerfile(
    repoPath: string,
    scan: RepoScanResult,
    aiResult: AiRecommendationResult,
    emit: (status: DeploymentEvent["status"], msg: string) => Promise<void>
  ): Promise<string> {
    if (scan.hasDockerfile) {
      emit("scanning", "Dockerfile already present in repository — using as-is.");
      return "existing";
    }

    if (aiResult.dockerfile) {
      emit("scanning", "Non-standard structure detected — using AI-generated Dockerfile.");
      writeFileSync(join(repoPath, "Dockerfile"), aiResult.dockerfile, "utf8");
      return "ai-generated";
    }

    emit("scanning", "Standard project structure — using static Dockerfile template.");
    writeFileSync(join(repoPath, "Dockerfile"), generateDockerfile(aiResult.suggestion), "utf8");
    return "static-template";
  }

  private async cloneRepository(repoFullName: string, branch: string) {
    const destination = mkdtempSync(join(tmpdir(), "awsify-repo-"));
    const githubToken = process.env.GITHUB_TOKEN;
    const repoUrl = githubToken
      ? `https://x-access-token:${githubToken}@github.com/${repoFullName}.git`
      : `https://github.com/${repoFullName}.git`;

    await execFileAsync("git", ["clone", "--depth", "1", "--branch", branch, repoUrl, destination], { timeout: 120_000 });
    return destination;
  }

  private async assumeRole(roleArn: string, externalId: string, region: string): Promise<AwsCredentials> {
    const sts = new STSClient({ region });
    const response = await sts.send(new AssumeRoleCommand({
      RoleArn: roleArn,
      RoleSessionName: "awsify-deployment",
      ExternalId: externalId,
      DurationSeconds: 3600
    }));

    if (!response.Credentials) throw new Error("STS AssumeRole returned no credentials.");
    return {
      accessKeyId: response.Credentials.AccessKeyId!,
      secretAccessKey: response.Credentials.SecretAccessKey!,
      sessionToken: response.Credentials.SessionToken!
    };
  }

  private async ensureEcrRepo(appName: string, region: string, credentials: AwsCredentials): Promise<string> {
    const ecr = new ECRClient({
      region,
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
        sessionToken: credentials.sessionToken
      }
    });

    try {
      const result = await ecr.send(new CreateRepositoryCommand({
        repositoryName: appName,
        imageScanningConfiguration: { scanOnPush: true }
      }));
      return result.repository!.repositoryUri!;
    } catch (err: unknown) {
      if ((err as { name?: string }).name === "RepositoryAlreadyExistsException") {
        const existing = await ecr.send(new DescribeRepositoriesCommand({ repositoryNames: [appName] }));
        return existing.repositories![0].repositoryUri!;
      }
      throw err;
    }
  }

  private async buildAndPushImage(
    repoPath: string,
    imageUri: string,
    repositoryUri: string,
    region: string,
    credentials: AwsCredentials
  ) {
    const ecr = new ECRClient({
      region,
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
        sessionToken: credentials.sessionToken
      }
    });

    const authData = await ecr.send(new GetAuthorizationTokenCommand({}));
    const authToken = Buffer.from(authData.authorizationData![0].authorizationToken!, "base64").toString();
    const [username, password] = authToken.split(":");
    const registry = repositoryUri.split("/")[0];

    await execAsync(`echo '${password.replace(/'/g, "'\\''")}' | docker login --username ${username} --password-stdin ${registry}`, { timeout: 60_000 });

    await execFileAsync("docker", ["build", "-t", imageUri, repoPath], { timeout: 600_000 });
    await execFileAsync("docker", ["push", imageUri], { timeout: 300_000 });
  }

  private async runPulumiStack(
    plan: DeploymentPlan,
    imageUri: string | undefined,
    credentials: AwsCredentials,
    _repoPath: string,
    emit: (status: DeploymentEvent["status"], msg: string) => Promise<void>
  ) {
    const stateDir = join(tmpdir(), "awsify-state", plan.projectId);
    mkdirSync(stateDir, { recursive: true });

    const environment = Object.fromEntries(
      plan.suggestion.envVars.map(v => [v.name, process.env[v.name] ?? ""])
    );

    const program: PulumiFn = async () => {
      return createStack({ plan, imageUri, environment });
    };

    const stack = await LocalWorkspace.createOrSelectStack(
      { stackName: "production", projectName: plan.appName, program },
      {
        workDir: stateDir,
        envVars: {
          PULUMI_BACKEND_URL: `file://${stateDir}`,
          PULUMI_CONFIG_PASSPHRASE: "",
          AWS_ACCESS_KEY_ID: credentials.accessKeyId,
          AWS_SECRET_ACCESS_KEY: credentials.secretAccessKey,
          AWS_SESSION_TOKEN: credentials.sessionToken,
          AWS_REGION: plan.region
        }
      }
    );

    await stack.setConfig("aws:region", { value: plan.region });

    const result = await stack.up({
      onOutput: msg => {
        const trimmed = msg.trim();
        if (trimmed) emit("deploying", trimmed);
      }
    });

    return result.outputs as Record<string, { value: string }>;
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
