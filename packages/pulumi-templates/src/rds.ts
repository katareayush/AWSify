import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

export interface RdsInput {
  appName: string;
  engine: "postgresql" | "mysql" | "mongodb";
  instanceClass?: string;
  vpcId: pulumi.Input<string>;
  subnetIds: pulumi.Input<string[]>;
  allowedSecurityGroupId: pulumi.Input<string>;
}

export interface RdsOutputs {
  endpoint: pulumi.Output<string>;
  port: pulumi.Output<number>;
  secretArn: pulumi.Output<string>;
  password: pulumi.Output<string>;
}

export function createRdsInstance(input: RdsInput): RdsOutputs {
  const { appName } = input;
  const isPostgres = input.engine === "postgresql";
  const isMysql = input.engine === "mysql";

  const engineName = isPostgres ? "postgres" : isMysql ? "mysql" : "postgres";
  const engineVersion = isPostgres ? "16.3" : isMysql ? "8.0.35" : "16.3";
  const defaultPort = isPostgres ? 5432 : isMysql ? 3306 : 5432;
  const instanceClass = input.instanceClass ?? "db.t3.micro";

  const dbPassword = new aws.secretsmanager.Secret(`${appName}-db-secret`, {
    name: `/awsify/${appName}/db-password`,
    recoveryWindowInDays: 0
  });

  const dbPasswordValue = new aws.secretsmanager.SecretVersion(`${appName}-db-secret-value`, {
    secretId: dbPassword.id,
    secretString: JSON.stringify({ password: crypto.randomUUID().replace(/-/g, "") })
  });

  const subnetGroup = new aws.rds.SubnetGroup(`${appName}-db-subnets`, {
    name: `${appName}-db-subnets`,
    subnetIds: input.subnetIds
  });

  const sg = new aws.ec2.SecurityGroup(`${appName}-db-sg`, {
    vpcId: input.vpcId,
    description: "AWSify RDS access from app",
    ingress: [
      {
        protocol: "tcp",
        fromPort: defaultPort,
        toPort: defaultPort,
        securityGroups: [input.allowedSecurityGroupId]
      }
    ],
    egress: [{ protocol: "-1", fromPort: 0, toPort: 0, cidrBlocks: ["0.0.0.0/0"] }]
  });

  const dbInstance = new aws.rds.Instance(`${appName}-db`, {
    identifier: `${appName}-db`,
    engine: engineName,
    engineVersion,
    instanceClass,
    allocatedStorage: 20,
    storageType: "gp3",
    dbName: appName.replace(/-/g, "_"),
    username: "awsify",
    password: dbPasswordValue.secretString.apply(s => (JSON.parse(s ?? "{}") as { password: string }).password),
    dbSubnetGroupName: subnetGroup.name,
    vpcSecurityGroupIds: [sg.id],
    multiAz: false,
    publiclyAccessible: false,
    skipFinalSnapshot: true,
    deletionProtection: false,
    backupRetentionPeriod: 7
  });

  return {
    endpoint: dbInstance.endpoint,
    port: dbInstance.port,
    secretArn: dbPassword.arn,
    password: dbPasswordValue.secretString.apply(s => (JSON.parse(s ?? "{}") as { password: string }).password)
  };
}
