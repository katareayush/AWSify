import { PrismaPg } from "@prisma/adapter-pg";
export { PrismaClient } from "@prisma/client";

export function createPrismaAdapter(connectionString = process.env.DATABASE_URL!) {
  return new PrismaPg({ connectionString });
}
export type {
  AwsConnection,
  Deployment,
  DeploymentArtifact,
  DeploymentPlan,
  GitHubInstallation,
  Project,
  ProjectEnvVar,
  Repository,
  User
} from "@prisma/client";
