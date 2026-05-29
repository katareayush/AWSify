import { Module } from "@nestjs/common";
import { GithubController } from "./github.controller";
import { GithubService } from "./github.service";
import { PrismaService } from "../prisma.service";

@Module({
  controllers: [GithubController],
  providers: [GithubService, PrismaService],
  exports: [GithubService]
})
export class GithubModule {}
