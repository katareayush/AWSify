import { Injectable } from "@nestjs/common";
import { STSClient, AssumeRoleCommand } from "@aws-sdk/client-sts";
import { generateCloudFormationRoleTemplate } from "@awsify/templates";

@Injectable()
export class AwsService {
  createConnectionTemplate() {
    const externalId = `awsify-${crypto.randomUUID()}`;
    const awsifyAccountId = process.env.AWSIFY_AWS_ACCOUNT_ID;

    if (!awsifyAccountId) {
      return {
        externalId,
        template: null,
        status: "missing_awsify_account_id",
        note: "Set AWSIFY_AWS_ACCOUNT_ID before generating a customer CloudFormation role template."
      };
    }

    return {
      externalId,
      template: generateCloudFormationRoleTemplate({ awsifyAccountId, externalId }),
      note: "Deploy this CloudFormation template in the target AWS account, then submit the output RoleArn."
    };
  }

  async validateConnection(input: { roleArn: string; externalId: string; region?: string }) {
    if (!input.region) {
      return {
        status: "missing_region",
        reason: "Provide an AWS region before validating the role."
      };
    }

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
