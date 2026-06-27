/**
 * The single source of truth for the deployment role's pipeline permissions.
 *
 * The worker re-applies this as an inline policy (named below) on the role at the
 * start of every deploy, so when AWSify needs a new IAM action we only edit this
 * file — every subsequent deploy self-heals the role.
 *
 * It is intentionally generous (full management of the services AWSify owns in
 * the account) so Pulumi's read-after-create lookups (tags, inline policies)
 * never trip an AccessDenied. The CloudFormation role template additionally
 * grants the role permission to manage this one policy on itself (see iam-role.ts).
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
        // GitHub-managed env values delivered to the ECS task.
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
      // Services AWSify fully owns in the account — granted broadly so Pulumi's
      // create + read-back (describe/list-tags/list-policies) never trips up.
      { Sid: "AwsifyEcs", Effect: "Allow", Action: "ecs:*", Resource: "*" },
      { Sid: "AwsifyElb", Effect: "Allow", Action: "elasticloadbalancing:*", Resource: "*" },
      { Sid: "AwsifyCodeDeploy", Effect: "Allow", Action: "codedeploy:*", Resource: "*" },
      { Sid: "AwsifyLogs", Effect: "Allow", Action: "logs:*", Resource: "*" },
      { Sid: "AwsifyEcr", Effect: "Allow", Action: "ecr:*", Resource: "*" },
      {
        Sid: "AwsifyEc2",
        Effect: "Allow",
        Resource: "*",
        Action: [
          "ec2:Describe*",
          "ec2:CreateSecurityGroup",
          "ec2:DeleteSecurityGroup",
          "ec2:AuthorizeSecurityGroupIngress",
          "ec2:AuthorizeSecurityGroupEgress",
          "ec2:RevokeSecurityGroupIngress",
          "ec2:RevokeSecurityGroupEgress",
          "ec2:CreateTags",
          "ec2:DeleteTags"
        ]
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
        // The ECS task-execution / task / CodeDeploy roles AWSify creates per app.
        Sid: "AwsifyAppRoles",
        Effect: "Allow",
        Resource: `arn:aws:iam::${accountId}:role/awsify-*`,
        Action: [
          "iam:CreateRole",
          "iam:DeleteRole",
          "iam:GetRole",
          "iam:PassRole",
          "iam:PutRolePolicy",
          "iam:DeleteRolePolicy",
          "iam:GetRolePolicy",
          "iam:ListRolePolicies",
          "iam:AttachRolePolicy",
          "iam:DetachRolePolicy",
          "iam:ListAttachedRolePolicies",
          "iam:ListRoleTags",
          "iam:TagRole",
          "iam:UntagRole",
          "iam:ListInstanceProfilesForRole"
        ]
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
