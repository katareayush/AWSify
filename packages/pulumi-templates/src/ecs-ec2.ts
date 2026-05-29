import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import type { DeploymentPlan } from "@awsify/deployment-schemas";
import { createRdsInstance } from "./rds.js";
import { createElastiCacheRedis } from "./elasticache.js";

export interface EcsEc2Input {
  plan: DeploymentPlan;
  imageUri: pulumi.Input<string>;
  environment: Record<string, pulumi.Input<string>>;
  instanceType?: string;
  desiredCount?: number;
}

export interface EcsEc2Outputs {
  liveUrl: pulumi.Output<string>;
  repositoryUrl: pulumi.Output<string>;
  logGroupName: pulumi.Output<string>;
}

export function createEcsEc2Stack(input: EcsEc2Input): EcsEc2Outputs {
  const appName = input.plan.appName;
  const port = input.plan.suggestion.port;
  const instanceType = input.instanceType ?? "t3.small";

  const vpc = aws.ec2.getVpcOutput({ default: true });
  const subnetIds = aws.ec2.getSubnetsOutput({ filters: [{ name: "vpc-id", values: [vpc.id] }] }).ids;

  const repository = new aws.ecr.Repository(`${appName}-repo`, {
    name: appName,
    forceDelete: true,
    imageScanningConfiguration: { scanOnPush: true }
  });

  const logGroup = new aws.cloudwatch.LogGroup(`${appName}-logs`, {
    name: `/awsify/${appName}`,
    retentionInDays: 14
  });

  const albSg = new aws.ec2.SecurityGroup(`${appName}-alb-sg`, {
    vpcId: vpc.id,
    description: "AWSify ALB",
    ingress: [
      { protocol: "tcp", fromPort: 80, toPort: 80, cidrBlocks: ["0.0.0.0/0"] },
      { protocol: "tcp", fromPort: 443, toPort: 443, cidrBlocks: ["0.0.0.0/0"] }
    ],
    egress: [{ protocol: "-1", fromPort: 0, toPort: 0, cidrBlocks: ["0.0.0.0/0"] }]
  });

  const instanceSg = new aws.ec2.SecurityGroup(`${appName}-ec2-sg`, {
    vpcId: vpc.id,
    description: "AWSify ECS EC2 instance",
    ingress: [
      { protocol: "tcp", fromPort: 0, toPort: 65535, securityGroups: [albSg.id] },
      { protocol: "tcp", fromPort: 22, toPort: 22, cidrBlocks: ["0.0.0.0/0"] }
    ],
    egress: [{ protocol: "-1", fromPort: 0, toPort: 0, cidrBlocks: ["0.0.0.0/0"] }]
  });

  const ecsInstanceRole = new aws.iam.Role(`${appName}-ec2-role`, {
    assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({ Service: "ec2.amazonaws.com" })
  });
  new aws.iam.RolePolicyAttachment(`${appName}-ec2-ecs-policy`, {
    role: ecsInstanceRole.name,
    policyArn: "arn:aws:iam::aws:policy/service-role/AmazonEC2ContainerServiceforEC2Role"
  });
  const instanceProfile = new aws.iam.InstanceProfile(`${appName}-ec2-profile`, {
    name: `${appName}-ec2-profile`,
    role: ecsInstanceRole.name
  });

  const cluster = new aws.ecs.Cluster(`${appName}-cluster`, { name: `${appName}-cluster` });

  // ECS-optimised AMI
  const ecsAmi = aws.ec2.getAmiOutput({
    mostRecent: true,
    owners: ["amazon"],
    filters: [
      { name: "name", values: ["al2023-ami-ecs-hvm-*-x86_64"] },
      { name: "virtualization-type", values: ["hvm"] }
    ]
  });

  const launchTemplate = new aws.ec2.LaunchTemplate(`${appName}-lt`, {
    namePrefix: `${appName}-`,
    imageId: ecsAmi.id,
    instanceType,
    iamInstanceProfile: { arn: instanceProfile.arn },
    vpcSecurityGroupIds: [instanceSg.id],
    userData: pulumi.interpolate`#!/bin/bash\necho ECS_CLUSTER=${cluster.name} >> /etc/ecs/ecs.config`
  });

  const asg = new aws.autoscaling.Group(`${appName}-asg`, {
    minSize: 1,
    maxSize: 4,
    desiredCapacity: input.desiredCount ?? 1,
    vpcZoneIdentifiers: subnetIds,
    launchTemplate: { id: launchTemplate.id, version: "$Latest" },
    tags: [{ key: "Name", value: `${appName}-ecs`, propagateAtLaunch: true }]
  });

  const capacityProvider = new aws.ecs.CapacityProvider(`${appName}-cp`, {
    name: `${appName}-cp`,
    autoScalingGroupProvider: {
      autoScalingGroupArn: asg.arn,
      managedScaling: { status: "ENABLED", targetCapacity: 80 }
    }
  });

  new aws.ecs.ClusterCapacityProviders(`${appName}-ccp`, {
    clusterName: cluster.name,
    capacityProviders: [capacityProvider.name]
  });

  const executionRole = new aws.iam.Role(`${appName}-exec-role`, {
    assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({ Service: "ecs-tasks.amazonaws.com" })
  });
  new aws.iam.RolePolicyAttachment(`${appName}-exec-policy`, {
    role: executionRole.name,
    policyArn: "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
  });

  let extraEnv: Record<string, pulumi.Input<string>> = {};
  if (input.plan.suggestion.database.required && input.plan.suggestion.database.engine !== "mongodb") {
    const rds = createRdsInstance({
      appName,
      engine: input.plan.suggestion.database.engine ?? "postgresql",
      instanceClass: input.plan.suggestion.database.instanceClass,
      vpcId: vpc.id,
      subnetIds,
      allowedSecurityGroupId: instanceSg.id
    });
    extraEnv = { ...extraEnv, DATABASE_URL: pulumi.interpolate`postgresql://awsify@${rds.endpoint}/${appName.replace(/-/g, "_")}` };
  }
  if (input.plan.suggestion.cache.required) {
    const redis = createElastiCacheRedis({ appName, vpcId: vpc.id, subnetIds, allowedSecurityGroupId: instanceSg.id });
    extraEnv = { ...extraEnv, REDIS_URL: pulumi.interpolate`rediss://${redis.endpoint}:${redis.port}` };
  }

  const allEnv = { ...input.environment, ...extraEnv };

  const taskDefinition = new aws.ecs.TaskDefinition(`${appName}-task`, {
    family: appName,
    networkMode: "bridge",
    requiresCompatibilities: ["EC2"],
    executionRoleArn: executionRole.arn,
    containerDefinitions: pulumi
      .all([input.imageUri, logGroup.name, pulumi.output(allEnv)])
      .apply(([imageUri, logGroupName, env]) =>
        JSON.stringify([{
          name: appName,
          image: imageUri,
          essential: true,
          memory: 512,
          portMappings: [{ containerPort: port, hostPort: 0, protocol: "tcp" }],
          environment: Object.entries(env).map(([name, value]) => ({ name, value })),
          logConfiguration: {
            logDriver: "awslogs",
            options: { "awslogs-group": logGroupName, "awslogs-region": input.plan.region, "awslogs-stream-prefix": "app" }
          }
        }])
      )
  });

  const targetGroup = new aws.lb.TargetGroup(`${appName}-tg`, {
    vpcId: vpc.id,
    port,
    protocol: "HTTP",
    targetType: "instance",
    healthCheck: { path: "/", matcher: "200-399", interval: 30, timeout: 5, healthyThreshold: 2, unhealthyThreshold: 3 }
  });

  const alb = new aws.lb.LoadBalancer(`${appName}-alb`, {
    loadBalancerType: "application",
    securityGroups: [albSg.id],
    subnets: subnetIds
  });

  const listener = new aws.lb.Listener(`${appName}-http`, {
    loadBalancerArn: alb.arn,
    port: 80,
    protocol: "HTTP",
    defaultActions: [{ type: "forward", targetGroupArn: targetGroup.arn }]
  });

  new aws.ecs.Service(
    `${appName}-service`,
    {
      name: `${appName}-service`,
      cluster: cluster.arn,
      taskDefinition: taskDefinition.arn,
      desiredCount: input.desiredCount ?? 1,
      capacityProviderStrategies: [{ capacityProvider: capacityProvider.name, weight: 1 }],
      loadBalancers: [{ targetGroupArn: targetGroup.arn, containerName: appName, containerPort: port }]
    },
    { dependsOn: [listener] }
  );

  return {
    liveUrl: pulumi.interpolate`http://${alb.dnsName}`,
    repositoryUrl: repository.repositoryUrl,
    logGroupName: logGroup.name
  };
}
