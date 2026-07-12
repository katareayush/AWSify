// Friendly labels for the AWS resource types recorded on a deployment plan
// (see the `resources` enum in @awsify/deployment-schemas).
const RESOURCE_LABELS: Record<string, string> = {
  "ecr.repository": "ECR repository",
  "ecs.cluster": "ECS cluster",
  "ecs.service": "ECS service",
  "ecs.taskDefinition": "ECS task definition",
  "elasticloadbalancingv2.loadBalancer": "Load balancer",
  "elasticloadbalancingv2.targetGroup": "Target group",
  "cloudwatch.logGroup": "CloudWatch log group",
  "iam.role": "IAM role",
  "ec2.securityGroup": "Security group",
  "rds.instance": "RDS instance",
  "elasticache.replicationGroup": "ElastiCache cluster",
  "secretsmanager.secret": "Secrets Manager secret",
  "codedeploy.application": "CodeDeploy application",
  "codedeploy.deploymentGroup": "CodeDeploy deployment group"
};

export function resourceTypeLabel(type: string): string {
  return RESOURCE_LABELS[type] ?? type;
}

// The AWS "service" prefix, e.g. "ecs.service" -> "ECS". Used as a compact tag.
export function resourceServiceTag(type: string): string {
  const prefix = type.split(".")[0] ?? type;
  const KNOWN: Record<string, string> = {
    ecr: "ECR",
    ecs: "ECS",
    elasticloadbalancingv2: "ELB",
    cloudwatch: "CloudWatch",
    iam: "IAM",
    ec2: "EC2",
    rds: "RDS",
    elasticache: "ElastiCache",
    secretsmanager: "Secrets",
    codedeploy: "CodeDeploy"
  };
  return KNOWN[prefix] ?? prefix.toUpperCase();
}
