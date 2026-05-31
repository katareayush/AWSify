import { Body, Controller, Get, Post, Req } from "@nestjs/common";
import type { Request } from "express";
import { GithubService } from "../github/github.service";
import { AwsService } from "./aws.service";

const SESSION_COOKIE = "aws_ify_session";

@Controller("aws")
export class AwsController {
  constructor(
    private readonly aws: AwsService,
    private readonly github: GithubService
  ) {}

  @Get("cloudformation-template")
  cloudFormationTemplate(@Req() req: Request) {
    const token = req.cookies?.[SESSION_COOKIE] as string | undefined;
    const session = token ? this.github.verifySession(token) : null;
    if (!session) return { error: "not_authenticated" };
    return this.aws.createConnectionTemplate(session.userId);
  }

  @Post("connections/validate")
  validateConnection(@Req() req: Request, @Body() body: { roleArn: string; externalId: string; region?: string }) {
    const token = req.cookies?.[SESSION_COOKIE] as string | undefined;
    const session = token ? this.github.verifySession(token) : null;
    if (!session) return { error: "not_authenticated" };
    return this.aws.validateConnection(session.userId, body);
  }

  @Post("connections")
  async saveConnection(
    @Req() req: Request,
    @Body() body: { roleArn: string; externalId: string; accountId: string; region: string }
  ) {
    const token = req.cookies?.[SESSION_COOKIE] as string | undefined;
    const session = token ? this.github.verifySession(token) : null;
    if (!session) return { error: "not_authenticated" };
    return this.aws.saveConnection(session.userId, body);
  }

  @Get("connections")
  async listConnections(@Req() req: Request) {
    const token = req.cookies?.[SESSION_COOKIE] as string | undefined;
    const session = token ? this.github.verifySession(token) : null;
    if (!session) return { error: "not_authenticated" };
    return this.aws.listConnections(session.userId);
  }
}
