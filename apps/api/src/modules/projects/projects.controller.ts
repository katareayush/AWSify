import { Body, Controller, Get, Param, Post } from "@nestjs/common";
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
  get(@Param("id") id: string) {
    return this.projects.get(id);
  }
}
