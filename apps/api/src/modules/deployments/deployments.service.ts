import { Injectable } from "@nestjs/common";
import { createDeploymentPlan } from "@awsify/templates";
import { deploymentSuggestionSchema, type DeploymentPlan, type DeploymentSuggestion } from "@awsify/deployment-schemas";
import { QueueService } from "../queue/queue.service";

@Injectable()
export class DeploymentsService {
  private readonly plans = new Map<string, DeploymentPlan>();

  constructor(private readonly queue: QueueService) {}

  createPlan(input: { projectId: string; appName: string; region: string; suggestion?: DeploymentSuggestion }) {
    if (!input.suggestion) {
      return {
        status: "missing_suggestion",
        note: "Create a plan only after repo scanning returns a validated DeploymentSuggestion."
      };
    }

    const suggestion = deploymentSuggestionSchema.parse(input.suggestion);

    const plan = createDeploymentPlan({
      projectId: input.projectId,
      appName: input.appName,
      region: input.region,
      awsifyAccountId: process.env.AWSIFY_AWS_ACCOUNT_ID ?? "",
      externalId: `awsify-${input.projectId}`,
      suggestion
    });

    this.plans.set(plan.id, plan);
    return { plan };
  }

  approvePlan(id: string) {
    const plan = this.plans.get(id);
    if (!plan) return { status: "not_found" };
    const approved = { ...plan, status: "approved" as const };
    this.plans.set(id, approved);
    return { plan: approved };
  }

  async deployApprovedPlan(
    approvedPlanId: string,
    input: { projectId: string; repoFullName: string; branch: string; awsConnectionId: string; actorUserId: string }
  ) {
    const plan = this.plans.get(approvedPlanId);
    if (!plan || plan.status !== "approved") return { status: "not_approved" };

    const job = await this.queue.enqueueDeployment({
      projectId: input.projectId,
      repoFullName: input.repoFullName,
      branch: input.branch,
      awsConnectionId: input.awsConnectionId,
      approvedPlanId,
      actorUserId: input.actorUserId
    });

    return { status: "queued", jobId: job.id };
  }
}
