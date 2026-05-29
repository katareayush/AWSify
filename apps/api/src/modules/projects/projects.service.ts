import { Injectable } from "@nestjs/common";

@Injectable()
export class ProjectsService {
  private readonly projects = new Map<string, { id: string; name: string; repoFullName: string; branch: string }>();

  list() {
    return { projects: [...this.projects.values()] };
  }

  create(input: { name: string; repoFullName: string; branch: string }) {
    const project = {
      id: `proj_${crypto.randomUUID()}`,
      name: input.name,
      repoFullName: input.repoFullName,
      branch: input.branch
    };
    this.projects.set(project.id, project);
    return { project };
  }

  get(id: string) {
    return { project: this.projects.get(id) ?? null };
  }
}
