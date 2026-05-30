import { Body, Controller, Get, Param, Post, Req } from "@nestjs/common";
import type { Request } from "express";
import { DeploymentsService } from "./deployments.service";

const SESSION_COOKIE = "aws_ify_session";

@Controller("deployments")
export class DeploymentsController {
  constructor(private readonly deployments: DeploymentsService) {}

  @Post("trigger")
  trigger(
    @Req() req: Request,
    @Body() body: { repoId: string; branch: string; awsConnectionId: string }
  ) {
    const token = req.cookies?.[SESSION_COOKIE] as string | undefined;
    return this.deployments.trigger(token, body);
  }

  @Get()
  list(@Req() req: Request) {
    const token = req.cookies?.[SESSION_COOKIE] as string | undefined;
    return this.deployments.list(token);
  }

  @Get(":id")
  get(@Req() req: Request, @Param("id") id: string) {
    const token = req.cookies?.[SESSION_COOKIE] as string | undefined;
    return this.deployments.get(id, token);
  }
}
