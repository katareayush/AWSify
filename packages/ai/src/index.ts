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
  /** Reserved for future review-only artifact generation. Never executed directly by the worker. */
  dockerfile?: string;
}

export interface AiProvider {
  recommendDeployment(input: AiRecommendationInput): Promise<AiRecommendationResult>;
}

const SYSTEM_PROMPT = `You are a deployment advisor for AWS-ify. Analyse the provided repository files and return a deployment recommendation.

## Response format

Return a single JSON object. No markdown fences, no prose.

## JSON schema rules
- Supported appType: "node-backend" | "nextjs-app"
- Supported computeTarget: "ecs-fargate"
- Supported packageManager: "npm" | "pnpm" | "yarn" | "bun"
- Supported services items: "frontend" | "backend" | "database" | "worker" | "cache"
- database.required=true only when a DB dependency is detected (pg, prisma, etc.). AWS-ify marks this as planned in the MVP.
- database.engine: "postgresql" | "mysql" | "mongodb"
- cache.required=true when a Redis / cache dependency is present
- envVars: only variables found via process.env.VAR or .env.example
- confidence: 0.9+ unambiguous, 0.6 reasonable assumptions, 0.4 unclear
- port must be a real HTTP port exposed by the container`;

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
            fileSection || "(no key files found - infer from scan signals only)",
            "",
            "Return only the JSON suggestion. Do not return a Dockerfile.",
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
  let jsonPart = raw.trim();

  // Strip any accidental markdown fences around the JSON
  jsonPart = jsonPart.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();

  const suggestion = deploymentSuggestionSchema.parse(JSON.parse(jsonPart));
  return { suggestion };
}

export function createAiProvider(options: { anthropicApiKey?: string; model?: string }): AiProvider {
  if (!options.anthropicApiKey) {
    throw new Error("ANTHROPIC_API_KEY is required. AWS-ify does not run repo analysis without a valid Claude API key.");
  }
  return new ClaudeAiProvider({ apiKey: options.anthropicApiKey, model: options.model });
}
