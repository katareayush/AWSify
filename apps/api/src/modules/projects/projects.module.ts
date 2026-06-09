import { Module } from "@nestjs/common";
import { GithubModule } from "../github/github.module";
import { PrismaService } from "../prisma.service";
import { ProjectsController } from "./projects.controller";
import { ProjectsService } from "./projects.service";

@Module({
  imports: [GithubModule],
  controllers: [ProjectsController],
  providers: [ProjectsService, PrismaService],
  exports: [ProjectsService]
})
export class ProjectsModule {}
