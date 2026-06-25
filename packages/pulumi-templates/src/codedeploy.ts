import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

export interface BlueGreenControllerInput {
  appName: string;
  clusterName: pulumi.Input<string>;
  serviceName: pulumi.Input<string>;
  /** ARN of the production (port 80) ALB listener that fronts the blue target group. */
  prodListenerArn: pulumi.Input<string>;
  blueTargetGroupName: pulumi.Input<string>;
  greenTargetGroupName: pulumi.Input<string>;
  /** Minutes to keep the old (blue) task set running after a successful shift before terminating it. */
  terminationWaitMinutes?: number;
}

export interface BlueGreenController {
  applicationName: pulumi.Output<string>;
  deploymentGroupName: pulumi.Output<string>;
  serviceRoleArn: pulumi.Output<string>;
}

/**
 * Wires the CodeDeploy application + deployment group that performs the ECS
 * blue-green rollout: a new (green) task set is spun up, health-checked, then
 * traffic is cut over on the production listener. Rolls back automatically if
 * the new task set fails to become healthy.
 *
 * The actual traffic shift is triggered by the worker via CreateDeployment;
 * this only provisions the standing infrastructure.
 */
export function createBlueGreenController(input: BlueGreenControllerInput): BlueGreenController {
  const role = new aws.iam.Role(`${input.appName}-codedeploy-role`, {
    name: `awsify-${input.appName}-codedeploy-role`,
    assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({ Service: "codedeploy.amazonaws.com" })
  });

  new aws.iam.RolePolicyAttachment(`${input.appName}-codedeploy-policy`, {
    role: role.name,
    policyArn: "arn:aws:iam::aws:policy/AWSCodeDeployRoleForECS"
  });

  const application = new aws.codedeploy.Application(`${input.appName}-cd-app`, {
    name: `awsify-${input.appName}`,
    computePlatform: "ECS"
  });

  const deploymentGroup = new aws.codedeploy.DeploymentGroup(`${input.appName}-cd-group`, {
    appName: application.name,
    deploymentGroupName: `awsify-${input.appName}-dg`,
    serviceRoleArn: role.arn,
    deploymentConfigName: "CodeDeployDefault.ECSAllAtOnce",
    deploymentStyle: {
      deploymentType: "BLUE_GREEN",
      deploymentOption: "WITH_TRAFFIC_CONTROL"
    },
    autoRollbackConfiguration: {
      enabled: true,
      events: ["DEPLOYMENT_FAILURE"]
    },
    blueGreenDeploymentConfig: {
      deploymentReadyOption: { actionOnTimeout: "CONTINUE_DEPLOYMENT" },
      terminateBlueInstancesOnDeploymentSuccess: {
        action: "TERMINATE",
        terminationWaitTimeInMinutes: input.terminationWaitMinutes ?? 5
      }
    },
    ecsService: {
      clusterName: input.clusterName,
      serviceName: input.serviceName
    },
    loadBalancerInfo: {
      targetGroupPairInfo: {
        prodTrafficRoute: { listenerArns: [input.prodListenerArn] },
        targetGroups: [
          { name: input.blueTargetGroupName },
          { name: input.greenTargetGroupName }
        ]
      }
    }
  });

  return {
    applicationName: application.name,
    deploymentGroupName: deploymentGroup.deploymentGroupName,
    serviceRoleArn: role.arn
  };
}
