import { Module } from "@nestjs/common";
import { GithubModule } from "../github/github.module";
import { QueueModule } from "../queue/queue.module";
import { PrismaService } from "../prisma.service";
import { DeploymentsController } from "./deployments.controller";
import { DeploymentsService } from "./deployments.service";

@Module({
  imports: [QueueModule, GithubModule],
  controllers: [DeploymentsController],
  providers: [DeploymentsService, PrismaService],
  exports: [DeploymentsService]
})
export class DeploymentsModule {}
