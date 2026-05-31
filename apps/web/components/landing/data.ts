export const navLinks = [
  ["Problem", "#problem"],
  ["How it works", "#how"],
  ["Examples", "#examples"],
  ["Security", "#security"],
  ["FAQ", "#faq"]
] as const;

export const logoStripItems = [
  "AWS",
  "Pulumi",
  "Anthropic",
  "GitHub",
  "Docker"
];

export const pains = [
  {
    title: "Console clicking",
    body: "Hours lost to AWS forms: VPCs, IAM roles, target groups. Each one a chance to misconfigure production."
  },
  {
    title: "AI that hallucinates infra",
    body: "Generic LLM output ships invalid Terraform or made-up resource names. Cool demo. Doesn't deploy."
  },
  {
    title: "DevOps as a bottleneck",
    body: "Every new service waits for a platform engineer. The repo is ready. The infrastructure isn't."
  },
  {
    title: "Drift you can't see",
    body: "What's in git stops matching what's in AWS. Six months in, nobody knows what's actually running."
  }
];

export const howItWorksSteps = [
  {
    n: "01",
    title: "Connect",
    body: "Install the GitHub App. Add an AWS role via CloudFormation.",
    code: `$ gh app install aws-ify
$ aws cloudformation create-stack \\
    --stack-name aws-ify-role`
  },
  {
    n: "02",
    title: "Scan",
    body: "AWS-ify reads your repo: runtime, framework, scripts, port, env vars, and dependencies.",
    code: `detected: next.js
runtime: node
env: required values found
db: marked as planned`
  },
  {
    n: "03",
    title: "Plan",
    body: "An AI plan is validated against a strict schema and rendered into Pulumi templates.",
    code: `plan generated
  ecr.repository
  ecs.service
  alb.listener
  cloudwatch.logGroup`
  },
  {
    n: "04",
    title: "Approve & ship",
    body: "Review the diff. One click. AWS-ify provisions the stack and returns the service URL.",
    code: `awaiting approval
approve plan
deploy to fargate
return live url`
  }
];

export const serviceCode = `import * as awsx from "@pulumi/awsx";
import * as aws from "@pulumi/aws";

export const cluster = new aws.ecs.Cluster("api-cluster");

export const service = new awsx.ecs.FargateService("api", {
  cluster: cluster.arn,
  desiredCount: 2,
  taskDefinitionArgs: {
    container: {
      image: image.imageUri,
      cpu: 512,
      memory: 1024,
      portMappings: [{ containerPort: 3000 }],
      environment: env,
    },
  },
});`;

export const workflowCode = `name: deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: read
    steps:
      - uses: actions/checkout@v4
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: \${{ secrets.AWS_DEPLOY_ROLE }}
      - run: aws-ify apply --plan plan-042`;

export const resourceListItems: ReadonlyArray<readonly [string, string]> = [
  ["ECR repository", "immutable image tags"],
  ["ECS cluster + service", "Fargate"],
  ["Application load balancer", "public HTTP"],
  ["IAM task role", "scoped to ECR + logs"],
  ["CloudWatch log group", "application logs"]
];

export const costLines = [
  { svc: "ECS Fargate", detail: "small always-on task", cost: 20 },
  { svc: "Application LB", detail: "public HTTP entrypoint", cost: 18 },
  { svc: "CloudWatch Logs", detail: "app log ingest", cost: 3 },
  { svc: "ECR storage", detail: "container images", cost: 1 }
];

export const costHighlights = [
  {
    kpi: "$20-80",
    label: "MVP range",
    body: "A conservative estimate for one small ECS Fargate service with ALB, ECR, and logs."
  },
  {
    kpi: "$0",
    label: "Until you approve",
    body: "No resources exist before you click approve. Plans are dry-run by default."
  },
  {
    kpi: "1",
    label: "Supported target",
    body: "The first production path is intentionally limited to ECS Fargate."
  }
];

export const securityBadges = [
  "GitHub App repo access",
  "Least-privilege IAM",
  "User-approved deploys",
  "Template-only infra"
];

export const faqs = [
  {
    q: "Does AWS-ify need admin access to my AWS account?",
    a: "No. You create a CloudFormation role scoped to the resources our templates manage. We don't get global IAM, billing, or org-level access."
  },
  {
    q: "What stacks are supported today?",
    a: "Node.js backends and Next.js apps that build to a Docker image, deployed to ECS Fargate behind an ALB. PostgreSQL detection is shown in the plan, but RDS provisioning is not part of the first MVP path."
  },
  {
    q: "Can I edit the generated infrastructure code?",
    a: "The MVP shows generated Dockerfile, GitHub Actions, and Pulumi plan artifacts for review. Committing generated infra back to the repo comes after the first deployment path is stable."
  },
  {
    q: "How is this different from Terraform / Pulumi / SST?",
    a: "Those are toolkits. AWS-ify is the layer above them: it infers your stack, generates the code, validates against a strict schema, and gates execution behind approval. Pulumi is what runs underneath."
  },
  {
    q: "Where does the AI fit in?",
    a: "Claude proposes a structured plan. We validate it against a schema and reject anything outside the audited template set. The LLM never writes raw AWS calls."
  },
  {
    q: "What happens if a deploy fails halfway?",
    a: "The worker records deployment events and marks the deployment failed with the reason. Full rollback automation is planned after the first ECS Fargate path is proven."
  }
];

export const footerColumns = [
  {
    title: "Product",
    links: [
      ["How it works", "#how"],
      ["Examples", "#examples"],
      ["Security", "#security"],
      ["FAQ", "#faq"]
    ] as ReadonlyArray<readonly [string, string]>
  },
  {
    title: "App",
    links: [
      ["Dashboard", "/dashboard"],
      ["Onboarding", "/onboarding"],
      ["Connections", "/connections"],
      ["Deployments", "/deployments"]
    ] as ReadonlyArray<readonly [string, string]>
  },
  {
    title: "Company",
    links: [
      ["Changelog", "#"],
      ["Status", "#"],
      ["Privacy", "#"],
      ["Terms", "#"]
    ] as ReadonlyArray<readonly [string, string]>
  }
];
