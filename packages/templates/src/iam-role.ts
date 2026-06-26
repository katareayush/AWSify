export function generateCloudFormationRoleTemplate(input: {
  awsifyAccountId: string;
  externalId?: string;
  roleName?: string;
}): string {
  const roleName = input.roleName ?? "AWSifyDeploymentRole";
  const externalIdRef = input.externalId ?? "!Ref ExternalId";
  const externalIdParam = input.externalId
    ? ""
    : `  ExternalId:
    Type: String
    Description: Unique ID issued by AWS-ify. Do not modify.
    NoEcho: true
`;

  return `AWSTemplateFormatVersion: "2010-09-09"
Description: AWS-ify deployment role - grants the permissions needed for the ECS Fargate blue-green MVP, assumable by AWS-ify and by GitHub Actions via OIDC.
Parameters:
${externalIdParam}  GitHubRepo:
    Type: String
    Default: ""
    Description: "owner/repo allowed to deploy from GitHub Actions (e.g. acme/web). Required to enable the GitHub Actions image-build path; leave blank for an AWS-ify-only role (no GitHub OIDC trust)."
  CreateGitHubOidcProvider:
    Type: String
    Default: "Yes"
    AllowedValues: ["Yes", "No"]
    Description: Create the GitHub Actions OIDC provider (only used when GitHubRepo is set). Choose No if your account already has one.
Conditions:
  CreateOidc: !Equals [!Ref CreateGitHubOidcProvider, "Yes"]
  ScopeToRepo: !Not [!Equals [!Ref GitHubRepo, ""]]
  # AWS rejects an OIDC trust that doesn't scope :sub, so only wire OIDC when a
  # repo is provided — and only create the provider when it will actually be used.
  CreateOidcProvider: !And [!Condition CreateOidc, !Condition ScopeToRepo]
Resources:
  GitHubOidcProvider:
    Type: AWS::IAM::OIDCProvider
    Condition: CreateOidcProvider
    Properties:
      Url: https://token.actions.githubusercontent.com
      ClientIdList:
        - sts.amazonaws.com
      ThumbprintList:
        - 6938fd4d98bab03faadb97b34396831e3780aea1
        - 1c58a3a8518e8759bf075b76b750d4f2df264fcd
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
                sts:ExternalId: ${externalIdRef}
          # Only present when GitHubRepo is set; AWS requires the :sub scope below.
          - !If
            - ScopeToRepo
            - Effect: Allow
              Principal:
                Federated: !If
                  - CreateOidcProvider
                  - !Ref GitHubOidcProvider
                  - !Sub "arn:aws:iam::\${AWS::AccountId}:oidc-provider/token.actions.githubusercontent.com"
              Action: sts:AssumeRoleWithWebIdentity
              Condition:
                StringEquals:
                  token.actions.githubusercontent.com:aud: sts.amazonaws.com
                StringLike:
                  token.actions.githubusercontent.com:sub: !Sub "repo:\${GitHubRepo}:*"
            - !Ref "AWS::NoValue"
      Policies:
        - PolicyName: AWSifyEcsFargateDeployPolicy
          PolicyDocument:
            Version: "2012-10-17"
            Statement:
              # ECR repositories and images, built by the worker or by GitHub Actions.
              - Effect: Allow
                Action:
                  - ecr:CreateRepository
                  - ecr:DescribeRepositories
                  - ecr:DeleteRepository
                  - ecr:GetAuthorizationToken
                  - ecr:BatchCheckLayerAvailability
                  - ecr:InitiateLayerUpload
                  - ecr:UploadLayerPart
                  - ecr:CompleteLayerUpload
                  - ecr:PutImage
                  - ecr:BatchGetImage
                  - ecr:GetDownloadUrlForLayer
                  - ecr:DescribeImages
                Resource: "*"
              # ECS Fargate cluster, service, task definition, and CodeDeploy task sets.
              - Effect: Allow
                Action:
                  - ecs:CreateCluster
                  - ecs:DescribeClusters
                  - ecs:DeleteCluster
                  - ecs:RegisterTaskDefinition
                  - ecs:DeregisterTaskDefinition
                  - ecs:DescribeTaskDefinition
                  - ecs:CreateService
                  - ecs:UpdateService
                  - ecs:DeleteService
                  - ecs:DescribeServices
                  - ecs:CreateTaskSet
                  - ecs:DeleteTaskSet
                  - ecs:DescribeTaskSets
                  - ecs:UpdateServicePrimaryTaskSet
                  - ecs:ListTasks
                  - ecs:DescribeTasks
                  - ecs:TagResource
                Resource: "*"
              # Blue-green orchestration.
              - Effect: Allow
                Action:
                  - codedeploy:CreateApplication
                  - codedeploy:GetApplication
                  - codedeploy:DeleteApplication
                  - codedeploy:CreateDeploymentGroup
                  - codedeploy:UpdateDeploymentGroup
                  - codedeploy:GetDeploymentGroup
                  - codedeploy:DeleteDeploymentGroup
                  - codedeploy:CreateDeployment
                  - codedeploy:GetDeployment
                  - codedeploy:GetDeploymentConfig
                  - codedeploy:RegisterApplicationRevision
                  - codedeploy:ListDeployments
                  - codedeploy:StopDeployment
                  - codedeploy:ContinueDeployment
                  - codedeploy:BatchGetApplications
                  - codedeploy:BatchGetDeployments
                Resource: "*"
              # GitHub-managed environment values delivered to the ECS task.
              - Effect: Allow
                Action:
                  - secretsmanager:CreateSecret
                  - secretsmanager:DescribeSecret
                  - secretsmanager:PutSecretValue
                  - secretsmanager:GetSecretValue
                  - secretsmanager:UpdateSecret
                  - secretsmanager:DeleteSecret
                  - secretsmanager:TagResource
                Resource: !Sub "arn:aws:secretsmanager:*:\${AWS::AccountId}:secret:/awsify/*"
              # VPC discovery and security groups for the public ALB and Fargate tasks.
              - Effect: Allow
                Action:
                  - ec2:DescribeVpcs
                  - ec2:DescribeSubnets
                  - ec2:DescribeSecurityGroups
                  - ec2:DescribeInternetGateways
                  - ec2:CreateSecurityGroup
                  - ec2:DeleteSecurityGroup
                  - ec2:AuthorizeSecurityGroupIngress
                  - ec2:AuthorizeSecurityGroupEgress
                  - ec2:RevokeSecurityGroupIngress
                  - ec2:RevokeSecurityGroupEgress
                  - ec2:CreateTags
                  - ec2:DeleteTags
                Resource: "*"
              # Public HTTP load balancer with blue + green target groups.
              - Effect: Allow
                Action:
                  - elasticloadbalancing:CreateLoadBalancer
                  - elasticloadbalancing:DeleteLoadBalancer
                  - elasticloadbalancing:DescribeLoadBalancers
                  - elasticloadbalancing:CreateTargetGroup
                  - elasticloadbalancing:DeleteTargetGroup
                  - elasticloadbalancing:DescribeTargetGroups
                  - elasticloadbalancing:DescribeTargetHealth
                  - elasticloadbalancing:CreateListener
                  - elasticloadbalancing:DeleteListener
                  - elasticloadbalancing:DescribeListeners
                  - elasticloadbalancing:ModifyListener
                  - elasticloadbalancing:ModifyTargetGroup
                  - elasticloadbalancing:DescribeRules
                  - elasticloadbalancing:CreateRule
                  - elasticloadbalancing:DeleteRule
                  - elasticloadbalancing:ModifyRule
                  - elasticloadbalancing:SetRulePriorities
                  - elasticloadbalancing:AddTags
                  - elasticloadbalancing:RemoveTags
                Resource: "*"
              # Observability
              - Effect: Allow
                Action:
                  - logs:CreateLogGroup
                  - logs:DeleteLogGroup
                  - logs:DescribeLogGroups
                  - logs:PutRetentionPolicy
                  - logs:TagResource
                  - logs:UntagResource
                  - cloudwatch:PutMetricAlarm
                  - cloudwatch:DeleteAlarms
                  - cloudwatch:DescribeAlarms
                Resource: "*"
              # IAM roles AWS-ify creates for ECS task execution and CodeDeploy.
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
                Resource: !Sub "arn:aws:iam::\${AWS::AccountId}:role/awsify-*"
              # Service-linked roles ECS, ELB, and CodeDeploy create on first use.
              - Effect: Allow
                Action: iam:CreateServiceLinkedRole
                Resource: "*"
                Condition:
                  StringEquals:
                    iam:AWSServiceName:
                      - ecs.amazonaws.com
                      - codedeploy.amazonaws.com
                      - elasticloadbalancing.amazonaws.com
              # Bootstraps self-healing: lets AWS-ify keep the AWSifyManagedPipeline
              # inline policy current on this role, so future permission additions
              # apply automatically on the next deploy with no stack update.
              - Effect: Allow
                Action:
                  - iam:GetRolePolicy
                  - iam:PutRolePolicy
                  - iam:DeleteRolePolicy
                Resource: !Sub "arn:aws:iam::\${AWS::AccountId}:role/${roleName}"
Outputs:
  RoleArn:
    Description: Set this as the AWSIFY_DEPLOY_ROLE_ARN variable in your GitHub repo and paste it into AWS-ify.
    Value: !GetAtt AWSifyDeploymentRole.Arn
`;
}
