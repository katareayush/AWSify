import Anthropic from "@anthropic-ai/sdk";
import { deploymentSuggestionSchema, type DeploymentSuggestion } from "@awsify/deployment-schemas";
import type { RepoScanResult, KeyFile } from "@awsify/repo-scanner";

export interface AiRecommendationInput {
  repoFullName: string;
  scan: RepoScanResult;
  keyFiles: KeyFile[];
}

export interface AiRecommendationResult {
  suggestion: DeploymentSuggestion;
  /**
   * Only present when the AI detects the project can't use the standard static
   * Dockerfile template — e.g. monorepos, native C deps, non-standard entry
   * points, multi-stage custom builds. For straightforward apps this is omitted
   * and the static template is used instead (cheaper, faster).
   */
  dockerfile?: string;
}

export interface AiProvider {
  recommendDeployment(input: AiRecommendationInput): Promise<AiRecommendationResult>;
}

const SYSTEM_PROMPT = `You are a deployment advisor for AWS-ify. Analyse the provided repository files and return a deployment recommendation.

## Response format

Your response MUST be two sections separated by the exact delimiter "---DOCKERFILE---":

SECTION 1 — JSON deployment suggestion (required):
Return a single JSON object. No markdown fences, no prose.

SECTION 2 — Dockerfile (conditional):
Include a complete, production-ready Dockerfile ONLY when the project requires a non-standard container build. Omit this section (and the delimiter) for standard single-package apps where the default template will work.

Reasons to include a custom Dockerfile:
- Monorepo: the service lives in a sub-directory and needs workspace packages copied in
- Native / system dependencies: libpq, libvips, ffmpeg, libc extensions, etc.
- Non-standard entry point: entry is not index.ts / main.ts / app.py / main.go at root or src/
- Multi-stage build requirements beyond the standard pattern
- Python app using conda or a non-pip lockfile

For static-site / s3-cloudfront targets: never include a Dockerfile section.

## JSON schema rules
- Supported appType: "node-backend" | "nextjs-app" | "python-backend" | "go-backend" | "static-site" | "dockerfile-app"
- Supported computeTarget:
  - "ecs-fargate"    → default for most web apps and APIs; serverless containers
  - "ecs-ec2"        → ECS on EC2; use when workload needs >8 GB memory or GPU
  - "ec2-instance"   → raw EC2; use when OS-level config or persistent disk is needed
  - "lambda"         → stateless APIs with sporadic traffic and low memory (<1.5 GB)
  - "s3-cloudfront"  → ONLY for static sites (no server-side runtime)
- Supported packageManager: "npm" | "pnpm" | "yarn" | "bun" | "pip" | "poetry" | "uv" | "go-modules" | "unknown"
- Supported services items: "frontend" | "backend" | "database" | "worker" | "cache"
- database.required=true only when a DB dependency is detected (pg, prisma, sqlalchemy, gorm, etc.)
- database.engine: "postgresql" | "mysql" | "mongodb"
- cache.required=true when a Redis / cache dependency is present
- envVars: only variables found via process.env.VAR, os.environ.get("VAR"), os.Getenv("VAR"), or .env.example
- confidence: 0.9+ unambiguous, 0.6 reasonable assumptions, 0.4 unclear
- port: use 0 for static-site targets; startCommand: use "" for static-site targets`;

export class ClaudeAiProvider implements AiProvider {
  private readonly client: Anthropic;
  private readonly model: string;

  constructor(options: { apiKey: string; model?: string }) {
    this.client = new Anthropic({ apiKey: options.apiKey });
    this.model = options.model ?? "claude-haiku-4-5-20251001";
  }

  async recommendDeployment(input: AiRecommendationInput): Promise<AiRecommendationResult> {
    const fileSection = input.keyFiles
      .map(f => `=== ${f.path} ===\n${f.content}`)
      .join("\n\n");

    const message = await this.client.messages.create({
      model: this.model,
      max_tokens: 2048,
      temperature: 0,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            `Repository: ${input.repoFullName}`,
            `Static scan signals: ${input.scan.signals.join(", ") || "none detected"}`,
            `Detected app type: ${input.scan.appType}`,
            `Suggested compute target: ${input.scan.computeTarget}`,
            `Has Dockerfile: ${input.scan.hasDockerfile}`,
            "",
            "Key repository files:",
            fileSection || "(no key files found — infer from scan signals only)",
            "",
            "Return the JSON suggestion first. Then, only if the project needs a custom Dockerfile, add the ---DOCKERFILE--- delimiter followed by the complete Dockerfile.",
            "",
            'JSON shape: {"appType":"...","computeTarget":"...","services":[...],"packageManager":"...","buildCommand":"...","startCommand":"...","installCommand":"...","port":3000,"hasDockerfile":false,"envVars":[{"name":"VAR","required":true}],"database":{"required":false},"cache":{"required":false},"confidence":0.9,"notes":[]}'
          ].join("\n")
        }
      ]
    });

    const raw = message.content
      .map(block => (block.type === "text" ? block.text : ""))
      .join("")
      .trim();

    return parseAiResponse(raw);
  }
}

function parseAiResponse(raw: string): AiRecommendationResult {
  const DELIMITER = "---DOCKERFILE---";
  const delimiterIndex = raw.indexOf(DELIMITER);

  let jsonPart: string;
  let dockerfilePart: string | undefined;

  if (delimiterIndex !== -1) {
    jsonPart = raw.slice(0, delimiterIndex).trim();
    const afterDelimiter = raw.slice(delimiterIndex + DELIMITER.length).trim();
    if (afterDelimiter.length > 0) dockerfilePart = afterDelimiter;
  } else {
    jsonPart = raw;
  }

  // Strip any accidental markdown fences around the JSON
  jsonPart = jsonPart.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();

  const suggestion = deploymentSuggestionSchema.parse(JSON.parse(jsonPart));
  return { suggestion, dockerfile: dockerfilePart };
}

export function createAiProvider(options: { anthropicApiKey?: string; model?: string }): AiProvider {
  if (!options.anthropicApiKey) {
    throw new Error("ANTHROPIC_API_KEY is required. AWS-ify does not run repo analysis without a valid Claude API key.");
  }
  return new ClaudeAiProvider({ apiKey: options.anthropicApiKey, model: options.model });
}
