import { Body, Controller, Delete, Get, Headers, Param, Post, Req } from "@nestjs/common";
import type { Request } from "express";
import { SESSION_COOKIE } from "../github/session-cookie";
import { DeploymentsService } from "./deployments.service";

@Controller("deployments")
export class DeploymentsController {
  constructor(private readonly deployments: DeploymentsService) {}

  @Post("trigger")
  trigger(
    @Req() req: Request,
    @Body() body: { repoId: string; branch: string; awsConnectionId: string; deploymentProfile?: string }
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

  @Delete(":id")
  delete(@Req() req: Request, @Param("id") id: string) {
    const token = req.cookies?.[SESSION_COOKIE] as string | undefined;
    return this.deployments.delete(id, token);
  }

  @Post(":id/approve")
  approve(@Req() req: Request, @Param("id") id: string) {
    const token = req.cookies?.[SESSION_COOKIE] as string | undefined;
    return this.deployments.approve(id, token);
  }

  @Post(":id/redeploy")
  redeployLatest(@Req() req: Request, @Param("id") id: string) {
    const token = req.cookies?.[SESSION_COOKIE] as string | undefined;
    return this.deployments.redeployLatest(id, token);
  }

  @Post(":id/env")
  saveEnvVars(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() body: { env: Record<string, string> }
  ) {
    const token = req.cookies?.[SESSION_COOKIE] as string | undefined;
    return this.deployments.saveEnvVars(id, token, body);
  }

  @Delete(":id/env/:name")
  deleteEnvVar(@Req() req: Request, @Param("id") id: string, @Param("name") name: string) {
    const token = req.cookies?.[SESSION_COOKIE] as string | undefined;
    return this.deployments.deleteEnvVar(id, token, name);
  }

  @Post(":id/runtime")
  saveRuntimeSettings(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() body: { port?: number; healthPath?: string }
  ) {
    const token = req.cookies?.[SESSION_COOKIE] as string | undefined;
    return this.deployments.saveRuntimeSettings(id, token, body);
  }

  @Post(":id/scan-review")
  saveScanReview(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() body: {
      appType?: string;
      packageManager?: string;
      buildCommand?: string;
      startCommand?: string;
      installCommand?: string;
      port?: number;
      healthPath?: string;
    }
  ) {
    const token = req.cookies?.[SESSION_COOKIE] as string | undefined;
    return this.deployments.saveScanReview(id, token, body);
  }

  @Get(":id/diagnosis")
  diagnosis(@Req() req: Request, @Param("id") id: string) {
    const token = req.cookies?.[SESSION_COOKIE] as string | undefined;
    return this.deployments.getDiagnosis(id, token);
  }

  @Get(":id/artifact-diff")
  artifactDiff(@Req() req: Request, @Param("id") id: string) {
    const token = req.cookies?.[SESSION_COOKIE] as string | undefined;
    return this.deployments.getArtifactDiff(id, token);
  }

  @Post(":id/ci-token")
  rotateCiToken(@Req() req: Request, @Param("id") id: string) {
    const token = req.cookies?.[SESSION_COOKIE] as string | undefined;
    return this.deployments.rotateCiToken(id, token);
  }

  @Post(":id/commit-artifacts")
  commitArtifacts(@Req() req: Request, @Param("id") id: string) {
    const token = req.cookies?.[SESSION_COOKIE] as string | undefined;
    return this.deployments.commitArtifactsToRepo(id, token);
  }

  @Post("redeploy")
  redeploy(
    @Headers("authorization") authorization: string | undefined,
    @Body() body: { projectId: string; branch?: string }
  ) {
    return this.deployments.redeployWithToken(body, authorization);
  }
}
