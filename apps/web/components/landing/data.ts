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
  "Docker",
  "OpenTelemetry"
];

export const pains = [
  {
    title: "Console clicking",
    body: "Hours lost to AWS forms — VPCs, IAM roles, target groups — each one a chance to misconfigure production."
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
    body: "Install the GitHub App. Add an AWS role via CloudFormation. Two minutes.",
    code: `$ gh app install awsify
$ aws cloudformation create-stack \\
    --stack-name awsify-role`
  },
  {
    n: "02",
    title: "Scan",
    body: "Awsify reads your repo: runtime, framework, env vars, dependencies, secrets.",
    code: `→ detected: next.js 15
→ runtime: node 20
→ env: 4 required, 0 secrets
→ db: postgres (prisma)`
  },
  {
    n: "03",
    title: "Plan",
    body: "An AI plan is validated against a strict schema and rendered into Pulumi templates.",
    code: `plan #042
  ecr.repository  ✓
  ecs.service     ✓
  alb.listener    ✓
  cw.logGroup     ✓`
  },
  {
    n: "04",
    title: "Approve & ship",
    body: "Review the diff. One click. Awsify provisions the stack and returns the service URL.",
    code: `→ applying...
✓ stack: api-gateway
✓ url: https://api-gw.app
✓ time: 4m 12s`
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
      - run: awsify apply --plan plan-042`;

export const resourceListItems: ReadonlyArray<readonly [string, string]> = [
  ["ECR repository", "immutable image tags"],
  ["ECS cluster + service", "Fargate, 2 desired"],
  ["Application load balancer", "TLS, HTTP/2"],
  ["IAM task role", "scoped to ECR + logs"],
  ["CloudWatch log group", "30-day retention"],
  ["Secrets Manager", "from env.example"],
  ["RDS subnet group", "isolated subnets"]
];

export const costLines = [
  { svc: "ECS Fargate", detail: "2× 0.5 vCPU · 1 GB · 720h", cost: 27.36 },
  { svc: "Application LB", detail: "1× ALB · 100 GB egress", cost: 18.4 },
  { svc: "CloudWatch Logs", detail: "5 GB ingest · 30d retention", cost: 2.75 },
  { svc: "ECR storage", detail: "10 GB images", cost: 1.0 },
  { svc: "RDS Postgres", detail: "db.t4g.micro · 20 GB", cost: 14.89 },
  { svc: "Secrets Manager", detail: "4 secrets", cost: 1.6 }
];

export const costHighlights = [
  {
    kpi: "±8%",
    label: "Estimate accuracy",
    body: "Backed by AWS pricing API with usage patterns from your plan."
  },
  {
    kpi: "$0",
    label: "Until you approve",
    body: "No resources exist before you click approve. Plans are dry-run by default."
  },
  {
    kpi: "3",
    label: "Right-size suggestions",
    body: "Awsify flags over-provisioned tasks and idle resources after 7 days."
  }
];

export const securityBadges = [
  "SOC2 Type II — in progress",
  "OIDC GitHub → AWS",
  "Least-privilege IAM",
  "Customer-managed KMS",
  "Audit log export"
];

export const faqs = [
  {
    q: "Does Awsify need admin access to my AWS account?",
    a: "No. You create a CloudFormation role scoped to the resources our templates manage. We don't get global IAM, billing, or org-level access."
  },
  {
    q: "What stacks are supported today?",
    a: "Node.js and Next.js services that build to a Docker image, deployed to ECS Fargate behind an ALB. RDS Postgres and S3 are first-class. More runtimes shipping monthly."
  },
  {
    q: "Can I edit the generated infrastructure code?",
    a: "Yes — the Pulumi files are committed to your repo. You own them. Awsify will diff your edits against the next plan and respect them."
  },
  {
    q: "How is this different from Terraform / Pulumi / SST?",
    a: "Those are toolkits. Awsify is the layer above them: it infers your stack, generates the code, validates against a strict schema, and gates execution behind approval. Pulumi is what runs underneath."
  },
  {
    q: "Where does the AI fit in?",
    a: "Claude proposes a structured plan. We validate it against a schema and reject anything outside the audited template set. The LLM never writes raw AWS calls."
  },
  {
    q: "What happens if a deploy fails halfway?",
    a: "Awsify wraps every apply in a transaction. Failed deploys roll back to the last known-good state, with a full event log in the dashboard."
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
