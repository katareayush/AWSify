/**
 * Generates the `.github/workflows/awsify-deploy.yml` artifact.
 *
 * The workflow runs entirely in the customer's GitHub repo and:
 *   1. Assumes the AWSify deployment role via GitHub OIDC (no stored AWS keys).
 *   2. Builds the Docker image and pushes it to the customer's ECR.
 *   3. Syncs GitHub Actions secrets + variables into AWS Secrets Manager, which
 *      the ECS task reads at launch — GitHub Environments stay the source of truth.
 *   4. Triggers an AWSify redeploy with the freshly built image URI; AWSify then
 *      runs the blue-green rollout.
 *
 * The user wires three repo settings AWSify surfaces in the deploy screen:
 *   - secret  AWSIFY_API_TOKEN        (CI redeploy token)
 *   - variable AWSIFY_API_URL         (AWSify API base URL)
 *   - variable AWSIFY_DEPLOY_ROLE_ARN (the role the CloudFormation stack created)
 */
export function generateGithubAction(
  appName: string,
  region: string,
  projectId: string,
  branch = "main"
): string {
  const envSecretName = `/awsify/${appName}/env`;

  return `name: Deploy ${appName}

on:
  workflow_dispatch:
  push:
    branches: [${branch}]

concurrency:
  group: awsify-deploy-${appName}
  cancel-in-progress: false

permissions:
  contents: read
  id-token: write

env:
  AWS_REGION: ${region}
  ECR_REPOSITORY: ${appName}
  AWSIFY_PROJECT_ID: ${projectId}
  AWSIFY_ENV_SECRET: ${envSecretName}

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials (OIDC)
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: \${{ vars.AWSIFY_DEPLOY_ROLE_ARN }}
          aws-region: \${{ env.AWS_REGION }}

      - name: Log in to Amazon ECR
        id: ecr
        uses: aws-actions/amazon-ecr-login@v2

      - name: Ensure ECR repository exists
        run: |
          aws ecr describe-repositories --repository-names "\$ECR_REPOSITORY" >/dev/null 2>&1 \\
            || aws ecr create-repository \\
                 --repository-name "\$ECR_REPOSITORY" \\
                 --image-scanning-configuration scanOnPush=true >/dev/null

      - name: Build and push image
        id: build
        env:
          REGISTRY: \${{ steps.ecr.outputs.registry }}
        run: |
          # Tag with run id as well as the commit SHA so re-running a workflow on
          # the same commit still produces a fresh task-definition revision.
          IMAGE_URI="\$REGISTRY/\$ECR_REPOSITORY:\${GITHUB_SHA}-\${GITHUB_RUN_ID}"
          docker build -t "\$IMAGE_URI" .
          docker push "\$IMAGE_URI"
          echo "image_uri=\$IMAGE_URI" >> "\$GITHUB_OUTPUT"

      - name: Sync environment to AWS Secrets Manager
        env:
          # GitHub exposes every secret/variable as JSON here. The values never
          # leave the runner except to land in the customer's own Secrets Manager.
          SECRETS_JSON: \${{ toJSON(secrets) }}
          VARS_JSON: \${{ toJSON(vars) }}
        run: |
          # Merge vars over secrets, drop AWSify-internal keys, and keep only
          # names that are valid environment-variable identifiers for ECS.
          PAYLOAD=\$(jq -n --argjson s "\${SECRETS_JSON:-{}}" --argjson v "\${VARS_JSON:-{}}" \\
            '(\$s + \$v)
             | del(.AWSIFY_API_TOKEN, .AWSIFY_API_URL, .AWSIFY_DEPLOY_ROLE_ARN, .github_token)
             | to_entries | map(select(.key | test("^[A-Za-z_][A-Za-z0-9_]*\$"))) | from_entries')
          if aws secretsmanager describe-secret --secret-id "\$AWSIFY_ENV_SECRET" >/dev/null 2>&1; then
            aws secretsmanager put-secret-value \\
              --secret-id "\$AWSIFY_ENV_SECRET" --secret-string "\$PAYLOAD" >/dev/null
          else
            aws secretsmanager create-secret \\
              --name "\$AWSIFY_ENV_SECRET" --secret-string "\$PAYLOAD" >/dev/null
          fi

      - name: Trigger AWSify blue-green deploy
        env:
          IMAGE_URI: \${{ steps.build.outputs.image_uri }}
        run: |
          curl -sS --fail-with-body -X POST \\
            -H "Authorization: Bearer \${{ secrets.AWSIFY_API_TOKEN }}" \\
            -H "Content-Type: application/json" \\
            -d "{\\"projectId\\":\\"\$AWSIFY_PROJECT_ID\\",\\"branch\\":\\"\${GITHUB_REF_NAME}\\",\\"imageUri\\":\\"\$IMAGE_URI\\"}" \\
            "\${{ vars.AWSIFY_API_URL }}/v1/deployments/redeploy"
`;
}
