import { Module } from "@nestjs/common";
import { GithubActionsService } from "./github-actions.service";
import { GithubCommitService } from "./github-commit.service";
import { GithubController } from "./github.controller";
import { GithubService } from "./github.service";
import { PrismaService } from "../prisma.service";

@Module({
  controllers: [GithubController],
  providers: [GithubActionsService, GithubCommitService, GithubService, PrismaService],
  exports: [GithubActionsService, GithubCommitService, GithubService]
})
export class GithubModule {}
