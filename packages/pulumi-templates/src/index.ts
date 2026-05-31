import * as pulumi from "@pulumi/pulumi";
import type { DeploymentPlan } from "@awsify/deployment-schemas";
import { createEcsFargateStack } from "./ecs-fargate.js";

export { createEcsFargateStack } from "./ecs-fargate.js";
export { createRdsInstance } from "./rds.js";
export { createElastiCacheRedis } from "./elasticache.js";

export type {
  EcsFargateInput,
  EcsFargateOutputs
} from "./ecs-fargate.js";
export type { RdsInput, RdsOutputs } from "./rds.js";
export type { ElastiCacheInput, ElastiCacheOutputs } from "./elasticache.js";

export interface StackInput {
  plan: DeploymentPlan;
  imageUri?: string;
  environment: Record<string, string>;
}

export interface StackOutputs {
  liveUrl: pulumi.Output<string>;
  repositoryUrl?: pulumi.Output<string>;
  logGroupName?: pulumi.Output<string>;
  bucketName?: pulumi.Output<string>;
  distributionId?: pulumi.Output<string>;
}

export function createStack(input: StackInput): StackOutputs {
  return createEcsFargateStack({
    plan: input.plan,
    imageUri: input.imageUri!,
    environment: input.environment
  });
}
