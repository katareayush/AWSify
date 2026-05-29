import { Body, Controller, Param, Post } from "@nestjs/common";
import { DeploymentsService } from "./deployments.service";

@Controller("deployments")
export class DeploymentsController {
  constructor(private readonly deployments: DeploymentsService) {}

  @Post("plans")
  createPlan(
    @Body()
    body: {
      projectId: string;
      appName: string;
      region: string;
      repoFullName: string;
      branch: string;
    }
  ) {
    return this.deployments.createPlan(body);
  }

  @Post("plans/:id/approve")
  approve(@Param("id") id: string) {
    return this.deployments.approvePlan(id);
  }

  @Post("plans/:id/deploy")
  deploy(
    @Param("id") id: string,
    @Body() body: { projectId: string; repoFullName: string; branch: string; awsConnectionId: string; actorUserId: string }
  ) {
    return this.deployments.deployApprovedPlan(id, body);
  }
}
