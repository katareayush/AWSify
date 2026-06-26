import { Injectable } from "@nestjs/common";
import { createHmac, timingSafeEqual } from "node:crypto";
import { STSClient, AssumeRoleCommand, GetCallerIdentityCommand } from "@aws-sdk/client-sts";
import { PrismaService } from "../prisma.service";
import { generateCloudFormationRoleTemplate } from "@awsify/templates";

@Injectable()
export class AwsService {
  constructor(private readonly prisma: PrismaService) {}

  createConnectionTemplate(userId: string) {
    const externalId = createExternalId(userId);
    const awsifyAccountId = process.env.AWSIFY_AWS_ACCOUNT_ID;

    if (!awsifyAccountId) {
      return { externalId, template: null, launchStackUrl: null, status: "missing_awsify_account_id" };
    }

    return {
      externalId,
      template: generateCloudFormationRoleTemplate({ awsifyAccountId, externalId }),
      launchStackUrl: buildLaunchStackUrl(externalId),
      note: "Click Launch Stack to open AWS Console with the role template pre-filled, then paste the output RoleArn."
    };
  }

  getPublicTemplate(): string | null {
    const awsifyAccountId = process.env.AWSIFY_AWS_ACCOUNT_ID;
    if (!awsifyAccountId) return null;
    return generateCloudFormationRoleTemplate({ awsifyAccountId });
  }

  async validateConnection(userId: string, input: { roleArn: string; externalId: string; region?: string }) {
    if (!input.region) return { status: "missing_region" };
    if (!verifyExternalId(userId, input.externalId)) return { status: "invalid_external_id" };

    const client = new STSClient({ region: input.region });
    try {
      const response = await client.send(
        new AssumeRoleCommand({
          RoleArn: input.roleArn,
          RoleSessionName: "awsify-validation",
          ExternalId: input.externalId,
          DurationSeconds: 900
        })
      );
      if (!response.Credentials) return { status: "invalid", reason: "STS AssumeRole returned no credentials." };
      const assumed = new STSClient({
        region: input.region,
        credentials: {
          accessKeyId: response.Credentials.AccessKeyId!,
          secretAccessKey: response.Credentials.SecretAccessKey!,
          sessionToken: response.Credentials.SessionToken!
        }
      });
      const identity = await assumed.send(new GetCallerIdentityCommand({}));
      return {
        status: "valid",
        accountId: identity.Account,
        arn: identity.Arn,
        accessKeyIdPreview: response.Credentials.AccessKeyId?.slice(0, 6)
      };
    } catch (error) {
      return { status: "invalid", reason: error instanceof Error ? error.message : "Unknown STS error" };
    }
  }

  async saveConnection(userId: string, input: { roleArn: string; externalId: string; region?: string }) {
    if (!verifyExternalId(userId, input.externalId)) return { error: "invalid_external_id" };
    const region = input.region ?? "us-east-1";
    const validation = await this.validateConnection(userId, { ...input, region });
    if (validation.status !== "valid") return { error: "aws_validation_failed", validation };
    if (!validation.accountId) return { error: "missing_account_id_from_sts" };
    // De-duplicate by AWS account: re-connecting the same account updates it,
    // while a different account creates a new row. The connection id is an
    // internal cuid (decoupled from the external ID), so several accounts can
    // share one stable external ID.
    const existing = await this.prisma.awsConnection.findFirst({
      where: { userId, accountId: validation.accountId }
    });
    const data = {
      roleArn: input.roleArn,
      externalId: input.externalId,
      defaultRegion: region,
      status: "valid" as const
    };
    const connection = existing
      ? await this.prisma.awsConnection.update({ where: { id: existing.id }, data })
      : await this.prisma.awsConnection.create({
          data: { ...data, accountId: validation.accountId, userId }
        });
    return { connection };
  }

  async listConnections(userId: string) {
    const connections = await this.prisma.awsConnection.findMany({
      where: { userId },
      select: { id: true, accountId: true, defaultRegion: true, status: true, roleArn: true, createdAt: true }
    });
    return { connections };
  }

  async deleteConnection(userId: string, connectionId: string) {
    const connection = await this.prisma.awsConnection.findFirst({ where: { id: connectionId, userId } });
    if (!connection) return { error: "not_found" };
    // Projects referencing this connection have an optional FK, so deleting it
    // unsets project.awsConnectionId (they fall back to "AWS not connected").
    await this.prisma.awsConnection.delete({ where: { id: connectionId } });
    return { ok: true };
  }
}

function createExternalId(userId: string): string {
  // Deterministic per user so it never rotates between page loads — the External
  // ID baked into the role's trust policy always matches what AWS-ify sends when
  // assuming the role. Multiple AWS accounts can safely share it; connections are
  // de-duplicated by AWS account, not by external ID.
  const nonce = "default";
  const payload = `awsify:${userId}:${nonce}`;
  const signature = signExternalId(payload);
  return `${payload}:${signature}`;
}

function verifyExternalId(userId: string, externalId: string): boolean {
  const parts = externalId.split(":");
  if (parts.length !== 4) return false;
  const [prefix, externalUserId, nonce, signature] = parts;
  if (prefix !== "awsify" || externalUserId !== userId || !nonce || !signature) return false;
  const expected = signExternalId(`awsify:${externalUserId}:${nonce}`);
  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

function buildLaunchStackUrl(externalId: string): string | null {
  const templateUrl = process.env.AWSIFY_TEMPLATE_S3_URL;
  if (!templateUrl) return null;
  const region = process.env.AWS_REGION ?? "us-east-1";
  const params = new URLSearchParams({
    templateURL: templateUrl,
    stackName: "awsify-deployment-role",
    param_ExternalId: externalId
  });
  return `https://console.aws.amazon.com/cloudformation/home?region=${region}#/stacks/quickcreate?${params.toString()}`;
}

function signExternalId(payload: string): string {
  const salt = process.env.AWSIFY_EXTERNAL_ID_SALT;
  if (!salt || salt.length < 8) throw new Error("AWSIFY_EXTERNAL_ID_SALT must be configured.");
  return createHmac("sha256", salt).update(payload).digest("base64url");
}
