import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import type { DeploymentPlan } from "@awsify/deployment-schemas";
import { createRdsInstance } from "./rds.js";
import { createElastiCacheRedis } from "./elasticache.js";

export interface Ec2InstanceInput {
  plan: DeploymentPlan;
  imageUri: pulumi.Input<string>;
  environment: Record<string, pulumi.Input<string>>;
  instanceType?: string;
}

export interface Ec2InstanceOutputs {
  liveUrl: pulumi.Output<string>;
  repositoryUrl: pulumi.Output<string>;
  logGroupName: pulumi.Output<string>;
}

export function createEc2InstanceStack(input: Ec2InstanceInput): Ec2InstanceOutputs {
  const appName = input.plan.appName;
  const port = input.plan.suggestion.port;
  const instanceType = input.instanceType ?? "t3.micro";

  const vpc = aws.ec2.getVpcOutput({ default: true });
  const subnetIds = aws.ec2.getSubnetsOutput({ filters: [{ name: "vpc-id", values: [vpc.id] }] }).ids;
  const firstSubnet = subnetIds.apply(ids => ids[0]);

  const repository = new aws.ecr.Repository(`${appName}-repo`, {
    name: appName,
    forceDelete: true,
    imageScanningConfiguration: { scanOnPush: true }
  });

  const logGroup = new aws.cloudwatch.LogGroup(`${appName}-logs`, {
    name: `/awsify/${appName}`,
    retentionInDays: 14
  });

  const sg = new aws.ec2.SecurityGroup(`${appName}-sg`, {
    vpcId: vpc.id,
    description: "AWSify EC2 instance",
    ingress: [
      { protocol: "tcp", fromPort: 80, toPort: 80, cidrBlocks: ["0.0.0.0/0"] },
      { protocol: "tcp", fromPort: 443, toPort: 443, cidrBlocks: ["0.0.0.0/0"] },
      { protocol: "tcp", fromPort: port, toPort: port, cidrBlocks: ["0.0.0.0/0"] },
      { protocol: "tcp", fromPort: 22, toPort: 22, cidrBlocks: ["0.0.0.0/0"] }
    ],
    egress: [{ protocol: "-1", fromPort: 0, toPort: 0, cidrBlocks: ["0.0.0.0/0"] }]
  });

  const instanceRole = new aws.iam.Role(`${appName}-ec2-role`, {
    assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({ Service: "ec2.amazonaws.com" })
  });
  new aws.iam.RolePolicyAttachment(`${appName}-ecr-policy`, {
    role: instanceRole.name,
    policyArn: "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
  });
  new aws.iam.RolePolicyAttachment(`${appName}-ssm-policy`, {
    role: instanceRole.name,
    policyArn: "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
  });
  const instanceProfile = new aws.iam.InstanceProfile(`${appName}-profile`, {
    name: `${appName}-profile`,
    role: instanceRole.name
  });

  let extraEnv: Record<string, pulumi.Input<string>> = {};
  if (input.plan.suggestion.database.required && input.plan.suggestion.database.engine !== "mongodb") {
    const rds = createRdsInstance({
      appName,
      engine: input.plan.suggestion.database.engine ?? "postgresql",
      instanceClass: input.plan.suggestion.database.instanceClass,
      vpcId: vpc.id,
      subnetIds,
      allowedSecurityGroupId: sg.id
    });
    extraEnv = { ...extraEnv, DATABASE_URL: pulumi.interpolate`postgresql://awsify@${rds.endpoint}/${appName.replace(/-/g, "_")}` };
  }
  if (input.plan.suggestion.cache.required) {
    const redis = createElastiCacheRedis({ appName, vpcId: vpc.id, subnetIds, allowedSecurityGroupId: sg.id });
    extraEnv = { ...extraEnv, REDIS_URL: pulumi.interpolate`rediss://${redis.endpoint}:${redis.port}` };
  }

  const allEnv = { ...input.environment, ...extraEnv };

  const ami = aws.ec2.getAmiOutput({
    mostRecent: true,
    owners: ["amazon"],
    filters: [
      { name: "name", values: ["al2023-ami-*-x86_64"] },
      { name: "virtualization-type", values: ["hvm"] }
    ]
  });

  const userData = pulumi
    .all([input.imageUri, pulumi.output(allEnv)])
    .apply(([imageUri, env]) => {
      const envArgs = Object.entries(env)
        .map(([k, v]) => `-e ${k}=${v}`)
        .join(" ");
      return Buffer.from(`#!/bin/bash
yum update -y
yum install -y docker
systemctl start docker
systemctl enable docker
aws ecr get-login-password --region ${input.plan.region} | docker login --username AWS --password-stdin ${(imageUri as string).split("/")[0]}
docker pull ${imageUri}
docker run -d --restart unless-stopped -p 80:${port} ${envArgs} --log-driver=awslogs --log-opt awslogs-group=/awsify/${appName} --log-opt awslogs-region=${input.plan.region} ${imageUri}
`).toString("base64");
    });

  const eip = new aws.ec2.Eip(`${appName}-eip`, { domain: "vpc" });

  const instance = new aws.ec2.Instance(`${appName}-ec2`, {
    ami: ami.id,
    instanceType,
    subnetId: firstSubnet,
    vpcSecurityGroupIds: [sg.id],
    iamInstanceProfile: instanceProfile.name,
    userData,
    tags: { Name: appName }
  });

  new aws.ec2.EipAssociation(`${appName}-eip-assoc`, {
    instanceId: instance.id,
    allocationId: eip.allocationId
  });

  return {
    liveUrl: pulumi.interpolate`http://${eip.publicIp}`,
    repositoryUrl: repository.repositoryUrl,
    logGroupName: logGroup.name
  };
}
