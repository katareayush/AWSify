import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import type { DeploymentPlan } from "@awsify/deployment-schemas";

export interface EcsFargateTemplateInput {
  plan: DeploymentPlan;
  imageUri: pulumi.Input<string>;
  environment: Record<string, pulumi.Input<string>>;
  cpu?: string;
  memory?: string;
  desiredCount?: number;
}

export interface EcsFargateOutputs {
  repositoryUrl: pulumi.Output<string>;
  loadBalancerDnsName: pulumi.Output<string>;
  serviceName: pulumi.Output<string>;
  clusterName: pulumi.Output<string>;
  logGroupName: pulumi.Output<string>;
}

export function createEcsFargateStack(input: EcsFargateTemplateInput): EcsFargateOutputs {
  const appName = input.plan.appName;
  const port = input.plan.suggestion.port;
  const vpc = aws.ec2.getVpcOutput({ default: true });
  const subnetIds = aws.ec2.getSubnetsOutput({
    filters: [{ name: "vpc-id", values: [vpc.id] }]
  }).ids;

  const repository = new aws.ecr.Repository(`${appName}-repo`, {
    name: appName,
    forceDelete: true,
    imageScanningConfiguration: { scanOnPush: true }
  });

  const logGroup = new aws.cloudwatch.LogGroup(`${appName}-logs`, {
    name: `/awsify/${appName}`,
    retentionInDays: 14
  });

  const albSecurityGroup = new aws.ec2.SecurityGroup(`${appName}-alb-sg`, {
    vpcId: vpc.id,
    description: "AWSify ALB access",
    ingress: [{ protocol: "tcp", fromPort: 80, toPort: 80, cidrBlocks: ["0.0.0.0/0"] }],
    egress: [{ protocol: "-1", fromPort: 0, toPort: 0, cidrBlocks: ["0.0.0.0/0"] }]
  });

  const taskSecurityGroup = new aws.ec2.SecurityGroup(`${appName}-task-sg`, {
    vpcId: vpc.id,
    description: "AWSify ECS task access from ALB",
    ingress: [{ protocol: "tcp", fromPort: port, toPort: port, securityGroups: [albSecurityGroup.id] }],
    egress: [{ protocol: "-1", fromPort: 0, toPort: 0, cidrBlocks: ["0.0.0.0/0"] }]
  });

  const cluster = new aws.ecs.Cluster(`${appName}-cluster`, {
    name: `${appName}-cluster`
  });

  const executionRole = new aws.iam.Role(`${appName}-execution-role`, {
    assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({ Service: "ecs-tasks.amazonaws.com" })
  });

  new aws.iam.RolePolicyAttachment(`${appName}-execution-policy`, {
    role: executionRole.name,
    policyArn: "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
  });

  const taskRole = new aws.iam.Role(`${appName}-task-role`, {
    assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({ Service: "ecs-tasks.amazonaws.com" })
  });

  const targetGroup = new aws.lb.TargetGroup(`${appName}-tg`, {
    vpcId: vpc.id,
    port,
    protocol: "HTTP",
    targetType: "ip",
    healthCheck: {
      path: "/",
      matcher: "200-399",
      interval: 30,
      timeout: 5,
      healthyThreshold: 2,
      unhealthyThreshold: 3
    }
  });

  const loadBalancer = new aws.lb.LoadBalancer(`${appName}-alb`, {
    loadBalancerType: "application",
    securityGroups: [albSecurityGroup.id],
    subnets: subnetIds
  });

  const listener = new aws.lb.Listener(`${appName}-http`, {
    loadBalancerArn: loadBalancer.arn,
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
      .all([input.imageUri, logGroup.name])
      .apply(([imageUri, logGroupName]) =>
        JSON.stringify([
          {
            name: appName,
            image: imageUri,
            essential: true,
            portMappings: [{ containerPort: port, hostPort: port, protocol: "tcp" }],
            environment: Object.entries(input.environment).map(([name, value]) => ({ name, value })),
            logConfiguration: {
              logDriver: "awslogs",
              options: {
                "awslogs-group": logGroupName,
                "awslogs-region": input.plan.region,
                "awslogs-stream-prefix": "app"
              }
            }
          }
        ])
      )
  });

  const service = new aws.ecs.Service(`${appName}-service`, {
    name: `${appName}-service`,
    cluster: cluster.arn,
    taskDefinition: taskDefinition.arn,
    desiredCount: input.desiredCount ?? 1,
    launchType: "FARGATE",
    networkConfiguration: {
      assignPublicIp: true,
      subnets: subnetIds,
      securityGroups: [taskSecurityGroup.id]
    },
    loadBalancers: [
      {
        targetGroupArn: targetGroup.arn,
        containerName: appName,
        containerPort: port
      }
    ]
  }, { dependsOn: [listener] });

  return {
    repositoryUrl: repository.repositoryUrl,
    loadBalancerDnsName: loadBalancer.dnsName,
    serviceName: service.name,
    clusterName: cluster.name,
    logGroupName: logGroup.name
  };
}
