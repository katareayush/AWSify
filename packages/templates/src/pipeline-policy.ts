/**
 * The single source of truth for the deployment role's drift-prone permissions.
 *
 * The worker re-applies this as an inline policy (named below) on the role at the
 * start of every deploy, so when AWSify adds a feature that needs a new IAM
 * action we only edit this file — every subsequent deploy self-heals the role.
 *
 * The CloudFormation role template additionally grants the role permission to
 * manage *this one policy* on itself (the bootstrap that makes self-heal work);
 * see iam-role.ts. Roles created before that grant get a one-time manual update.
 */
export const MANAGED_PIPELINE_POLICY_NAME = "AWSifyManagedPipeline";

export interface IamPolicyDocument {
  Version: "2012-10-17";
  Statement: Array<Record<string, unknown>>;
}

export function buildManagedPipelinePolicy(accountId: string, roleName: string): IamPolicyDocument {
  return {
    Version: "2012-10-17",
    Statement: [
      {
        Sid: "AwsifyEnvSecrets",
        Effect: "Allow",
        Action: [
          "secretsmanager:CreateSecret",
          "secretsmanager:DescribeSecret",
          "secretsmanager:PutSecretValue",
          "secretsmanager:GetSecretValue",
          "secretsmanager:UpdateSecret",
          "secretsmanager:DeleteSecret",
          "secretsmanager:TagResource"
        ],
        Resource: `arn:aws:secretsmanager:*:${accountId}:secret:/awsify/*`
      },
      {
        Sid: "AwsifyBlueGreen",
        Effect: "Allow",
        Action: [
          "codedeploy:CreateApplication",
          "codedeploy:GetApplication",
          "codedeploy:DeleteApplication",
          "codedeploy:CreateDeploymentGroup",
          "codedeploy:UpdateDeploymentGroup",
          "codedeploy:GetDeploymentGroup",
          "codedeploy:DeleteDeploymentGroup",
          "codedeploy:CreateDeployment",
          "codedeploy:GetDeployment",
          "codedeploy:GetDeploymentConfig",
          "codedeploy:RegisterApplicationRevision",
          "codedeploy:ListApplications",
          "codedeploy:ListDeployments",
          "codedeploy:StopDeployment",
          "codedeploy:ContinueDeployment",
          "codedeploy:BatchGetApplications",
          "codedeploy:BatchGetDeployments"
        ],
        Resource: "*"
      },
      {
        Sid: "AwsifyEcsTaskSets",
        Effect: "Allow",
        Action: [
          "ecs:CreateTaskSet",
          "ecs:DeleteTaskSet",
          "ecs:DescribeTaskSets",
          "ecs:UpdateServicePrimaryTaskSet",
          "ecs:TagResource"
        ],
        Resource: "*"
      },
      {
        Sid: "AwsifyElbRules",
        Effect: "Allow",
        Action: [
          "elasticloadbalancing:DescribeRules",
          "elasticloadbalancing:CreateRule",
          "elasticloadbalancing:DeleteRule",
          "elasticloadbalancing:ModifyRule",
          "elasticloadbalancing:SetRulePriorities",
          "elasticloadbalancing:DescribeTargetHealth"
        ],
        Resource: "*"
      },
      {
        Sid: "AwsifyServiceLinkedRoles",
        Effect: "Allow",
        Action: "iam:CreateServiceLinkedRole",
        Resource: "*",
        Condition: {
          StringEquals: {
            "iam:AWSServiceName": [
              "ecs.amazonaws.com",
              "codedeploy.amazonaws.com",
              "elasticloadbalancing.amazonaws.com"
            ]
          }
        }
      },
      {
        Sid: "AwsifyEcrPull",
        Effect: "Allow",
        Action: "ecr:GetDownloadUrlForLayer",
        Resource: "*"
      },
      {
        // Lets the role keep this very policy current on itself going forward.
        Sid: "AwsifySelfHeal",
        Effect: "Allow",
        Action: ["iam:GetRolePolicy", "iam:PutRolePolicy", "iam:DeleteRolePolicy"],
        Resource: `arn:aws:iam::${accountId}:role/${roleName}`
      }
    ]
  };
}
