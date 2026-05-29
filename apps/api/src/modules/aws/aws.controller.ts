import { Body, Controller, Get, Post } from "@nestjs/common";
import { AwsService } from "./aws.service";

@Controller("aws")
export class AwsController {
  constructor(private readonly aws: AwsService) {}

  @Get("cloudformation-template")
  cloudFormationTemplate() {
    return this.aws.createConnectionTemplate();
  }

  @Post("connections/validate")
  validateConnection(@Body() body: { roleArn: string; externalId: string; region?: string }) {
    return this.aws.validateConnection(body);
  }
}
