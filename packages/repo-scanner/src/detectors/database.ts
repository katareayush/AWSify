import type { DeploymentSuggestion } from "@awsify/deployment-schemas";

type Engine = "postgresql" | "mysql" | "mongodb";

export interface DatabaseSignal {
  hasPg: boolean;
  hasMysql: boolean;
  hasMongo: boolean;
}

export function databaseFromEnvVars(envVars: DeploymentSuggestion["envVars"]): boolean {
  return envVars.some((v) => v.name === "DATABASE_URL" || v.name === "DB_HOST" || v.name === "POSTGRES_URL" || v.name === "MYSQL_URL" || v.name === "MONGODB_URI");
}

export function resolveDatabase(
  signal: DatabaseSignal,
  envVars: DeploymentSuggestion["envVars"]
): { databaseRequired: boolean; databaseEngine: Engine | undefined } {
  const fromEnv = databaseFromEnvVars(envVars);
  const databaseRequired = signal.hasPg || signal.hasMysql || signal.hasMongo || fromEnv;
  const databaseEngine: Engine | undefined = signal.hasPg
    ? "postgresql"
    : signal.hasMysql
      ? "mysql"
      : signal.hasMongo
        ? "mongodb"
        : undefined;
  return { databaseRequired, databaseEngine };
}
