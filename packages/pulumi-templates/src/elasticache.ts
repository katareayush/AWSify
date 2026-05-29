import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

export interface ElastiCacheInput {
  appName: string;
  nodeType?: string;
  vpcId: pulumi.Input<string>;
  subnetIds: pulumi.Input<string[]>;
  allowedSecurityGroupId: pulumi.Input<string>;
}

export interface ElastiCacheOutputs {
  endpoint: pulumi.Output<string>;
  port: pulumi.Output<number>;
}

export function createElastiCacheRedis(input: ElastiCacheInput): ElastiCacheOutputs {
  const { appName } = input;
  const nodeType = input.nodeType ?? "cache.t3.micro";

  const subnetGroup = new aws.elasticache.SubnetGroup(`${appName}-redis-subnets`, {
    name: `${appName}-redis-subnets`,
    subnetIds: input.subnetIds
  });

  const sg = new aws.ec2.SecurityGroup(`${appName}-redis-sg`, {
    vpcId: input.vpcId,
    description: "AWSify ElastiCache Redis access from app",
    ingress: [
      {
        protocol: "tcp",
        fromPort: 6379,
        toPort: 6379,
        securityGroups: [input.allowedSecurityGroupId]
      }
    ],
    egress: [{ protocol: "-1", fromPort: 0, toPort: 0, cidrBlocks: ["0.0.0.0/0"] }]
  });

  const replicationGroup = new aws.elasticache.ReplicationGroup(`${appName}-redis`, {
    replicationGroupId: `${appName}-redis`,
    description: `AWSify Redis for ${appName}`,
    nodeType,
    numCacheClusters: 1,
    port: 6379,
    subnetGroupName: subnetGroup.name,
    securityGroupIds: [sg.id],
    automaticFailoverEnabled: false,
    atRestEncryptionEnabled: true,
    transitEncryptionEnabled: true
  });

  return {
    endpoint: replicationGroup.primaryEndpointAddress,
    port: pulumi.output(6379)
  };
}
