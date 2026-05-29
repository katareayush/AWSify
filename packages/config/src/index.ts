import { z } from "zod";

export const appEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z.string().url().default("http://localhost:3000"),
  API_URL: z.string().url().default("http://localhost:4000"),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().url().default("redis://localhost:6379"),
  SESSION_SECRET: z.string().min(16),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  GITHUB_APP_ID: z.string().optional(),
  GITHUB_APP_SLUG: z.string().optional(),
  GITHUB_APP_PRIVATE_KEY_BASE64: z.string().optional(),
  GITHUB_WEBHOOK_SECRET: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().min(1),
  AWSIFY_EXTERNAL_ID_SALT: z.string().min(8).default("local-dev-salt"),
  PULUMI_CONFIG_PASSPHRASE: z.string().min(1).default("local-dev-passphrase")
});

export type AppEnv = z.infer<typeof appEnvSchema>;

export function loadEnv(env: NodeJS.ProcessEnv = process.env): AppEnv {
  return appEnvSchema.parse(env);
}

export function optionalEnv(env: NodeJS.ProcessEnv = process.env): Partial<AppEnv> {
  return appEnvSchema.partial().parse(env);
}
