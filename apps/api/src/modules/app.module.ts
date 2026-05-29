import { Module } from "@nestjs/common";
import { AwsModule } from "./aws/aws.module";
import { DeploymentsModule } from "./deployments/deployments.module";
import { GithubModule } from "./github/github.module";
import { HealthController } from "./health.controller";
import { PrismaService } from "./prisma.service";
import { ProjectsModule } from "./projects/projects.module";
import { QueueModule } from "./queue/queue.module";

@Module({
  imports: [AwsModule, DeploymentsModule, GithubModule, ProjectsModule, QueueModule],
  controllers: [HealthController],
  providers: [PrismaService],
  exports: [PrismaService]
})
export class AppModule {}
