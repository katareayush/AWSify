import type { DeploymentSuggestion } from "@awsify/deployment-schemas";
import { joinDockerfile } from "./shared.js";

export function javaDockerfile(suggestion: DeploymentSuggestion): string {
  const isMaven = suggestion.buildCommand.startsWith("mvn");
  const builderImage = isMaven ? "maven:3.9-eclipse-temurin-21" : "gradle:8.10-jdk21";
  const builderJarPath = isMaven ? "/build/target/*.jar" : "/build/build/libs/*.jar";

  return joinDockerfile([
    `FROM ${builderImage} AS builder`,
    "WORKDIR /build",
    isMaven ? "COPY pom.xml ./" : "COPY build.gradle* settings.gradle* gradle.properties* ./",
    isMaven ? "" : "COPY gradle ./gradle",
    `RUN ${suggestion.installCommand} || true`,
    "COPY . .",
    `RUN ${suggestion.buildCommand}`,
    `RUN mkdir -p /app && cp ${builderJarPath} /app/app.jar`,
    "",
    "FROM eclipse-temurin:21-jre",
    "WORKDIR /app",
    "COPY --from=builder /app/app.jar /app/app.jar",
    `EXPOSE ${suggestion.port}`,
    'CMD ["java", "-jar", "/app/app.jar"]'
  ]);
}
