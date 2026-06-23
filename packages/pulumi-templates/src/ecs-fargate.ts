import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import type { DeploymentPlan } from "@awsify/deployment-schemas";
import { createElastiCacheRedis } from "./elasticache.js";
import { createRdsInstance } from "./rds.js";

export interface EcsFargateInput {
  plan: DeploymentPlan;
  imageUri: pulumi.Input<string>;
  environment: Record<string, pulumi.Input<string>>;
  cpu?: string;
  memory?: string;
  desiredCount?: number;
}

export interface EcsFargateOutputs {
  liveUrl: pulumi.Output<string>;
  repositoryUrl: pulumi.Output<string>;
  logGroupName: pulumi.Output<string>;
  databaseEndpoint?: pulumi.Output<string>;
  redisEndpoint?: pulumi.Output<string>;
}

export function createEcsFargateStack(input: EcsFargateInput): EcsFargateOutputs {
  const appName = input.plan.appName;
  const port = input.plan.suggestion.port;
  const healthPath = input.plan.suggestion.healthPath || "/";

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

  const taskSg = new aws.ec2.SecurityGroup(`${appName}-task-sg`, {
    vpcId: vpc.id,
    description: "AWSify ECS task",
    ingress: [{ protocol: "tcp", fromPort: port, toPort: port, securityGroups: [albSg.id] }],
    egress: [{ protocol: "-1", fromPort: 0, toPort: 0, cidrBlocks: ["0.0.0.0/0"] }]
  });

  let runtimeEnvironment: Record<string, pulumi.Input<string>> = { ...input.environment };
  let databaseEndpoint: pulumi.Output<string> | undefined;
  let redisEndpoint: pulumi.Output<string> | undefined;

  if (input.plan.suggestion.database.required && input.plan.suggestion.database.engine !== "mongodb") {
    const engine = input.plan.suggestion.database.engine ?? "postgresql";
    const dbName = appName.replace(/-/g, "_");
    const rds = createRdsInstance({
      appName,
      engine,
      instanceClass: input.plan.suggestion.database.instanceClass,
      vpcId: vpc.id,
      subnetIds,
      allowedSecurityGroupId: taskSg.id
    });
    databaseEndpoint = rds.endpoint;
    const scheme = engine === "mysql" ? "mysql" : "postgresql";
    runtimeEnvironment = {
      DATABASE_URL: pulumi.interpolate`${scheme}://awsify:${rds.password}@${rds.endpoint}/${dbName}`,
      DB_HOST: rds.endpoint,
      DB_PORT: rds.port.apply(String),
      DB_NAME: dbName,
      DB_USER: "awsify",
      DB_PASSWORD: rds.password,
      ...runtimeEnvironment
    };
  }

  if (input.plan.suggestion.cache.required) {
    const redis = createElastiCacheRedis({
      appName,
      nodeType: input.plan.suggestion.cache.nodeType,
      vpcId: vpc.id,
      subnetIds,
      allowedSecurityGroupId: taskSg.id
    });
    redisEndpoint = redis.endpoint;
    runtimeEnvironment = {
      REDIS_URL: pulumi.interpolate`rediss://${redis.endpoint}:${redis.port}`,
      REDIS_HOST: redis.endpoint,
      REDIS_PORT: redis.port.apply(String),
      ...runtimeEnvironment
    };
  }

  const cluster = new aws.ecs.Cluster(`${appName}-cluster`, { name: `${appName}-cluster` });

  const executionRole = new aws.iam.Role(`${appName}-exec-role`, {
    name: `awsify-${appName}-exec-role`,
    assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({ Service: "ecs-tasks.amazonaws.com" })
  });
  new aws.iam.RolePolicyAttachment(`${appName}-exec-policy`, {
    role: executionRole.name,
    policyArn: "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
  });

  const taskRole = new aws.iam.Role(`${appName}-task-role`, {
    name: `awsify-${appName}-task-role`,
    assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({ Service: "ecs-tasks.amazonaws.com" })
  });

  const targetGroup = new aws.lb.TargetGroup(`${appName}-tg`, {
    vpcId: vpc.id,
    port,
    protocol: "HTTP",
    targetType: "ip",
    healthCheck: { path: healthPath, matcher: "200-399", interval: 30, timeout: 5, healthyThreshold: 2, unhealthyThreshold: 3 }
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

  const taskDefinition = new aws.ecs.TaskDefinition(`${appName}-task`, {
    family: appName,
    cpu: input.cpu ?? "512",
    memory: input.memory ?? "1024",
    networkMode: "awsvpc",
    requiresCompatibilities: ["FARGATE"],
    executionRoleArn: executionRole.arn,
    taskRoleArn: taskRole.arn,
    containerDefinitions: pulumi
      .all([input.imageUri, logGroup.name, pulumi.output(runtimeEnvironment)])
      .apply(([imageUri, logGroupName, env]) =>
        JSON.stringify([{
          name: appName,
          image: imageUri,
          essential: true,
          portMappings: [{ containerPort: port, hostPort: port, protocol: "tcp" }],
          environment: Object.entries(env).map(([name, value]) => ({ name, value })),
          logConfiguration: {
            logDriver: "awslogs",
            options: {
              "awslogs-group": logGroupName,
              "awslogs-region": input.plan.region,
              "awslogs-stream-prefix": "app"
            }
          }
        }])
      )
  });

  const service = new aws.ecs.Service(
    `${appName}-service`,
    {
      name: `${appName}-service`,
      cluster: cluster.arn,
      taskDefinition: taskDefinition.arn,
      desiredCount: input.desiredCount ?? 1,
      launchType: "FARGATE",
      networkConfiguration: {
        assignPublicIp: true,
        subnets: subnetIds,
        securityGroups: [taskSg.id]
      },
      loadBalancers: [{ targetGroupArn: targetGroup.arn, containerName: appName, containerPort: port }]
    },
    { dependsOn: [listener] }
  );

  return {
    liveUrl: pulumi.interpolate`http://${alb.dnsName}`,
    repositoryUrl: repository.repositoryUrl,
    logGroupName: logGroup.name,
    databaseEndpoint,
    redisEndpoint
  };
}
