import { Module } from "@nestjs/common";
import { GithubActionsService } from "./github-actions.service";
import { GithubCommitService } from "./github-commit.service";
import { GithubController } from "./github.controller";
import { GithubWebhooksController } from "./github-webhooks.controller";
import { GithubWebhooksService } from "./github-webhooks.service";
import { GithubService } from "./github.service";
import { PrismaService } from "../prisma.service";

@Module({
  controllers: [GithubController, GithubWebhooksController],
  providers: [GithubActionsService, GithubCommitService, GithubService, GithubWebhooksService, PrismaService],
  exports: [GithubActionsService, GithubCommitService, GithubService]
})
export class GithubModule {}
