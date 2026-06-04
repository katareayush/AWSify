import { Injectable } from "@nestjs/common";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
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
    const connection = await this.prisma.awsConnection.upsert({
      where: { id: input.externalId },
      create: {
        id: input.externalId,
        accountId: validation.accountId,
        roleArn: input.roleArn,
        externalId: input.externalId,
        defaultRegion: region,
        status: "valid",
        userId
      },
      update: { roleArn: input.roleArn, defaultRegion: region, status: "valid" }
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
}

function createExternalId(userId: string): string {
  const nonce = randomUUID();
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
  const apiUrl = process.env.API_URL;
  if (!apiUrl) return null;
  const templateUrl = `${apiUrl.replace(/\/$/, "")}/v1/aws/cloudformation-template/public`;
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
