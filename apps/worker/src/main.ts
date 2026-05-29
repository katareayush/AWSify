import { Worker } from "bullmq";
import { deploymentJobSchema } from "@awsify/deployment-schemas";
import { DeploymentOrchestrator } from "./orchestrator";
import { redisConnectionOptions } from "./redis-options";

const orchestrator = new DeploymentOrchestrator();

const worker = new Worker(
  "deployments",
  async (job) => {
    const payload = deploymentJobSchema.parse(job.data);
    return orchestrator.deploy(payload);
  },
  {
    connection: redisConnectionOptions(),
    concurrency: 1
  }
);

worker.on("completed", (job) => {
  console.log(`[worker] deployment job ${job.id} completed`);
});

worker.on("failed", (job, error) => {
  console.error(`[worker] deployment job ${job?.id ?? "unknown"} failed`, error);
});

console.log("[worker] AWSify deployment worker started");
