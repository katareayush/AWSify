import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import type { DeploymentPlan } from "@awsify/deployment-schemas";

export interface LambdaInput {
  plan: DeploymentPlan;
  imageUri: pulumi.Input<string>;
  environment: Record<string, pulumi.Input<string>>;
  memorySize?: number;
  timeoutSeconds?: number;
}

export interface LambdaOutputs {
  liveUrl: pulumi.Output<string>;
  repositoryUrl: pulumi.Output<string>;
  logGroupName: pulumi.Output<string>;
}

export function createLambdaStack(input: LambdaInput): LambdaOutputs {
  const appName = input.plan.appName;

  const repository = new aws.ecr.Repository(`${appName}-repo`, {
    name: appName,
    forceDelete: true,
    imageScanningConfiguration: { scanOnPush: true }
  });

  const logGroup = new aws.cloudwatch.LogGroup(`${appName}-logs`, {
    name: `/aws/lambda/${appName}`,
    retentionInDays: 14
  });

  const executionRole = new aws.iam.Role(`${appName}-lambda-role`, {
    assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({ Service: "lambda.amazonaws.com" })
  });
  new aws.iam.RolePolicyAttachment(`${appName}-lambda-basic`, {
    role: executionRole.name,
    policyArn: "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
  });

  const lambdaFn = new aws.lambda.Function(`${appName}-fn`, {
    name: appName,
    packageType: "Image",
    imageUri: input.imageUri,
    role: executionRole.arn,
    timeout: input.timeoutSeconds ?? 30,
    memorySize: input.memorySize ?? 512,
    environment: {
      variables: input.environment as Record<string, string>
    }
  });

  // API Gateway HTTP API (v2) — cheaper and faster than REST API
  const api = new aws.apigatewayv2.Api(`${appName}-api`, {
    name: appName,
    protocolType: "HTTP",
    corsConfiguration: {
      allowOrigins: ["*"],
      allowMethods: ["*"],
      allowHeaders: ["*"]
    }
  });

  const integration = new aws.apigatewayv2.Integration(`${appName}-integration`, {
    apiId: api.id,
    integrationType: "AWS_PROXY",
    integrationUri: lambdaFn.arn,
    payloadFormatVersion: "2.0"
  });

  new aws.apigatewayv2.Route(`${appName}-route`, {
    apiId: api.id,
    routeKey: "$default",
    target: pulumi.interpolate`integrations/${integration.id}`
  });

  const stage = new aws.apigatewayv2.Stage(`${appName}-stage`, {
    apiId: api.id,
    name: "$default",
    autoDeploy: true
  });

  new aws.lambda.Permission(`${appName}-apigw-permission`, {
    action: "lambda:InvokeFunction",
    function: lambdaFn.arn,
    principal: "apigateway.amazonaws.com",
    sourceArn: pulumi.interpolate`${api.executionArn}/*/*`
  });

  return {
    liveUrl: stage.invokeUrl,
    repositoryUrl: repository.repositoryUrl,
    logGroupName: logGroup.name
  };
}
