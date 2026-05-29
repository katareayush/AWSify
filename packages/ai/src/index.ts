import Anthropic from "@anthropic-ai/sdk";
import { deploymentSuggestionSchema, type DeploymentSuggestion } from "@awsify/deployment-schemas";
import type { RepoScanResult, KeyFile } from "@awsify/repo-scanner";

export interface AiRecommendationInput {
  repoFullName: string;
  scan: RepoScanResult;
  keyFiles: KeyFile[];
}

export interface AiProvider {
  recommendDeployment(input: AiRecommendationInput): Promise<DeploymentSuggestion>;
}

// Cached at the SDK level — static across calls to the same provider instance.
const SYSTEM_PROMPT = `You are a deployment advisor for AWS-ify. Analyse the provided repository files and return a structured JSON deployment recommendation.

Rules:
- Return ONLY valid JSON — no markdown fences, no explanations, nothing else.
- Supported appType: "node-backend" | "nextjs-app"
- Supported services items: "frontend" | "backend" | "database" | "worker"
- Supported packageManager: "npm" | "pnpm" | "yarn" | "bun" | "unknown"
- Set database.required=true only when DATABASE_URL or a DB dependency (pg, prisma, @prisma/client, mysql2, mongodb) is present.
- envVars must only contain variables found via process.env.VARNAME patterns or listed in .env.example.
- confidence: 0..1 — 0.9+ when the stack is unambiguous, 0.6 when reasonable assumptions were needed, 0.4 when unclear.
- buildCommand, startCommand, installCommand must be real shell commands.`;

export class ClaudeAiProvider implements AiProvider {
  private readonly client: Anthropic;
  private readonly model: string;

  constructor(options: { apiKey: string; model?: string }) {
    this.client = new Anthropic({ apiKey: options.apiKey });
    // Haiku 4.5 — fastest model in the Claude 4.x family, accurate enough for code indexing.
    this.model = options.model ?? "claude-haiku-4-5-20251001";
  }

  async recommendDeployment(input: AiRecommendationInput): Promise<DeploymentSuggestion> {
    const fileSection = input.keyFiles
      .map((f) => `=== ${f.path} ===\n${f.content}`)
      .join("\n\n");

    const message = await this.client.messages.create({
      model: this.model,
      max_tokens: 1024,
      temperature: 0,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            `Repository: ${input.repoFullName}`,
            `Static scan signals: ${input.scan.signals.join(", ") || "none detected"}`,
            "",
            "Key repository files:",
            fileSection || "(no key files found — infer from scan signals only)",
            "",
            'Return JSON matching this shape exactly:',
            '{"appType":"...","services":[...],"packageManager":"...","buildCommand":"...","startCommand":"...","installCommand":"...","port":3000,"hasDockerfile":false,"envVars":[{"name":"VAR_NAME","required":true}],"database":{"required":false},"confidence":0.9,"notes":[]}'
          ].join("\n")
        }
      ]
    });

    const raw = message.content
      .map((block) => (block.type === "text" ? block.text : ""))
      .join("")
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();

    return deploymentSuggestionSchema.parse(JSON.parse(raw));
  }
}

export function createAiProvider(options: { anthropicApiKey?: string; model?: string }): AiProvider {
  if (!options.anthropicApiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is required. AWS-ify does not run repo analysis without a valid Claude API key."
    );
  }
  return new ClaudeAiProvider({ apiKey: options.anthropicApiKey, model: options.model });
}
