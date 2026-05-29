export function generateGithubAction(appName: string, region: string): string {
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
      - name: Trigger AWSify deployment
        run: |
          curl -sS -X POST \\
            -H "Authorization: Bearer \${{ secrets.AWSIFY_API_TOKEN }}" \\
            -H "Content-Type: application/json" \\
            -d '{"branch":"\${{ github.ref_name }}"}' \\
            https://api.awsify.dev/v1/projects/\${{ vars.AWSIFY_PROJECT_ID }}/deploy
        env:
          AWS_REGION: ${region}
`;
}
