import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { z } from "zod";

export const appEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z.string().url(),
  API_URL: z.string().url(),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().url(),
  SESSION_SECRET: z.string().min(16),
  GITHUB_CLIENT_ID: z.string().min(1),
  GITHUB_CLIENT_SECRET: z.string().min(1),
  GITHUB_APP_ID: z.string().min(1),
  GITHUB_APP_SLUG: z.string().min(1),
  GITHUB_APP_PRIVATE_KEY_BASE64: z.string().min(1),
  GITHUB_WEBHOOK_SECRET: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().min(1),
  ENV_ENCRYPTION_KEY: z.string().min(16),
  AWSIFY_AWS_ACCOUNT_ID: z.string().regex(/^\d{12}$/),
  AWS_REGION: z.string().min(3),
  AWSIFY_EXTERNAL_ID_SALT: z.string().min(8),
  PULUMI_CONFIG_PASSPHRASE: z.string().min(1)
});

export type AppEnv = z.infer<typeof appEnvSchema>;

export function loadEnv(env: NodeJS.ProcessEnv = process.env): AppEnv {
  return appEnvSchema.parse(env);
}

export function optionalEnv(env: NodeJS.ProcessEnv = process.env): Partial<AppEnv> {
  return appEnvSchema.partial().parse(env);
}

export function encryptSecret(plaintext: string, keyMaterial = process.env.ENV_ENCRYPTION_KEY): string {
  const key = deriveEncryptionKey(keyMaterial);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", iv.toString("base64url"), tag.toString("base64url"), ciphertext.toString("base64url")].join(".");
}

export function decryptSecret(encrypted: string, keyMaterial = process.env.ENV_ENCRYPTION_KEY): string {
  const [version, ivRaw, tagRaw, ciphertextRaw] = encrypted.split(".");
  if (version !== "v1" || !ivRaw || !tagRaw || !ciphertextRaw) {
    throw new Error("Unsupported encrypted secret format.");
  }
  const key = deriveEncryptionKey(keyMaterial);
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivRaw, "base64url"));
  decipher.setAuthTag(Buffer.from(tagRaw, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextRaw, "base64url")),
    decipher.final()
  ]).toString("utf8");
}

export function previewSecret(value: string): string {
  if (value.length <= 4) return "*".repeat(value.length);
  return `${"*".repeat(Math.max(4, value.length - 4))}${value.slice(-4)}`;
}

function deriveEncryptionKey(keyMaterial: string | undefined): Buffer {
  if (!keyMaterial || keyMaterial.length < 16) {
    throw new Error("ENV_ENCRYPTION_KEY must be configured and at least 16 characters long.");
  }
  return createHash("sha256").update(keyMaterial).digest();
}
