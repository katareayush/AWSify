import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { detectEnvVars } from "../env-vars.js";
import { resolveDatabase } from "../detectors/database.js";
import { detectHealthPath } from "../detectors/health-path.js";
import { detectPort } from "../detectors/port.js";
import type { RepoScanResult } from "./types.js";

export function scanJava(root: string, hasDockerfile: boolean, signals: string[]): RepoScanResult {
  const isMaven = existsSync(join(root, "pom.xml"));
  const isGradle = existsSync(join(root, "build.gradle")) || existsSync(join(root, "build.gradle.kts"));
  signals.push(isMaven ? "Maven project detected" : "Gradle project detected");

  const manifestContent = isMaven
    ? safeRead(join(root, "pom.xml"))
    : safeRead(join(root, "build.gradle")) + "\n" + safeRead(join(root, "build.gradle.kts"));
  const lower = manifestContent.toLowerCase();
  const isSpringBoot = lower.includes("spring-boot");
  if (isSpringBoot) signals.push("Spring Boot detected");

  const envVars = detectEnvVars(root, ["java", "kt", "properties", "yml", "yaml"]);
  const dbSignal = {
    hasPg: lower.includes("postgresql"),
    hasMysql: lower.includes("mysql-connector") || lower.includes("mariadb"),
    hasMongo: lower.includes("mongodb")
  };
  const { databaseRequired, databaseEngine } = resolveDatabase(dbSignal, envVars);
  const cacheRequired = lower.includes("spring-data-redis") || lower.includes("jedis") || lower.includes("lettuce");

  if (databaseRequired) signals.push(`Database dependency detected (${databaseEngine ?? "unknown"})`);
  if (cacheRequired) signals.push("Redis/cache dependency detected");

  const port = detectPort(root, ["java", "kt", "properties", "yml", "yaml"]) ?? 8080;
  const healthPath = isSpringBoot ? "/actuator/health" : detectHealthPath(root, ["java", "kt"]);

  const installCommand = isMaven
    ? "mvn -B -q dependency:go-offline"
    : "gradle --no-daemon dependencies";
  const buildCommand = isMaven
    ? "mvn -B -q -DskipTests package"
    : "gradle --no-daemon bootJar -x test";
  const startCommand = "java -jar /app/app.jar";

  return {
    root,
    packageManager: "npm",
    appType: "java-backend",
    computeTarget: "ecs-fargate",
    buildCommand,
    startCommand,
    installCommand,
    port,
    healthPath,
    hasDockerfile,
    envVars,
    databaseRequired,
    databaseEngine,
    cacheRequired,
    signals
  };
}

function safeRead(path: string): string {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return "";
  }
}
