import { Injectable } from "@nestjs/common";
import { Queue } from "bullmq";
import { deploymentJobSchema, type DeploymentJob } from "@awsify/deployment-schemas";
import { redisConnectionOptions } from "./redis-options";

@Injectable()
export class QueueService {
  private readonly deploymentQueue = new Queue<DeploymentJob, unknown, "deploy-approved-plan">("deployments", {
    connection: redisConnectionOptions()
  });

  enqueueDeployment(job: DeploymentJob) {
    const payload = deploymentJobSchema.parse(job);
    return this.deploymentQueue.add("deploy-approved-plan", payload, {
      attempts: 1,
      removeOnComplete: 100,
      removeOnFail: false
    });
  }
}
