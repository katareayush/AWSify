export type DiagnosisCategory =
  | "missing_env_var"
  | "docker_build"
  | "docker_push_ecr"
  | "aws_role_permission"
  | "pulumi_apply"
  | "ecs_health_check"
  | "github_clone_access"
  | "unknown";

export interface DeploymentDiagnosis {
  category: DiagnosisCategory;
  title: string;
  probableCause: string;
  suggestedFix: string;
  relatedLogs: string[];
}

interface DeploymentLog {
  status?: string;
  message?: string;
}

export function diagnoseDeploymentFailure(reason: string, logs: DeploymentLog[] = []): DeploymentDiagnosis {
  const haystack = [reason, ...logs.map((log) => log.message ?? "")].join("\n").toLowerCase();
  const relatedLogs = pickRelatedLogs(reason, logs);

  if (matches(haystack, ["requires project env vars", "missing env", "not stored yet", "environment variable"])) {
    return {
      category: "missing_env_var",
      title: "Missing environment variable",
      probableCause: "The app needs one or more required variables that were not saved before deployment.",
      suggestedFix: "Open Environment variables, save the missing required values, then approve or redeploy.",
      relatedLogs
    };
  }

  if (matches(haystack, ["docker build failed", "failed to solve", "npm err!", "pnpm", "yarn install", "bun install"])) {
    return {
      category: "docker_build",
      title: "Container build failed",
      probableCause: "Docker could not build the generated or repository Dockerfile for this app.",
      suggestedFix: "Review the generated Dockerfile, package manager, install command, build command, and any build-time env vars.",
      relatedLogs
    };
  }

  if (matches(haystack, ["docker push", "ecr", "authorization token", "repository access", "denied:"])) {
    return {
      category: "docker_push_ecr",
      title: "Image push failed",
      probableCause: "AWSify could not authenticate to ECR, create the repository, or push the container image.",
      suggestedFix: "Validate the AWS role permissions for ECR and retry the deployment.",
      relatedLogs
    };
  }

  if (matches(haystack, ["assumerole", "assume role", "accessdenied", "not authorized", "external id", "iam role"])) {
    return {
      category: "aws_role_permission",
      title: "AWS role or permission issue",
      probableCause: "AWS rejected the role assumption or a permission required by the deployment.",
      suggestedFix: "Revalidate the AWS connection, recreate the CloudFormation role if needed, and confirm the external ID matches.",
      relatedLogs
    };
  }

  if (matches(haystack, ["pulumi apply failed", "pulumi", "quota", "default vpc", "security group", "target group"])) {
    return {
      category: "pulumi_apply",
      title: "Infrastructure apply failed",
      probableCause: "Pulumi could not create or update one or more AWS resources.",
      suggestedFix: "Check AWS quotas, default VPC availability, and the role permissions for ECS, ALB, IAM, CloudWatch, and security groups.",
      relatedLogs
    };
  }

  if (matches(haystack, ["health check", "timed out", "503", "502", "connection refused", "service health"])) {
    return {
      category: "ecs_health_check",
      title: "Service health check failed",
      probableCause: "The ECS service started but did not pass the configured HTTP health check.",
      suggestedFix: "Confirm the port and health path, then check app startup logs and required runtime env vars.",
      relatedLogs
    };
  }

  if (matches(haystack, ["git clone failed", "repository access", "github app", "branch", "not found"])) {
    return {
      category: "github_clone_access",
      title: "GitHub clone failed",
      probableCause: "AWSify could not clone the selected repository or branch with the installed GitHub App.",
      suggestedFix: "Refresh repositories, confirm the GitHub App has access to this repo, and verify the branch still exists.",
      relatedLogs
    };
  }

  return {
    category: "unknown",
    title: "Deployment failed",
    probableCause: "The failure did not match a known deterministic category.",
    suggestedFix: "Review the raw failure and logs, then check repository access, build settings, AWS permissions, and runtime health.",
    relatedLogs
  };
}

function matches(input: string, needles: string[]) {
  return needles.some((needle) => input.includes(needle));
}

function pickRelatedLogs(reason: string, logs: DeploymentLog[]) {
  const lowerReason = reason.toLowerCase();
  const candidates = logs
    .map((log) => log.message)
    .filter((message): message is string => Boolean(message))
    .filter((message) => {
      const lower = message.toLowerCase();
      return lower.includes("failed") || lower.includes("error") || lowerReason.includes(lower.slice(0, 40));
    });
  return (candidates.length > 0 ? candidates : [reason]).slice(-5);
}
