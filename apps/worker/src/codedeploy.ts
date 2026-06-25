import { CodeDeployClient, CreateDeploymentCommand, GetDeploymentCommand } from "@aws-sdk/client-codedeploy";
import { ECSClient, DescribeServicesCommand } from "@aws-sdk/client-ecs";

interface AwsCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken: string;
}

export interface BlueGreenShiftInput {
  region: string;
  credentials: AwsCredentials;
  clusterName: string;
  serviceName: string;
  applicationName: string;
  deploymentGroupName: string;
  taskDefinitionArn: string;
  containerName: string;
  containerPort: number;
}

type Emit = (message: string) => Promise<void>;

const TERMINAL_FAILURE = new Set(["Failed", "Stopped"]);
const POLL_INTERVAL_MS = 15_000;
const MAX_POLLS = 80; // ~20 minutes

interface TaskSetLike {
  status?: string;
  taskDefinition?: string;
}
interface ServiceLike {
  taskDefinition?: string;
  taskSets?: TaskSetLike[];
}

/**
 * The revision a CODE_DEPLOY service is actually serving lives on its PRIMARY
 * task set. We deliberately do NOT fall back to `service.taskDefinition`: that
 * field is set at service creation regardless of whether tasks are running, so
 * trusting it could make us skip the deploy and leave the ALB with no healthy
 * targets. When no PRIMARY task set is confirmed we return undefined, and the
 * caller deploys (a redundant same-revision shift is harmless; a wrong skip is not).
 */
export function selectLiveTaskDefinition(service: ServiceLike | undefined): string | undefined {
  return service?.taskSets?.find((set) => set.status === "PRIMARY")?.taskDefinition ?? undefined;
}

export interface AppSpecInput {
  taskDefinitionArn: string;
  containerName: string;
  containerPort: number;
}

/** Builds the CodeDeploy ECS AppSpec. `version` must be the string "0.0". */
export function buildEcsAppSpec(input: AppSpecInput): string {
  return JSON.stringify({
    version: "0.0",
    Resources: [
      {
        TargetService: {
          Type: "AWS::ECS::Service",
          Properties: {
            TaskDefinition: input.taskDefinitionArn,
            LoadBalancerInfo: {
              ContainerName: input.containerName,
              ContainerPort: input.containerPort
            }
          }
        }
      }
    ]
  });
}

/**
 * Drives a CodeDeploy ECS blue-green rollout to the supplied task definition.
 * Skips when the service's PRIMARY task set already runs that revision (e.g. the
 * first deploy, where ECS started the initial task set at this revision).
 */
export async function performBlueGreenShift(
  input: BlueGreenShiftInput,
  emit: Emit
): Promise<"shifted" | "skipped"> {
  const credentials = input.credentials;
  const ecs = new ECSClient({ region: input.region, credentials });

  const described = await ecs.send(
    new DescribeServicesCommand({ cluster: input.clusterName, services: [input.serviceName] })
  );
  const live = selectLiveTaskDefinition(described.services?.[0]);
  if (live && live === input.taskDefinitionArn) {
    await emit("Service already runs the target task definition; skipping blue-green shift.");
    return "skipped";
  }

  const codedeploy = new CodeDeployClient({ region: input.region, credentials });
  const created = await codedeploy.send(
    new CreateDeploymentCommand({
      applicationName: input.applicationName,
      deploymentGroupName: input.deploymentGroupName,
      revision: {
        revisionType: "AppSpecContent",
        appSpecContent: {
          content: buildEcsAppSpec({
            taskDefinitionArn: input.taskDefinitionArn,
            containerName: input.containerName,
            containerPort: input.containerPort
          })
        }
      }
    })
  );

  const deploymentId = created.deploymentId;
  if (!deploymentId) throw new Error("CodeDeploy did not return a deployment id.");
  await emit(`CodeDeploy blue-green deployment ${deploymentId} started; shifting traffic with zero downtime.`);

  await pollUntilComplete(codedeploy, deploymentId, emit);
  return "shifted";
}

async function pollUntilComplete(client: CodeDeployClient, deploymentId: string, emit: Emit): Promise<void> {
  let lastStatus = "";
  for (let attempt = 0; attempt < MAX_POLLS; attempt += 1) {
    const info = await client.send(new GetDeploymentCommand({ deploymentId }));
    const status = info.deploymentInfo?.status ?? "Unknown";

    if (status !== lastStatus) {
      await emit(`CodeDeploy status: ${status}.`);
      lastStatus = status;
    }

    if (status === "Succeeded") return;
    if (TERMINAL_FAILURE.has(status)) {
      const reason = info.deploymentInfo?.errorInformation?.message ?? "no error detail provided";
      throw new Error(
        `CodeDeploy blue-green deployment ${status.toLowerCase()} and was rolled back automatically. ${reason}`
      );
    }

    await sleep(POLL_INTERVAL_MS);
  }

  throw new Error(`CodeDeploy deployment ${deploymentId} did not finish within the timeout window.`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
