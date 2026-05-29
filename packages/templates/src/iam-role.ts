export function generateCloudFormationRoleTemplate(input: {
  awsifyAccountId: string;
  externalId: string;
  roleName?: string;
}): string {
  const roleName = input.roleName ?? "AWSifyDeploymentRole";

  return `AWSTemplateFormatVersion: "2010-09-09"
Description: AWSify deployment role — grants AWSify the permissions needed to deploy and manage your infrastructure.
Parameters: {}
Resources:
  AWSifyDeploymentRole:
    Type: AWS::IAM::Role
    Properties:
      RoleName: ${roleName}
      AssumeRolePolicyDocument:
        Version: "2012-10-17"
        Statement:
          - Effect: Allow
            Principal:
              AWS: arn:aws:iam::${input.awsifyAccountId}:root
            Action: sts:AssumeRole
            Condition:
              StringEquals:
                sts:ExternalId: ${input.externalId}
      Policies:
        - PolicyName: AWSifyFullDeployPolicy
          PolicyDocument:
            Version: "2012-10-17"
            Statement:
              # Container & ECS (Fargate + EC2)
              - Effect: Allow
                Action: ["ecr:*", "ecs:*"]
                Resource: "*"
              # Load balancing
              - Effect: Allow
                Action: ["elasticloadbalancing:*"]
                Resource: "*"
              # EC2 (instances, networking, ASGs)
              - Effect: Allow
                Action:
                  - ec2:*
                  - autoscaling:*
                Resource: "*"
              # Lambda + API Gateway
              - Effect: Allow
                Action:
                  - lambda:*
                  - apigateway:*
                  - execute-api:*
                Resource: "*"
              # Static hosting
              - Effect: Allow
                Action: ["s3:*", "cloudfront:*"]
                Resource: "*"
              # Database
              - Effect: Allow
                Action: ["rds:*", "elasticache:*"]
                Resource: "*"
              # Observability
              - Effect: Allow
                Action: ["logs:*", "cloudwatch:*", "xray:*"]
                Resource: "*"
              # IAM (scoped — only roles AWSify creates)
              - Effect: Allow
                Action:
                  - iam:CreateRole
                  - iam:DeleteRole
                  - iam:GetRole
                  - iam:PassRole
                  - iam:PutRolePolicy
                  - iam:DeleteRolePolicy
                  - iam:AttachRolePolicy
                  - iam:DetachRolePolicy
                  - iam:CreateInstanceProfile
                  - iam:DeleteInstanceProfile
                  - iam:AddRoleToInstanceProfile
                  - iam:RemoveRoleFromInstanceProfile
                Resource: "*"
              # ACM (for HTTPS)
              - Effect: Allow
                Action: ["acm:*"]
                Resource: "*"
              # Route 53 (optional custom domains)
              - Effect: Allow
                Action: ["route53:*"]
                Resource: "*"
              # Secrets (for injecting env vars)
              - Effect: Allow
                Action: ["secretsmanager:*", "ssm:*"]
                Resource: "*"
Outputs:
  RoleArn:
    Value: !GetAtt AWSifyDeploymentRole.Arn
`;
}
