import * as pulumi from "@pulumi/pulumi";
import type { DeploymentPlan, ComputeTarget } from "@awsify/deployment-schemas";
import { createEcsFargateStack } from "./ecs-fargate.js";
import { createEcsEc2Stack } from "./ecs-ec2.js";
import { createLambdaStack } from "./lambda.js";
import { createS3CloudFrontStack } from "./s3-cloudfront.js";
import { createEc2InstanceStack } from "./ec2-instance.js";

export { createEcsFargateStack } from "./ecs-fargate.js";
export { createEcsEc2Stack } from "./ecs-ec2.js";
export { createLambdaStack } from "./lambda.js";
export { createS3CloudFrontStack } from "./s3-cloudfront.js";
export { createEc2InstanceStack } from "./ec2-instance.js";
export { createRdsInstance } from "./rds.js";
export { createElastiCacheRedis } from "./elasticache.js";

export type {
  EcsFargateInput,
  EcsFargateOutputs
} from "./ecs-fargate.js";
export type { EcsEc2Input, EcsEc2Outputs } from "./ecs-ec2.js";
export type { LambdaInput, LambdaOutputs } from "./lambda.js";
export type { S3CloudFrontInput, S3CloudFrontOutputs } from "./s3-cloudfront.js";
export type { Ec2InstanceInput, Ec2InstanceOutputs } from "./ec2-instance.js";
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
  const target: ComputeTarget = input.plan.suggestion.computeTarget;

  switch (target) {
    case "ecs-fargate":
      return createEcsFargateStack({
        plan: input.plan,
        imageUri: input.imageUri!,
        environment: input.environment
      });

    case "ecs-ec2":
      return createEcsEc2Stack({
        plan: input.plan,
        imageUri: input.imageUri!,
        environment: input.environment
      });

    case "lambda":
      return createLambdaStack({
        plan: input.plan,
        imageUri: input.imageUri!,
        environment: input.environment
      });

    case "ec2-instance":
      return createEc2InstanceStack({
        plan: input.plan,
        imageUri: input.imageUri!,
        environment: input.environment
      });

    case "s3-cloudfront":
      return createS3CloudFrontStack({ plan: input.plan });

    default: {
      const _exhaustive: never = target;
      throw new Error(`Unknown compute target: ${_exhaustive}`);
    }
  }
}
