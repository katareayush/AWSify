import { Controller, Get } from "@nestjs/common";
import { PrismaService } from "./prisma.service";

@Controller("health")
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  health() {
    return { ok: true, service: "awsify-api" };
  }

  @Get("/public-status")
  async publicStatus() {
    try {
      const recent = await this.prisma.deployment.findMany({
        orderBy: { createdAt: "desc" },
        take: 25,
        select: { status: true, createdAt: true, updatedAt: true }
      });
      const active = recent.filter((deployment) => ["queued", "scanning", "deploying"].includes(deployment.status)).length;
      const failedRecent = recent.filter((deployment) => deployment.status === "failed").length;
      const deployedRecent = recent.filter((deployment) => deployment.status === "deployed").length;
      const state = failedRecent > deployedRecent && failedRecent > 0 ? "degraded" : "operational";

      return {
        state,
        checkedAt: new Date().toISOString(),
        services: [
          { name: "API", state: "operational" },
          { name: "Database", state: "operational" },
          { name: "Deployment worker", state: active > 0 ? "active" : "idle" }
        ],
        recent: {
          active,
          deployed: deployedRecent,
          failed: failedRecent
        }
      };
    } catch {
      return {
        state: "degraded",
        checkedAt: new Date().toISOString(),
        services: [
          { name: "API", state: "operational" },
          { name: "Database", state: "degraded" },
          { name: "Deployment worker", state: "unknown" }
        ],
        recent: { active: 0, deployed: 0, failed: 0 }
      };
    }
  }
}
