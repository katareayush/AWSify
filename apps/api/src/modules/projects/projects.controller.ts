import { Body, Controller, Get, Param, Patch, Post, Req } from "@nestjs/common";
import type { Request } from "express";
import { SESSION_COOKIE } from "../github/session-cookie";
import { ProjectsService } from "./projects.service";

@Controller("projects")
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Get()
  list() {
    return this.projects.list();
  }

  @Post()
  create(@Body() body: { name: string; repoFullName: string; branch: string }) {
    return this.projects.create(body);
  }

  @Get(":id")
  get(@Req() req: Request, @Param("id") id: string) {
    const token = req.cookies?.[SESSION_COOKIE] as string | undefined;
    return this.projects.get(id, token);
  }

  @Get(":id/settings")
  settings(@Req() req: Request, @Param("id") id: string) {
    const token = req.cookies?.[SESSION_COOKIE] as string | undefined;
    return this.projects.getSettings(id, token);
  }

  @Patch(":id/settings")
  updateSettings(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() body: { branch?: string; port?: number; healthPath?: string }
  ) {
    const token = req.cookies?.[SESSION_COOKIE] as string | undefined;
    return this.projects.updateSettings(id, token, body);
  }

  @Get(":id/audit-events")
  auditEvents(@Req() req: Request, @Param("id") id: string) {
    const token = req.cookies?.[SESSION_COOKIE] as string | undefined;
    return this.projects.auditEvents(id, token);
  }
}
