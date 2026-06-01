import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile, spawn } from "node:child_process";
import { createSign } from "node:crypto";
import { promisify } from "node:util";
import { createAiProvider } from "@awsify/ai";
import { decryptSecret } from "@awsify/config";
import { PrismaClient } from "@awsify/database";
import type { DeploymentJob, DeploymentPlan, DeploymentSuggestion, GeneratedArtifact } from "@awsify/deployment-schemas";
import { collectKeyFiles, scanRepository, type RepoScanResult } from "@awsify/repo-scanner";
import { createDeploymentPlan, generateDockerfile } from "@awsify/templates";
import { createStack } from "@awsify/pulumi-templates";
import { ECRClient, CreateRepositoryCommand, DescribeRepositoriesCommand, GetAuthorizationTokenCommand } from "@aws-sdk/client-ecr";
import { STSClient, AssumeRoleCommand } from "@aws-sdk/client-sts";
import { LocalWorkspace, type PulumiFn } from "@pulumi/pulumi/automation";

const execFileAsync = promisify(execFile);

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
        const current = await this.prisma.deployment.findUnique({
          where: { id: job.deploymentId },
          select: { logs: true }
        }).catch(() => null);
        const logs = Array.isArray(current?.logs) ? current.logs : [];
        await this.prisma.deployment.update({
          where: { id: job.deploymentId },
          data: { status: status as never, logs: [...logs, event] as never }
        }).catch(() => {/* non-fatal: don't break deployment over a log write */});
      }
    };

    try {
    await emit("scanning", "Deployment job accepted by worker.");

    const planRecord = await this.prisma.deploymentPlan.findUnique({
      where: { id: job.approvedPlanId },
      include: { artifacts: true }
    });
    if (!planRecord) throw new Error(`Deployment plan ${job.approvedPlanId} not found.`);

    const repoPath = await this.cloneRepository(job);
    await emit("scanning", "Repository cloned; running static scanner.");

    const region = process.env.AWS_REGION;
    const awsifyAccountId = process.env.AWSIFY_AWS_ACCOUNT_ID;
    if (!region || !awsifyAccountId) {
      throw new Error("AWS_REGION and AWSIFY_AWS_ACCOUNT_ID must be configured.");
    }

    const scan = scanRepository(repoPath);

    if (planRecord.status !== "approved") {
      const keyFiles = collectKeyFiles(repoPath);
      await emit("scanning", `Scan complete: ${scan.appType} -> ${scan.computeTarget} (${scan.signals.length} signals). Sending to Claude.`);

      const aiResult = await this.ai.recommendDeployment({ repoFullName: job.repoFullName, scan, keyFiles });
      const { suggestion } = aiResult;
      await emit("scanning", `AI recommendation: ${suggestion.appType} on ${suggestion.computeTarget} (confidence ${suggestion.confidence.toFixed(2)})`);

      const plan = createDeploymentPlan({
        projectId: job.projectId,
        appName: sanitizeAppName(job.repoFullName),
        region,
        awsifyAccountId,
        externalId: `awsify-${job.projectId}`,
        suggestion
      });

      await this.prisma.deploymentPlan.update({
        where: { id: job.approvedPlanId },
        data: {
          suggestion: suggestion as object,
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
      await emit("awaiting_approval", "Plan and preview artifacts are ready. Deployment is paused until user approval.");
      return { status: "awaiting_approval", events };
    }

    const plan = hydratePlan(planRecord);
    await emit("deploying", "Approved plan loaded; starting AWS deployment.");

    // Load customer AWS connection
    const connection = await this.prisma.awsConnection.findUnique({ where: { id: job.awsConnectionId } });
    if (!connection) throw new Error(`AWS connection ${job.awsConnectionId} not found.`);

    await emit("deploying", `Assuming customer role ${connection.roleArn}`);
    const credentials = await this.assumeRole(connection.roleArn, connection.externalId, region);

    const dockerfilePath = await this.resolveDockerfile(repoPath, scan, plan, emit);
    await emit("deploying", `Dockerfile source: ${dockerfilePath}`);
    await emit("deploying", "Creating ECR repository and building container image.");
    const repositoryUri = await this.ensureEcrRepo(plan.appName, region, credentials);
    const imageUri = `${repositoryUri}:${job.branch.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
    await this.buildAndPushImage(repoPath, imageUri, repositoryUri, region, credentials);
    await emit("deploying", `Image pushed: ${imageUri}`);

    await emit("deploying", `Running Pulumi stack (${plan.suggestion.computeTarget}).`);
    const outputs = await this.runPulumiStack(plan, imageUri, credentials, repoPath, emit);

    const liveUrl =
      typeof outputs.liveUrl?.value === "string"
        ? outputs.liveUrl.value
        : (outputs as Record<string, { value: string } | undefined>)["liveUrl"]?.value;

    if (liveUrl) {
      await emit("deploying", `Checking service health at ${liveUrl}${plan.suggestion.healthPath}`);
      await waitForHttpHealth(liveUrl, plan.suggestion.healthPath, emit);
    }

    await emit("deployed", `Live at: ${liveUrl ?? "(URL pending DNS propagation)"}`);

    if (job.deploymentId && liveUrl) {
      await this.prisma.deployment.update({ where: { id: job.deploymentId }, data: { liveUrl, status: "deployed" } }).catch(() => {});
    }

    return { status: "deployed", liveUrl, events };

    } catch (err) {
      const reason = explainDeploymentError(err);
      await emit("failed", `Deployment failed: ${reason}`);
      if (job.deploymentId) {
        await this.prisma.deployment.update({ where: { id: job.deploymentId }, data: { status: "failed", failureReason: reason } }).catch(() => {});
      }
      throw err;
    }
  }

  /**
   * Two-tier Dockerfile resolution:
   *   1. Repo already has one: use it, nothing to write.
   *   2. Otherwise write the approved AWS-ify template artifact.
   * Returns a short label for the emit log.
   */
  private async resolveDockerfile(
    repoPath: string,
    scan: RepoScanResult,
    plan: DeploymentPlan,
    emit: (status: DeploymentEvent["status"], msg: string) => Promise<void>
  ): Promise<string> {
    if (scan.hasDockerfile) {
      await emit("scanning", "Dockerfile already present in repository - using as-is.");
      return "existing";
    }

    await emit("scanning", "No Dockerfile in repository - using approved AWS-ify Dockerfile template.");
    const artifact = plan.artifacts.find((item) => item.kind === "dockerfile");
    writeFileSync(join(repoPath, "Dockerfile"), artifact?.content ?? generateDockerfile(plan.suggestion), "utf8");
    return "awsify-template";
  }

  private async cloneRepository(job: DeploymentJob) {
    const destination = mkdtempSync(join(tmpdir(), "awsify-repo-"));
    const installation = await this.prisma.project.findUnique({
      where: { id: job.projectId },
      include: { repository: { include: { installation: true } } }
    });
    const installationId = installation?.repository.installation.installationId;
    if (!installationId) throw new Error("GitHub App installation not found for selected repository.");

    const githubToken = await createInstallationToken(installationId);
    const repoUrl = `https://x-access-token:${githubToken}@github.com/${job.repoFullName}.git`;

    try {
      await execFileAsync("git", ["clone", "--depth", "1", "--branch", job.branch, repoUrl, destination], { timeout: 120_000 });
    } catch (error) {
      throw new Error(`GitHub clone failed. Check GitHub App repository access and branch "${job.branch}". ${extractProcessError(error)}`);
    }
    return destination;
  }

  private async assumeRole(roleArn: string, externalId: string, region: string): Promise<AwsCredentials> {
    const sts = new STSClient({ region });
    let response;
    try {
      response = await sts.send(new AssumeRoleCommand({
        RoleArn: roleArn,
        RoleSessionName: "awsify-deployment",
        ExternalId: externalId,
        DurationSeconds: 3600
      }));
    } catch (error) {
      throw new Error(`AWS role assumption failed. Recreate the CloudFormation role or verify the external ID. ${extractProcessError(error)}`);
    }

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

    try {
      await dockerLogin(username, password, registry);
    } catch (error) {
      throw new Error(`Docker login to ECR failed. Check ECR permissions on the AWS-ify role. ${extractProcessError(error)}`);
    }

    try {
      await execFileAsync("docker", ["build", "-t", imageUri, repoPath], { timeout: 600_000 });
    } catch (error) {
      throw new Error(`Docker build failed. Check the Dockerfile, build command, and package install step. ${extractProcessError(error)}`);
    }

    try {
      await execFileAsync("docker", ["push", imageUri], { timeout: 300_000 });
    } catch (error) {
      throw new Error(`Docker push to ECR failed. Check ECR push permissions and repository access. ${extractProcessError(error)}`);
    }
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

    const storedEnvVars = await this.prisma.projectEnvVar.findMany({
      where: { projectId: plan.projectId }
    });
    const storedByName = new Map(storedEnvVars.map((envVar) => [envVar.name, envVar]));
    const missingRequiredEnv = plan.suggestion.envVars.filter((envVar) => envVar.required && !storedByName.has(envVar.name));
    if (missingRequiredEnv.length > 0) {
      throw new Error(`Deployment requires project env vars that are not stored yet: ${missingRequiredEnv.map((envVar) => envVar.name).join(", ")}`);
    }
    const environment = Object.fromEntries(
      plan.suggestion.envVars
        .map((envVar) => {
          const stored = storedByName.get(envVar.name);
          return stored ? [envVar.name, decryptSecret(stored.encryptedValue)] : null;
        })
        .filter((entry): entry is [string, string] => entry !== null)
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
          PULUMI_CONFIG_PASSPHRASE: requireEnv("PULUMI_CONFIG_PASSPHRASE"),
          AWS_ACCESS_KEY_ID: credentials.accessKeyId,
          AWS_SECRET_ACCESS_KEY: credentials.secretAccessKey,
          AWS_SESSION_TOKEN: credentials.sessionToken,
          AWS_REGION: plan.region
        }
      }
    );

    await stack.setConfig("aws:region", { value: plan.region });

    let result;
    try {
      result = await stack.up({
        onOutput: msg => {
          const trimmed = msg.trim();
          if (trimmed) emit("deploying", trimmed);
        }
      });
    } catch (error) {
      throw new Error(`Pulumi apply failed. Check AWS role permissions, default VPC availability, and ECS/ALB quotas. ${extractProcessError(error)}`);
    }

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

function hydratePlan(planRecord: {
  id: string;
  projectId: string;
  appName: string;
  region: string;
  suggestion: unknown;
  resources: unknown;
  estimatedCost: unknown;
  status: string;
  artifacts: Array<{ kind: string; path: string; content: string; summary: string }>;
}): DeploymentPlan {
  return {
    id: planRecord.id,
    projectId: planRecord.projectId,
    appName: planRecord.appName,
    region: planRecord.region,
    suggestion: planRecord.suggestion as DeploymentSuggestion,
    resources: planRecord.resources as DeploymentPlan["resources"],
    artifacts: planRecord.artifacts.map((artifact) => ({
      kind: fromDbArtifactKind(artifact.kind),
      path: artifact.path,
      content: artifact.content,
      summary: artifact.summary
    })),
    estimatedMonthlyCostUsd: planRecord.estimatedCost as DeploymentPlan["estimatedMonthlyCostUsd"],
    requiresApproval: true,
    status: "approved"
  };
}

function toDbArtifactKind(kind: GeneratedArtifact["kind"]) {
  if (kind === "github-action") return "github_action";
  if (kind === "pulumi-preview") return "pulumi_preview";
  if (kind === "cloudformation-role") return "cloudformation_role";
  return kind;
}

function fromDbArtifactKind(kind: string): GeneratedArtifact["kind"] {
  if (kind === "github_action") return "github-action";
  if (kind === "pulumi_preview") return "pulumi-preview";
  if (kind === "cloudformation_role") return "cloudformation-role";
  return kind as GeneratedArtifact["kind"];
}

function dockerLogin(username: string, password: string, registry: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn("docker", ["login", "--username", username, "--password-stdin", registry], {
      stdio: ["pipe", "pipe", "pipe"]
    });
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`docker login failed: ${stderr.trim() || `exit ${code}`}`));
    });
    child.stdin.end(password);
  });
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} must be configured.`);
  return value;
}

async function waitForHttpHealth(
  liveUrl: string,
  healthPath: string,
  emit: (status: DeploymentEvent["status"], msg: string) => Promise<void>
): Promise<void> {
  const url = new URL(healthPath || "/", liveUrl);
  let lastError = "";

  for (let attempt = 1; attempt <= 20; attempt += 1) {
    try {
      const response = await fetch(url, { method: "GET" });
      if (response.status >= 200 && response.status < 400) {
        await emit("deploying", `Health check passed with HTTP ${response.status}.`);
        return;
      }
      lastError = `HTTP ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }

    if (attempt === 1 || attempt % 5 === 0) {
      await emit("deploying", `Waiting for healthy response (${attempt}/20): ${lastError}`);
    }
    await sleep(15_000);
  }

  throw new Error(`ALB health check failed at ${url.toString()}. Last result: ${lastError}. Confirm the app listens on the configured port and responds on the health path.`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function explainDeploymentError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/Cannot connect to the Docker daemon|docker daemon/i.test(message)) {
    return "Docker is not running on the worker machine. Start Docker and retry the deployment.";
  }
  if (/no basic auth credentials|denied|authorization/i.test(message) && /docker|ecr/i.test(message)) {
    return `Container registry authentication failed. ${message}`;
  }
  if (/AccessDenied|not authorized|UnauthorizedOperation/i.test(message)) {
    return `AWS permission denied. Update the CloudFormation role permissions and retry. ${message}`;
  }
  if (/Target group|health check|healthy response|ALB/i.test(message)) {
    return message;
  }
  if (/branch|clone|repository/i.test(message)) {
    return message;
  }
  return message;
}

function extractProcessError(error: unknown): string {
  if (error && typeof error === "object") {
    const maybe = error as { stderr?: unknown; stdout?: unknown; message?: unknown };
    const stderr = typeof maybe.stderr === "string" ? maybe.stderr.trim() : "";
    const stdout = typeof maybe.stdout === "string" ? maybe.stdout.trim() : "";
    const message = typeof maybe.message === "string" ? maybe.message.trim() : "";
    return [stderr, stdout, message].filter(Boolean).join(" ").slice(0, 1000);
  }
  return String(error);
}

async function createInstallationToken(installationId: string): Promise<string> {
  const appJwt = createGithubAppJwt();
  const res = await fetch(`https://api.github.com/app/installations/${installationId}/access_tokens`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${appJwt}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28"
    }
  });
  const data = (await res.json()) as { token?: string; message?: string };
  if (!res.ok || !data.token) {
    throw new Error(data.message ?? `Failed to create GitHub installation token for ${installationId}.`);
  }
  return data.token;
}

function createGithubAppJwt(now = Math.floor(Date.now() / 1000)): string {
  const appId = requireEnv("GITHUB_APP_ID");
  const privateKey = Buffer.from(requireEnv("GITHUB_APP_PRIVATE_KEY_BASE64"), "base64").toString("utf8");
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ iat: now - 60, exp: now + 540, iss: appId })).toString("base64url");
  const signingInput = `${header}.${payload}`;
  const signature = createSign("RSA-SHA256").update(signingInput).sign(privateKey, "base64url");
  return `${signingInput}.${signature}`;
}
