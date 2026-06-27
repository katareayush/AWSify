import * as pulumi from "@pulumi/pulumi";
import type { DeploymentPlan } from "@awsify/deployment-schemas";
import { createEcsFargateStack } from "./ecs-fargate.js";

export { createEcsFargateStack } from "./ecs-fargate.js";
export { createRdsInstance } from "./rds.js";
export { createElastiCacheRedis } from "./elasticache.js";
export { createBlueGreenController } from "./codedeploy.js";
export { buildContainerSecrets } from "./secrets.js";

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
  /** Secrets Manager secret holding GitHub-synced env, read by the ECS task. */
  envSecretName?: string;
  /** JSON keys present in the env secret to expose to the container. */
  secretKeys?: string[];
}

export interface StackOutputs {
  liveUrl: pulumi.Output<string>;
  logGroupName?: pulumi.Output<string>;
  databaseEndpoint?: pulumi.Output<string>;
  redisEndpoint?: pulumi.Output<string>;
  bucketName?: pulumi.Output<string>;
  distributionId?: pulumi.Output<string>;
  deploymentStrategy?: pulumi.Output<string>;
  clusterName?: pulumi.Output<string>;
  serviceName?: pulumi.Output<string>;
  taskDefinitionArn?: pulumi.Output<string>;
  containerName?: pulumi.Output<string>;
  containerPort?: pulumi.Output<number>;
  codeDeployAppName?: pulumi.Output<string>;
  codeDeployDeploymentGroupName?: pulumi.Output<string>;
}

export function createStack(input: StackInput): StackOutputs {
  return createEcsFargateStack({
    plan: input.plan,
    imageUri: input.imageUri!,
    environment: input.environment,
    envSecretName: input.envSecretName,
    secretKeys: input.secretKeys
  });
}
