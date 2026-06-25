/**
 * Destructive maintenance script: removes ALL deployments everywhere.
 *
 *   - Postgres: deletes every Deployment, DeploymentPlan and DeploymentArtifact
 *               row across all accounts (their AuditEvents cascade away too).
 *   - Redis   : obliterates the BullMQ "deployments" queue (waiting, active,
 *               delayed, completed and failed jobs — i.e. anything stuck/queued).
 *
 * Projects, users, AWS connections and env vars are left untouched.
 *
 * The Postgres wipe always runs. The Redis step is best-effort and fails fast:
 * if Redis is unreachable or over its request quota it is skipped with a warning
 * rather than blocking the database cleanup.
 *
 * Usage (from repo root):
 *   pnpm wipe:deployments              # actually deletes
 *   pnpm wipe:deployments -- --dry-run # only reports what would be deleted
 *   pnpm wipe:deployments -- --skip-redis
 */
import { Queue } from "bullmq";
import { loadEnv } from "@awsify/config";
import { PrismaClient, createPrismaAdapter } from "@awsify/database";
import { redisConnectionOptions } from "./redis-options";

loadEnv();

const QUEUE_NAME = "deployments";
const dryRun = process.argv.includes("--dry-run");
const skipRedis = process.argv.includes("--skip-redis");

async function wipePostgres(prisma: PrismaClient) {
  const [deployments, plans, artifacts] = await Promise.all([
    prisma.deployment.count(),
    prisma.deploymentPlan.count(),
    prisma.deploymentArtifact.count()
  ]);
  console.log(`Postgres: ${deployments} deployment(s), ${plans} plan(s), ${artifacts} artifact(s).`);

  if (dryRun) return;

  // FK-safe order: deployments reference plans (RESTRICT); artifacts + audit
  // events cascade. Delete deployments first, then plans.
  const delDeployments = await prisma.deployment.deleteMany({});
  const delArtifacts = await prisma.deploymentArtifact.deleteMany({});
  const delPlans = await prisma.deploymentPlan.deleteMany({});
  console.log(
    `  -> deleted ${delDeployments.count} deployment(s), ${delPlans.count} plan(s), ${delArtifacts.count} artifact(s).`
  );
}

async function wipeRedis() {
  if (skipRedis) {
    console.log("Redis: skipped (--skip-redis).");
    return;
  }

  // Fail fast instead of retrying forever (e.g. when the host is down or, as with
  // Upstash, the request quota is exhausted).
  const queue = new Queue(QUEUE_NAME, {
    connection: {
      ...redisConnectionOptions(),
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      connectTimeout: 5000,
      retryStrategy: () => null
    }
  });

  try {
    if (dryRun) {
      const counts = await withTimeout(queue.getJobCounts(), 10_000);
      console.log(`Redis queue "${QUEUE_NAME}":`, counts);
    } else {
      await withTimeout(queue.obliterate({ force: true }), 15_000);
      console.log(`Redis queue "${QUEUE_NAME}": obliterated.`);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`Redis: could NOT clear the queue -> ${message}`);
    console.warn(
      "  The Postgres wipe still succeeded. If this is the Upstash request-quota error,\n" +
      "  flush the queue from the Upstash console (or upgrade/wait for the quota reset)."
    );
  } finally {
    await queue.close().catch(() => {});
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms))
  ]);
}

async function main() {
  console.log(dryRun ? "[DRY RUN] Nothing will be deleted.\n" : "Wiping ALL deployments...\n");

  const prisma = new PrismaClient({ adapter: createPrismaAdapter() });
  try {
    await wipePostgres(prisma);
  } finally {
    await prisma.$disconnect().catch(() => {});
  }

  console.log("");
  await wipeRedis();

  console.log(dryRun ? "\nDry run complete." : "\nDone.");
}

main().catch((err) => {
  console.error("Wipe failed:", err);
  process.exit(1);
});
