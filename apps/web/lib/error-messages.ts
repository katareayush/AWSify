// Map raw backend / API errors to friendly text users can act on.
// Order matters: more specific patterns first. Falls back to the raw string.

interface Rule {
  match: (raw: string) => boolean;
  message: string;
}

const RULES: Rule[] = [
  // --- GitHub App permissions ---
  {
    match: (s) => /Resource not accessible by integration/i.test(s),
    message:
      "GitHub App is missing required permissions (Contents + Workflows: Read & write). Update permissions on github.com → Developer settings → GitHub Apps → AWS-ify → Permissions & events, then re-accept the upgrade on your installation."
  },
  {
    match: (s) => /installation_token_failed/i.test(s),
    message:
      "Could not get a GitHub App installation token. The App may have been uninstalled, or its private key is invalid. Reinstall the App from the Connections page."
  },
  {
    match: (s) => /installation_missing/i.test(s),
    message:
      "This repository has no AWS-ify GitHub App installation. Install the App on this repo from the Connections page."
  },
  {
    match: (s) => /base_branch_lookup_failed/i.test(s),
    message:
      "Could not read the repository's default branch on GitHub. Verify the GitHub App still has access to this repo (Settings → Installations → Configure)."
  },
  {
    match: (s) => /branch_create_failed/i.test(s),
    message:
      "Could not create the deploy branch on GitHub. The GitHub App may be missing Contents write permission, or the branch name is protected."
  },
  {
    match: (s) => /file_commit_failed/i.test(s) && /workflows/i.test(s),
    message:
      "GitHub blocked writing the workflow file. The App needs Workflows: Read & write permission. Update it on github.com and re-accept the install."
  },
  {
    match: (s) => /file_commit_failed/i.test(s),
    message:
      "GitHub rejected writing one of the deployment files. Most often this is a missing Contents write permission on the GitHub App."
  },
  {
    match: (s) => /pr_create_failed/i.test(s),
    message:
      "GitHub rejected opening the pull request. If a PR for this branch already exists, refresh — we'll surface it."
  },

  // --- AWS / IAM ---
  {
    match: (s) => /is not authorized to perform: sts:AssumeRole/i.test(s),
    message:
      "AWS rejected the role assumption. Two checks: (1) the EC2 instance role has sts:AssumeRole permission on the target role, and (2) the ExternalId in this session matches the one baked into the CloudFormation stack. If you reloaded the Connections page between launching the stack and clicking Connect, the ExternalId rotated — delete the stack and redo without reloading."
  },
  {
    match: (s) => /aws_validation_failed/i.test(s),
    message: "AWS validation failed. See details below."
  },
  {
    match: (s) => /missing_account_id_from_sts/i.test(s),
    message:
      "AWS accepted the role but didn't return an account identity. Try again; if this persists, recreate the CloudFormation stack."
  },
  {
    match: (s) => /invalid_external_id/i.test(s),
    message:
      "The ExternalId on this session doesn't match the one in the CloudFormation role's trust policy. Reload this page (do not reload again), click Launch Stack, then paste the new Role ARN."
  },

  // --- Deploy / orchestration ---
  {
    match: (s) => /Docker build failed/i.test(s),
    message:
      "The container image failed to build. Most common causes: missing/locked dependency files, a build step that needs a binary not in the base image, or out-of-disk on the build host."
  },
  {
    match: (s) => /Docker push to ECR failed/i.test(s),
    message:
      "Image built but couldn't be pushed to ECR. Check that the AWS role has ECR push permissions and the repository exists in the target region."
  },
  {
    match: (s) => /Pulumi apply failed/i.test(s),
    message:
      "Pulumi couldn't provision the AWS resources. Common causes: missing default VPC in the region, ECS/ALB service quotas hit, or the role lacks one of the required permissions."
  },
  {
    match: (s) => /requires project env vars that are not stored/i.test(s),
    message:
      "Deployment is blocked: one or more required environment variables haven't been saved yet. Add them in the Env vars panel and re-run."
  },
  {
    match: (s) => /deployment_running/i.test(s),
    message: "This deployment is still running. Wait for it to finish before deleting it."
  },

  // --- Auth / session ---
  {
    match: (s) => /invalid_session|not_authenticated/i.test(s),
    message: "Your session expired. Sign in again."
  },

  // --- Generic transport ---
  {
    match: (s) => /^HTTP 5\d\d/i.test(s),
    message: "The server hit an internal error. Try again in a moment; if it keeps happening, check the api logs."
  },
  {
    match: (s) => /Failed to fetch|NetworkError|TypeError: fetch/i.test(s),
    message: "Couldn't reach the API. Check your internet connection and that the API is up."
  }
];

export function humanizeError(raw: unknown): string {
  const text = raw instanceof Error ? raw.message : typeof raw === "string" ? raw : String(raw ?? "");
  if (!text) return "Something went wrong.";
  for (const rule of RULES) {
    if (rule.match(text)) return rule.message;
  }
  return text;
}
