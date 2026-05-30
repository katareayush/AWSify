import { Module } from "@nestjs/common";
import { GithubModule } from "../github/github.module";
import { PrismaService } from "../prisma.service";
import { AwsController } from "./aws.controller";
import { AwsService } from "./aws.service";

@Module({
  imports: [GithubModule],
  controllers: [AwsController],
  providers: [AwsService, PrismaService],
  exports: [AwsService]
})
export class AwsModule {}
