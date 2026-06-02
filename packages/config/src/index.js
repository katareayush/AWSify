"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.appEnvSchema = void 0;
exports.loadEnv = loadEnv;
exports.optionalEnv = optionalEnv;
exports.encryptSecret = encryptSecret;
exports.decryptSecret = decryptSecret;
exports.previewSecret = previewSecret;
const node_crypto_1 = require("node:crypto");
const zod_1 = require("zod");
exports.appEnvSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(["development", "test", "production"]).default("development"),
    APP_URL: zod_1.z.string().url(),
    API_URL: zod_1.z.string().url(),
    DATABASE_URL: zod_1.z.string().min(1),
    REDIS_URL: zod_1.z.string().url(),
    SESSION_SECRET: zod_1.z.string().min(16),
    GITHUB_CLIENT_ID: zod_1.z.string().min(1),
    GITHUB_CLIENT_SECRET: zod_1.z.string().min(1),
    GITHUB_APP_ID: zod_1.z.string().min(1),
    GITHUB_APP_SLUG: zod_1.z.string().min(1),
    GITHUB_APP_PRIVATE_KEY_BASE64: zod_1.z.string().min(1),
    GITHUB_WEBHOOK_SECRET: zod_1.z.string().optional(),
    ANTHROPIC_API_KEY: zod_1.z.string().min(1),
    ENV_ENCRYPTION_KEY: zod_1.z.string().min(16),
    AWSIFY_AWS_ACCOUNT_ID: zod_1.z.string().regex(/^\d{12}$/),
    AWS_REGION: zod_1.z.string().min(3),
    AWSIFY_EXTERNAL_ID_SALT: zod_1.z.string().min(8),
    PULUMI_CONFIG_PASSPHRASE: zod_1.z.string().min(1)
});
function loadEnv(env = process.env) {
    return exports.appEnvSchema.parse(env);
}
function optionalEnv(env = process.env) {
    return exports.appEnvSchema.partial().parse(env);
}
function encryptSecret(plaintext, keyMaterial = process.env.ENV_ENCRYPTION_KEY) {
    const key = deriveEncryptionKey(keyMaterial);
    const iv = (0, node_crypto_1.randomBytes)(12);
    const cipher = (0, node_crypto_1.createCipheriv)("aes-256-gcm", key, iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return ["v1", iv.toString("base64url"), tag.toString("base64url"), ciphertext.toString("base64url")].join(".");
}
function decryptSecret(encrypted, keyMaterial = process.env.ENV_ENCRYPTION_KEY) {
    const [version, ivRaw, tagRaw, ciphertextRaw] = encrypted.split(".");
    if (version !== "v1" || !ivRaw || !tagRaw || !ciphertextRaw) {
        throw new Error("Unsupported encrypted secret format.");
    }
    const key = deriveEncryptionKey(keyMaterial);
    const decipher = (0, node_crypto_1.createDecipheriv)("aes-256-gcm", key, Buffer.from(ivRaw, "base64url"));
    decipher.setAuthTag(Buffer.from(tagRaw, "base64url"));
    return Buffer.concat([
        decipher.update(Buffer.from(ciphertextRaw, "base64url")),
        decipher.final()
    ]).toString("utf8");
}
function previewSecret(value) {
    if (value.length <= 4)
        return "*".repeat(value.length);
    return `${"*".repeat(Math.max(4, value.length - 4))}${value.slice(-4)}`;
}
function deriveEncryptionKey(keyMaterial) {
    if (!keyMaterial || keyMaterial.length < 16) {
        throw new Error("ENV_ENCRYPTION_KEY must be configured and at least 16 characters long.");
    }
    return (0, node_crypto_1.createHash)("sha256").update(keyMaterial).digest();
}
