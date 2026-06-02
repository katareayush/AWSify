"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateCloudFormationRoleTemplate = generateCloudFormationRoleTemplate;
function generateCloudFormationRoleTemplate(input) {
    const roleName = input.roleName ?? "AWSifyDeploymentRole";
    return `AWSTemplateFormatVersion: "2010-09-09"
Description: AWS-ify deployment role - grants only the permissions needed for the ECS Fargate MVP.
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
        - PolicyName: AWSifyEcsFargateDeployPolicy
          PolicyDocument:
            Version: "2012-10-17"
            Statement:
              # ECR repositories and images created for approved deployments.
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
                  - ecr:DescribeImages
                Resource: "*"
              # ECS Fargate cluster, service, and task definition lifecycle.
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
                  - ecs:ListTasks
                  - ecs:DescribeTasks
                Resource: "*"
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
              # Public HTTP load balancer.
              - Effect: Allow
                Action:
                  - elasticloadbalancing:CreateLoadBalancer
                  - elasticloadbalancing:DeleteLoadBalancer
                  - elasticloadbalancing:DescribeLoadBalancers
                  - elasticloadbalancing:CreateTargetGroup
                  - elasticloadbalancing:DeleteTargetGroup
                  - elasticloadbalancing:DescribeTargetGroups
                  - elasticloadbalancing:CreateListener
                  - elasticloadbalancing:DeleteListener
                  - elasticloadbalancing:DescribeListeners
                  - elasticloadbalancing:ModifyListener
                  - elasticloadbalancing:ModifyTargetGroup
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
              # IAM roles AWS-ify creates for ECS task execution.
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
Outputs:
  RoleArn:
    Value: !GetAtt AWSifyDeploymentRole.Arn
`;
}
