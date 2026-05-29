import { Injectable } from "@nestjs/common";
import { STSClient, AssumeRoleCommand } from "@aws-sdk/client-sts";
import { generateCloudFormationRoleTemplate } from "@awsify/templates";

@Injectable()
export class AwsService {
  createConnectionTemplate() {
    const externalId = `awsify-${crypto.randomUUID()}`;
    const awsifyAccountId = process.env.AWSIFY_AWS_ACCOUNT_ID ?? "123456789012";

    return {
      externalId,
      template: generateCloudFormationRoleTemplate({ awsifyAccountId, externalId }),
      note: "Deploy this CloudFormation template in the target AWS account, then submit the output RoleArn."
    };
  }

  async validateConnection(input: { roleArn: string; externalId: string; region?: string }) {
    const client = new STSClient({ region: input.region ?? "us-east-1" });
    try {
      const response = await client.send(
        new AssumeRoleCommand({
          RoleArn: input.roleArn,
          RoleSessionName: "awsify-validation",
          ExternalId: input.externalId,
          DurationSeconds: 900
        })
      );

      return {
        status: "valid",
        accessKeyIdPreview: response.Credentials?.AccessKeyId?.slice(0, 6)
      };
    } catch (error) {
      return {
        status: "invalid",
        reason: error instanceof Error ? error.message : "Unknown STS validation error"
      };
    }
  }
}
