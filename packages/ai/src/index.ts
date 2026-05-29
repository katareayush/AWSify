import Anthropic from "@anthropic-ai/sdk";
import { deploymentSuggestionSchema, type DeploymentSuggestion } from "@awsify/deployment-schemas";
import type { RepoScanResult } from "@awsify/repo-scanner";

export interface AiRecommendationInput {
  repoFullName: string;
  scan: RepoScanResult;
  fileSummaries: Array<{ path: string; summary: string }>;
}

export interface AiProvider {
  recommendDeployment(input: AiRecommendationInput): Promise<DeploymentSuggestion>;
}

export class ClaudeAiProvider implements AiProvider {
  private readonly client: Anthropic;
  private readonly model: string;

  constructor(options: { apiKey: string; model?: string }) {
    this.client = new Anthropic({ apiKey: options.apiKey });
    this.model = options.model ?? "claude-sonnet-4-6";
  }

  async recommendDeployment(input: AiRecommendationInput): Promise<DeploymentSuggestion> {
    const message = await this.client.messages.create({
      model: this.model,
      max_tokens: 1400,
      temperature: 0,
      system:
        "You recommend AWSify MVP deployment settings only. Return JSON only. Do not invent AWS resources. Supported appType: node-backend,nextjs-app. Supported services: frontend,backend,database,worker. Database may only be postgresql and should be marked planned if needed.",
      messages: [
        {
          role: "user",
          content: JSON.stringify({
            repoFullName: input.repoFullName,
            scan: input.scan,
            fileSummaries: input.fileSummaries,
            requiredShape: {
              appType: "node-backend | nextjs-app",
              services: ["frontend | backend | database | worker"],
              packageManager: "npm | pnpm | yarn | bun | unknown",
              buildCommand: "string",
              startCommand: "string",
              installCommand: "string",
              port: "number",
              hasDockerfile: "boolean",
              envVars: [{ name: "UPPER_CASE", required: true, description: "optional" }],
              database: { required: false, engine: "postgresql", note: "optional" },
              confidence: "0..1",
              notes: ["short strings"]
            }
          })
        }
      ]
    });

    const text = message.content
      .map((block) => (block.type === "text" ? block.text : ""))
      .join("")
      .trim();

    return deploymentSuggestionSchema.parse(JSON.parse(text));
  }
}

export function createAiProvider(options: { anthropicApiKey?: string }): AiProvider {
  if (!options.anthropicApiKey) {
    throw new Error("ANTHROPIC_API_KEY is required. AWSify does not run repo-analysis AI with a fallback provider.");
  }

  return new ClaudeAiProvider({ apiKey: options.anthropicApiKey });
}
