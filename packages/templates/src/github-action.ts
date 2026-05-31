export function generateGithubAction(appName: string, region: string, projectId: string): string {
  return `name: Deploy ${appName}

on:
  workflow_dispatch:
  push:
    branches: [main]

permissions:
  contents: read
  id-token: write

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Trigger AWS-ify redeploy
        run: |
          curl -sS -X POST \\
            -H "Authorization: Bearer \${{ secrets.AWSIFY_API_TOKEN }}" \\
            -H "Content-Type: application/json" \\
            -d '{"projectId":"${projectId}","branch":"\${{ github.ref_name }}"}' \\
            "\${{ vars.AWSIFY_API_URL }}/v1/deployments/redeploy"
        env:
          AWS_REGION: ${region}
`;
}
