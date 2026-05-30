import { Injectable } from "@nestjs/common";
import { STSClient, AssumeRoleCommand } from "@aws-sdk/client-sts";
import { PrismaService } from "../prisma.service";
import { generateCloudFormationRoleTemplate } from "@awsify/templates";

@Injectable()
export class AwsService {
  constructor(private readonly prisma: PrismaService) {}

  createConnectionTemplate() {
    const externalId = `awsify-${crypto.randomUUID()}`;
    const awsifyAccountId = process.env.AWSIFY_AWS_ACCOUNT_ID;

    if (!awsifyAccountId) {
      return { externalId, template: null, status: "missing_awsify_account_id" };
    }

    return {
      externalId,
      template: generateCloudFormationRoleTemplate({ awsifyAccountId, externalId }),
      note: "Deploy this CloudFormation template in the target AWS account, then submit the output RoleArn."
    };
  }

  async validateConnection(input: { roleArn: string; externalId: string; region?: string }) {
    if (!input.region) return { status: "missing_region" };

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
      return { status: "valid", accessKeyIdPreview: response.Credentials?.AccessKeyId?.slice(0, 6) };
    } catch (error) {
      return { status: "invalid", reason: error instanceof Error ? error.message : "Unknown STS error" };
    }
  }

  async saveConnection(userId: string, input: { roleArn: string; externalId: string; accountId: string; region: string }) {
    const connection = await this.prisma.awsConnection.upsert({
      where: { id: input.externalId },
      create: {
        id: input.externalId,
        accountId: input.accountId,
        roleArn: input.roleArn,
        externalId: input.externalId,
        defaultRegion: input.region,
        status: "valid",
        userId
      },
      update: { roleArn: input.roleArn, defaultRegion: input.region, status: "valid" }
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
