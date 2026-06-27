import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile, spawn } from "node:child_process";
import { createSign } from "node:crypto";
import { promisify } from "node:util";
import { createAiProvider } from "@awsify/ai";
import { decryptSecret } from "@awsify/config";
import { PrismaClient, createPrismaAdapter } from "@awsify/database";
import type { DeploymentJob, DeploymentPlan, DeploymentSuggestion, GeneratedArtifact } from "@awsify/deployment-schemas";
import { collectKeyFiles, scanRepository, type RepoScanResult } from "@awsify/repo-scanner";
import { generateDockerfile, MANAGED_PIPELINE_POLICY_NAME, buildManagedPipelinePolicy } from "@awsify/templates";
import { createStack } from "@awsify/pulumi-templates";
import { IAMClient, PutRolePolicyCommand } from "@aws-sdk/client-iam";
import { CodeDeployClient, ListApplicationsCommand } from "@aws-sdk/client-codedeploy";
import { ECRClient, CreateRepositoryCommand, DeleteRepositoryCommand, DescribeRepositoriesCommand, GetAuthorizationTokenCommand } from "@aws-sdk/client-ecr";
import {
  SecretsManagerClient,
  CreateSecretCommand,
  DescribeSecretCommand,
  GetSecretValueCommand,
  PutSecretValueCommand,
  DeleteSecretCommand
} from "@aws-sdk/client-secrets-manager";
import { STSClient, AssumeRoleCommand } from "@aws-sdk/client-sts";
import { LocalWorkspace, type PulumiFn } from "@pulumi/pulumi/automation";
import { redactSecrets } from "./redact";
import { performBlueGreenShift } from "./codedeploy";

function envSecretName(appName: string): string {
  return `/awsify/${appName}/env`;
}

function pulumiStateDir(projectId: string): string {
  // Persist Pulumi state outside the container's ephemeral /tmp so retries (and
  // platform rebuilds) keep the stack state and don't try to recreate resources
  // that already exist. Set AWSIFY_PULUMI_STATE_DIR to a volume-backed path in
  // production; falls back to /tmp for local dev.
  const base = process.env.AWSIFY_PULUMI_STATE_DIR ?? join(tmpdir(), "awsify-state");
  return join(base, projectId);
}

const execFileAsync = promisify(execFile);

export interface DeploymentEvent {
  status: "queued" | "scanning" | "awaiting_approval" | "deploying" | "deployed" | "destroying" | "destroyed" | "failed";
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
  private readonly prisma = new PrismaClient({ adapter: createPrismaAdapter() });

  async deploy(job: DeploymentJob) {
    const events: DeploymentEvent[] = [];
    const emit = async (status: DeploymentEvent["status"], rawMessage: string) => {
      const message = redactSecrets(rawMessage);
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
    if (job.action === "destroy") {
      return await this.destroy(job, emit);
    }

    await emit("scanning", "Deployment job accepted by worker.");

    const planRecord = await this.prisma.deploymentPlan.findUnique({
      where: { id: job.approvedPlanId },
      include: { artifacts: true }
    });
    if (!planRecord) throw new Error(`Deployment plan ${job.approvedPlanId} not found.`);

    const region = process.env.AWS_REGION;
    const awsifyAccountId = process.env.AWSIFY_AWS_ACCOUNT_ID;
    if (!region || !awsifyAccountId) {
      throw new Error("AWS_REGION and AWSIFY_AWS_ACCOUNT_ID must be configured.");
    }

    // A pre-built image (GitHub Actions path) needs no checkout. Otherwise clone
    // so we can scan the repo and build the image on the worker.
    const needsRepo = planRecord.status !== "approved" || !job.imageUri;
    const repoPath = needsRepo ? await this.cloneRepository(job) : null;
    if (repoPath) await emit("scanning", "Repository cloned; running static scanner.");
    const scan = repoPath ? scanRepository(repoPath) : null;

    if (planRecord.status !== "approved") {
      const keyFiles = collectKeyFiles(repoPath!);
      await emit("scanning", `Scan complete: ${scan!.appType} -> ${scan!.computeTarget} (${scan!.signals.length} signals). Sending to Claude.`);

      const aiResult = await this.ai.recommendDeployment({ repoFullName: job.repoFullName, scan: scan!, keyFiles });
      const { suggestion } = aiResult;
      await emit("scanning", `AI recommendation: ${suggestion.appType} on ${suggestion.computeTarget} (confidence ${suggestion.confidence.toFixed(2)})`);

      if (aiResult.usage) {
        const u = aiResult.usage;
        const cost = u.costUsd !== undefined ? `$${u.costUsd.toFixed(4)}` : "n/a";
        await emit("scanning", `Claude analysis cost: ${cost} (${u.model}: ${u.inputTokens} input / ${u.outputTokens} output tokens).`);
      }

      await this.prisma.deploymentPlan.update({
        where: { id: job.approvedPlanId },
        data: {
          suggestion: suggestion as object,
          resources: [],
          estimatedCost: { low: 0, high: 0, notes: [] },
          status: "draft"
        }
      });
      await emit("awaiting_approval", "Scan review is ready. Confirm or correct the detected settings before AWSify creates the plan.");
      return { status: "awaiting_approval", events };
    }

    const plan = hydratePlan(planRecord);
    // ECR, Secrets Manager, CodeDeploy and the Pulumi stack must all operate in
    // the plan's region so the ECS task can resolve the image and secret ARNs.
    const deployRegion = plan.region;
    await emit("deploying", "Approved plan loaded; starting AWS deployment.");

    // Load customer AWS connection
    const connection = await this.prisma.awsConnection.findUnique({ where: { id: job.awsConnectionId } });
    if (!connection) throw new Error(`AWS connection ${job.awsConnectionId} not found.`);

    await emit("deploying", `Assuming customer role ${connection.roleArn}`);
    const credentials = await this.assumeRole(connection.roleArn, connection.externalId, deployRegion);

    // Keep the role's permissions current before touching any infra, and fail
    // fast with a clear message if an old role can neither self-heal nor already
    // has what the pipeline needs — never leave a half-built deployment.
    await this.ensureRolePermissions(connection, deployRegion, credentials, emit);

    let imageUri: string;
    if (job.imageUri) {
      imageUri = job.imageUri;
      await emit("deploying", `Using image built by GitHub Actions: ${imageUri}`);
    } else {
      const dockerfilePath = await this.resolveDockerfile(repoPath!, scan!, plan, emit);
      await emit("deploying", `Dockerfile source: ${dockerfilePath}`);
      await emit("deploying", "Creating ECR repository and building container image.");
      const repositoryUri = await this.ensureEcrRepo(plan.appName, deployRegion, credentials);
      // Tag uniquely per deployment so a redeploy produces a fresh task-definition
      // revision; otherwise blue-green (CodeDeploy) would see no change to roll out.
      const tagBase = job.branch.replace(/[^a-zA-Z0-9._-]/g, "-");
      const tag = job.deploymentId ? `${tagBase}-${job.deploymentId.slice(-8)}` : tagBase;
      imageUri = `${repositoryUri}:${tag}`;
      await this.buildAndPushImage(repoPath!, imageUri, repositoryUri, deployRegion, credentials);
      await emit("deploying", `Image pushed: ${imageUri}`);
    }

    await emit("deploying", `Running Pulumi stack (${plan.suggestion.computeTarget}).`);
    const outputs = await this.runPulumiStack(plan, imageUri, credentials, deployRegion, Boolean(job.imageUri), emit);

    await this.maybeBlueGreenShift(outputs, credentials, deployRegion, emit);

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
      const reason = redactSecrets(explainDeploymentError(err));
      await emit("failed", `Deployment failed: ${reason}`);
      if (job.deploymentId) {
        await this.prisma.deployment.update({ where: { id: job.deploymentId }, data: { status: "failed", failureReason: reason } }).catch(() => {});
      }
      throw err;
    }
  }

  private async destroy(
    job: DeploymentJob,
    emit: (status: DeploymentEvent["status"], msg: string) => Promise<void>
  ) {
    await emit("destroying", "Teardown job accepted by worker.");

    const planRecord = await this.prisma.deploymentPlan.findUnique({
      where: { id: job.approvedPlanId },
      include: { artifacts: true }
    });
    if (!planRecord) throw new Error(`Deployment plan ${job.approvedPlanId} not found.`);

    if (!process.env.AWS_REGION) throw new Error("AWS_REGION must be configured.");

    const connection = await this.prisma.awsConnection.findUnique({ where: { id: job.awsConnectionId } });
    if (!connection) throw new Error(`AWS connection ${job.awsConnectionId} not found.`);

    const plan = hydratePlan(planRecord);
    const region = plan.region;

    await emit("destroying", `Assuming customer role ${connection.roleArn}`);
    const credentials = await this.assumeRole(connection.roleArn, connection.externalId, region);

    await emit("destroying", `Running Pulumi destroy for ${plan.appName}/production.`);
    await this.destroyPulumiStack(plan, credentials, emit);

    await emit("destroying", `Deleting ECR repository ${plan.appName} if it still exists.`);
    await this.deleteEcrRepo(plan.appName, region, credentials, emit);

    await this.deleteEnvSecret(envSecretName(plan.appName), region, credentials, emit);

    await emit("destroyed", "Infrastructure teardown completed.");
    if (job.deploymentId) {
      await this.prisma.deployment.update({
        where: { id: job.deploymentId },
        data: { status: "destroyed" as never, liveUrl: null, failureReason: null }
      }).catch(() => {});
    }

    return { status: "destroyed", events: [] };
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

  private async deleteEcrRepo(
    appName: string,
    region: string,
    credentials: AwsCredentials,
    emit: (status: DeploymentEvent["status"], msg: string) => Promise<void>
  ) {
    const ecr = new ECRClient({
      region,
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
        sessionToken: credentials.sessionToken
      }
    });

    try {
      await ecr.send(new DeleteRepositoryCommand({ repositoryName: appName, force: true }));
      await emit("destroying", `ECR repository ${appName} deleted.`);
    } catch (err: unknown) {
      if ((err as { name?: string }).name === "RepositoryNotFoundException") {
        await emit("destroying", `ECR repository ${appName} was already absent.`);
        return;
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
      await execFileAsync("docker", ["build", "-t", imageUri, repoPath], {
        timeout: 600_000,
        maxBuffer: 50 * 1024 * 1024
      });
    } catch (error) {
      throw new Error(`Docker build failed. Check the Dockerfile, build command, and package install step. ${extractProcessError(error)}`);
    }

    try {
      await execFileAsync("docker", ["push", imageUri], {
        timeout: 300_000,
        maxBuffer: 20 * 1024 * 1024
      });
    } catch (error) {
      throw new Error(`Docker push to ECR failed. Check ECR push permissions and repository access. ${extractProcessError(error)}`);
    }
  }

  private async runPulumiStack(
    plan: DeploymentPlan,
    imageUri: string | undefined,
    credentials: AwsCredentials,
    region: string,
    prebuilt: boolean,
    emit: (status: DeploymentEvent["status"], msg: string) => Promise<void>
  ) {
    const stateDir = pulumiStateDir(plan.projectId);
    mkdirSync(stateDir, { recursive: true });

    // Env is delivered through a Secrets Manager secret the ECS task reads at
    // launch. On the GitHub Actions path the workflow already wrote it; on the
    // one-click UI path we seed it here from the project's stored env vars.
    const secretName = envSecretName(plan.appName);
    const seed = prebuilt ? undefined : await this.collectStoredEnv(plan.projectId);
    const presentKeys = await this.ensureEnvSecret(secretName, region, credentials, seed);

    const missingRequiredEnv = plan.suggestion.envVars.filter(
      (envVar) => envVar.required && !presentKeys.includes(envVar.name)
    );
    if (missingRequiredEnv.length > 0) {
      const source = prebuilt ? "the repo's GitHub secrets/variables" : "the project env vars";
      throw new Error(
        `Deployment requires env vars that are not set in ${source}: ${missingRequiredEnv.map((envVar) => envVar.name).join(", ")}`
      );
    }

    const program: PulumiFn = async () => {
      return createStack({ plan, imageUri, environment: {}, envSecretName: secretName, secretKeys: presentKeys });
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

    // Reconcile state with reality before applying, so drift (e.g. a resource
    // deleted out-of-band, or an ECS cluster left INACTIVE) is detected and
    // recreated instead of breaking the apply. Best-effort — never block on it.
    try {
      await stack.refresh({ onOutput: msg => { const t = msg.trim(); if (t) emit("deploying", t); } });
    } catch (error) {
      await emit("deploying", `State refresh skipped: ${extractProcessError(error)}`);
    }

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

  private async collectStoredEnv(projectId: string): Promise<Record<string, string>> {
    const stored = await this.prisma.projectEnvVar.findMany({ where: { projectId } });
    return Object.fromEntries(stored.map((envVar) => [envVar.name, decryptSecret(envVar.encryptedValue)]));
  }

  /**
   * Guarantees the env Secrets Manager secret exists before Pulumi looks it up.
   * When `seed` is provided (UI path) the secret is (re)written from it; on the
   * GitHub path the workflow owns the values, so we only ensure existence.
   * Returns the JSON keys currently present in the secret.
   */
  private async ensureEnvSecret(
    secretName: string,
    region: string,
    credentials: AwsCredentials,
    seed?: Record<string, string>
  ): Promise<string[]> {
    const sm = new SecretsManagerClient({ region, credentials });

    let exists = true;
    try {
      await sm.send(new DescribeSecretCommand({ SecretId: secretName }));
    } catch (err) {
      if ((err as { name?: string }).name === "ResourceNotFoundException") exists = false;
      else throw err;
    }

    if (!exists) {
      await sm.send(new CreateSecretCommand({ Name: secretName, SecretString: JSON.stringify(seed ?? {}) }));
    } else if (seed) {
      await sm.send(new PutSecretValueCommand({ SecretId: secretName, SecretString: JSON.stringify(seed) }));
    }

    const current = await sm.send(new GetSecretValueCommand({ SecretId: secretName }));
    return Object.keys(parseSecretObject(current.SecretString));
  }

  private async deleteEnvSecret(
    secretName: string,
    region: string,
    credentials: AwsCredentials,
    emit: (status: DeploymentEvent["status"], msg: string) => Promise<void>
  ) {
    const sm = new SecretsManagerClient({ region, credentials });
    try {
      await sm.send(new DeleteSecretCommand({ SecretId: secretName, ForceDeleteWithoutRecovery: true }));
      await emit("destroying", `Deleted env secret ${secretName}.`);
    } catch (err) {
      if ((err as { name?: string }).name === "ResourceNotFoundException") return;
      throw err;
    }
  }

  /**
   * Self-heals the deployment role to the latest permission set, then (only if
   * it could not) preflights the actions the pipeline needs and aborts early
   * when they are missing — so a stale role fails fast instead of half-deploying.
   */
  private async ensureRolePermissions(
    connection: { roleArn: string; accountId: string },
    region: string,
    credentials: AwsCredentials,
    emit: (status: DeploymentEvent["status"], msg: string) => Promise<void>
  ) {
    if (await this.selfHealRolePolicy(connection, region, credentials, emit)) return;

    await emit("deploying", "Deployment role cannot self-update its permissions; checking what it has.");
    const missing = await this.preflightPermissions(region, credentials);
    if (missing.length > 0) {
      throw new Error(
        `Deployment role ${connection.roleArn} is missing required permissions (${missing.join(", ")}) and cannot self-update. ` +
        `Update its CloudFormation stack to the latest AWSify template (it lets the role keep its own permissions current), then retry.`
      );
    }
    await emit("deploying", "Deployment role already has the required permissions.");
  }

  /** Applies the managed pipeline policy to the role. Returns false if the role lacks self-update rights. */
  private async selfHealRolePolicy(
    connection: { roleArn: string; accountId: string },
    region: string,
    credentials: AwsCredentials,
    emit: (status: DeploymentEvent["status"], msg: string) => Promise<void>
  ): Promise<boolean> {
    const roleName = connection.roleArn.split("/").pop();
    if (!roleName) return false;
    const iam = new IAMClient({ region, credentials });
    try {
      await iam.send(new PutRolePolicyCommand({
        RoleName: roleName,
        PolicyName: MANAGED_PIPELINE_POLICY_NAME,
        PolicyDocument: JSON.stringify(buildManagedPipelinePolicy(connection.accountId, roleName))
      }));
      await emit("deploying", "Deployment role permissions refreshed to the latest set (self-healed).");
      return true;
    } catch (err) {
      if (isAccessDenied(err)) return false;
      throw err;
    }
  }

  /** Probes representative actions per pipeline capability; returns the missing capability names. */
  private async preflightPermissions(region: string, credentials: AwsCredentials): Promise<string[]> {
    const missing: string[] = [];

    const sm = new SecretsManagerClient({ region, credentials });
    try {
      await sm.send(new DescribeSecretCommand({ SecretId: "/awsify/__preflight__" }));
    } catch (err) {
      // ResourceNotFoundException means the action is allowed (the secret just doesn't exist).
      if (isAccessDenied(err)) missing.push("secretsmanager");
    }

    const codedeploy = new CodeDeployClient({ region, credentials });
    try {
      await codedeploy.send(new ListApplicationsCommand({}));
    } catch (err) {
      if (isAccessDenied(err)) missing.push("codedeploy");
    }

    return missing;
  }

  private async maybeBlueGreenShift(
    outputs: Record<string, { value: unknown } | undefined>,
    credentials: AwsCredentials,
    region: string,
    emit: (status: DeploymentEvent["status"], msg: string) => Promise<void>
  ) {
    if (outStr(outputs, "deploymentStrategy") !== "blue-green") return;

    const applicationName = outStr(outputs, "codeDeployAppName");
    const deploymentGroupName = outStr(outputs, "codeDeployDeploymentGroupName");
    const clusterName = outStr(outputs, "clusterName");
    const serviceName = outStr(outputs, "serviceName");
    const taskDefinitionArn = outStr(outputs, "taskDefinitionArn");
    const containerName = outStr(outputs, "containerName");
    const containerPort = outNum(outputs, "containerPort");

    if (!applicationName || !deploymentGroupName || !clusterName || !serviceName || !taskDefinitionArn || !containerName || containerPort === undefined) {
      await emit("deploying", "Blue-green outputs incomplete; skipping CodeDeploy traffic shift.");
      return;
    }

    await emit("deploying", "Initiating blue-green traffic shift via CodeDeploy.");
    const result = await performBlueGreenShift(
      { region, credentials, clusterName, serviceName, applicationName, deploymentGroupName, taskDefinitionArn, containerName, containerPort },
      (message) => emit("deploying", message)
    );
    await emit("deploying", result === "shifted" ? "Blue-green shift complete; new version is serving traffic." : "Blue-green shift not required for this deploy.");
  }

  private async destroyPulumiStack(
    plan: DeploymentPlan,
    credentials: AwsCredentials,
    emit: (status: DeploymentEvent["status"], msg: string) => Promise<void>
  ) {
    const stateDir = pulumiStateDir(plan.projectId);
    mkdirSync(stateDir, { recursive: true });

    const program: PulumiFn = async () => {
      return createStack({ plan, imageUri: "awsify-destroy-placeholder:latest", environment: {} });
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

    try {
      await stack.destroy({
        onOutput: msg => {
          const trimmed = msg.trim();
          if (trimmed) emit("destroying", trimmed);
        }
      });
    } catch (error) {
      throw new Error(`Pulumi destroy failed. Check AWS role permissions and whether the stack state is still available. ${extractProcessError(error)}`);
    }
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

function isAccessDenied(err: unknown): boolean {
  const name = (err as { name?: string })?.name ?? "";
  const message = err instanceof Error ? err.message : String(err);
  return /AccessDenied|UnauthorizedOperation/i.test(name) || /not authorized|access denied/i.test(message);
}

function parseSecretObject(secretString: string | undefined): Record<string, unknown> {
  if (!secretString) return {};
  try {
    const parsed = JSON.parse(secretString);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function outStr(outputs: Record<string, { value: unknown } | undefined>, key: string): string | undefined {
  const value = outputs[key]?.value;
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function outNum(outputs: Record<string, { value: unknown } | undefined>, key: string): number | undefined {
  const value = outputs[key]?.value;
  return typeof value === "number" ? value : undefined;
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
    const stderr = typeof maybe.stderr === "string" ? maybe.stderr : "";
    const stdout = typeof maybe.stdout === "string" ? maybe.stdout : "";
    const message = typeof maybe.message === "string" ? maybe.message : "";
    // BuildKit / npm / pulumi write the actual failure reason at the very end of
    // their output. Keep the TAIL, not the head, capped at ~4KB.
    const tail = (s: string) => s.trim().split("\n").slice(-60).join("\n").slice(-4000);
    const combined = [tail(stderr), tail(stdout), message].filter(Boolean).join("\n").slice(-4000);
    return redactSecrets(combined);
  }
  return redactSecrets(String(error));
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
