import { Body, Controller, Get, Header, Post, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import { GithubService } from "../github/github.service";
import { SESSION_COOKIE } from "../github/session-cookie";
import { AwsService } from "./aws.service";

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

  @Get("cloudformation-template/public")
  @Header("Content-Type", "application/x-yaml")
  publicCloudFormationTemplate(@Res() res: Response) {
    const template = this.aws.getPublicTemplate();
    if (!template) {
      res.status(503).type("text/plain").send("AWSIFY_AWS_ACCOUNT_ID is not configured.");
      return;
    }
    res.send(template);
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
    @Body() body: { roleArn: string; externalId: string; region?: string }
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
