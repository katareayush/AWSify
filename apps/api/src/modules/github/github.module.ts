import { Module } from "@nestjs/common";
import { GithubCommitService } from "./github-commit.service";
import { GithubController } from "./github.controller";
import { GithubService } from "./github.service";
import { PrismaService } from "../prisma.service";

@Module({
  controllers: [GithubController],
  providers: [GithubCommitService, GithubService, PrismaService],
  exports: [GithubCommitService, GithubService]
})
export class GithubModule {}
