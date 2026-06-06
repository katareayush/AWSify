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
- Supported appType: "node-backend" | "nextjs-app" | "static-spa" | "python-backend" | "go-backend" | "ruby-backend" | "java-backend" | "rust-backend" | "php-backend"
  - "node-backend": Express/Fastify/Koa/Hapi/Nest API or worker (Node.js package.json with a server entrypoint)
  - "nextjs-app": Next.js app (next dependency or next.config.*)
  - "static-spa": Vite, Astro (static output), CRA, or any bundle-only frontend with no server entry. Container will be nginx serving the bundle.
  - "python-backend": Flask, Django, FastAPI, or other Python service (requirements.txt / pyproject.toml / Pipfile)
  - "go-backend": Go service (go.mod). Multi-stage build into a distroless binary image.
  - "ruby-backend": Rails, Sinatra, or other Ruby service (Gemfile)
  - "java-backend": Spring Boot or other JVM service (pom.xml or build.gradle{,.kts}). Build with Maven/Gradle, run on Temurin JRE.
  - "rust-backend": Actix/axum/Rocket or other Rust service (Cargo.toml). Multi-stage cargo build.
  - "php-backend": Laravel/Symfony or vanilla PHP (composer.json)
- Supported computeTarget: "ecs-fargate"
- Supported packageManager: "npm" | "pnpm" | "yarn" | "bun" (for non-Node projects, use "npm" as a placeholder — it's not actually used)
- Supported services items: "frontend" | "backend" | "database" | "worker" | "cache"
- database.required=true only when a DB dependency is detected (pg, prisma, etc.). AWS-ify marks this as planned in the MVP.
- database.engine: "postgresql" | "mysql" | "mongodb"
- cache.required=true when a Redis / cache dependency is present
- confidence: 0.9+ unambiguous, 0.6 reasonable assumptions, 0.4 unclear
- port must be a real HTTP port exposed by the container
- healthPath should be an app health endpoint if detected, otherwise "/"

## Environment variables — you are the authority

The regex scan supplies a noisy hint list. Replace it with your own list. For each variable:

- name: SCREAMING_SNAKE_CASE matching /^[A-Z_][A-Z0-9_]*$/
- required: true ONLY when the app cannot start without it. Use this strict test:
  * referenced in source code without a fallback / guard AND
  * either listed in .env.example with NO default value, OR is a well-known mandatory framework value (Django SECRET_KEY, Rails SECRET_KEY_BASE, DATABASE_URL when a DB is used unguarded, Stripe / OAuth credentials clearly used at startup).
  Otherwise required: false. Bias toward false — false positives cost users time, false negatives just become warnings.
- description: one short sentence ("Postgres connection string for the primary DB.") — no fluff.
- example: a realistic placeholder if obvious from the name or .env.example default ("postgres://user:pass@host:5432/db", "sk_test_..."). Omit if not obvious.
- category: one of "secret" | "config" | "feature-flag" | "build-time" | "integration".
  * secret: API keys, tokens, passwords, signing keys
  * integration: connection strings or service endpoints (DATABASE_URL, REDIS_URL, S3_BUCKET, SMTP_HOST)
  * feature-flag: ENABLE_*, FEATURE_*, FF_*
  * build-time: only read at build time (NEXT_PUBLIC_*, VITE_*, REACT_APP_*)
  * config: everything else (PORT, LOG_LEVEL, allow-lists)

Skip framework-internal variables (NODE_ENV, PYTHONPATH, RAILS_ENV, GOPATH, npm_*, etc.) — those are set by the platform.

Skip variables that only appear in test files (anything under __tests__/, *.test.*, *.spec.*).

Output up to 30 variables. Prefer quality over quantity.`;

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
            "Regex env-var hints (refine, drop noise, classify):",
            input.scan.envVars.length > 0
              ? input.scan.envVars.map((envVar) => `  - ${envVar.name}${envVar.required ? " (regex-hint: maybe-required)" : ""}${envVar.description ? ` — ${envVar.description}` : ""}`).join("\n")
              : "  (none detected by regex — derive from source files)",
            "",
            "Return only the JSON suggestion. Do not return a Dockerfile.",
            "",
            'JSON shape: {"appType":"...","computeTarget":"...","services":[...],"packageManager":"...","buildCommand":"...","startCommand":"...","installCommand":"...","port":3000,"healthPath":"/health","hasDockerfile":false,"envVars":[{"name":"VAR","required":false,"description":"…","example":"…","category":"secret"}],"database":{"required":false},"cache":{"required":false},"confidence":0.9,"notes":[]}'
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
