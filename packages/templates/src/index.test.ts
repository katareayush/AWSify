import { describe, expect, it } from "vitest";
import type { DeploymentSuggestion } from "@awsify/deployment-schemas";
import { createDeploymentPlan, generateDockerfile } from "./index";

function baseSuggestion(overrides: Partial<DeploymentSuggestion>): DeploymentSuggestion {
  return {
    appType: "node-backend",
    computeTarget: "ecs-fargate",
    services: ["backend"],
    packageManager: "npm",
    buildCommand: "npm run build",
    startCommand: "npm start",
    installCommand: "npm ci",
    port: 3000,
    healthPath: "/health",
    hasDockerfile: false,
    envVars: [],
    database: { required: false },
    cache: { required: false },
    confidence: 0.9,
    notes: [],
    ...overrides
  };
}

describe("createDeploymentPlan", () => {
  it("creates only approved MVP resource types", () => {
    const plan = createDeploymentPlan({
      projectId: "proj_1",
      appName: "test-api",
      region: "test-region",
      awsifyAccountId: "000000000000",
      externalId: "external-id-123456",
      suggestion: baseSuggestion({})
    });

    expect(plan.requiresApproval).toBe(true);
    expect(plan.resources.map((resource) => resource.type)).not.toContain("lambda.function");
    expect(plan.artifacts.some((artifact) => artifact.kind === "dockerfile")).toBe(true);
  });
});

describe("generateDockerfile", () => {
  const cases: Array<[DeploymentSuggestion["appType"], Partial<DeploymentSuggestion>, RegExp]> = [
    ["node-backend", {}, /FROM node:22-alpine/],
    ["nextjs-app", { appType: "nextjs-app" }, /NEXT_TELEMETRY_DISABLED/],
    ["static-spa", { appType: "static-spa", port: 80, startCommand: "nginx -g 'daemon off;'" }, /FROM nginx/],
    [
      "python-backend",
      { appType: "python-backend", port: 8000, installCommand: "pip install --no-cache-dir -r requirements.txt", buildCommand: "python -m compileall .", startCommand: "uvicorn main:app --host 0.0.0.0 --port 8000" },
      /FROM python:3\.12-slim/
    ],
    [
      "go-backend",
      { appType: "go-backend", port: 8080, installCommand: "go mod download", buildCommand: "go build -o /app/server ./...", startCommand: "/app/server" },
      /FROM golang:1\.23-alpine/
    ],
    [
      "ruby-backend",
      { appType: "ruby-backend", port: 3000, installCommand: "bundle install", buildCommand: "bundle exec rake assets:precompile", startCommand: "bundle exec rails server -b 0.0.0.0 -p 3000" },
      /FROM ruby:3\.3-slim/
    ],
    [
      "java-backend",
      { appType: "java-backend", port: 8080, installCommand: "mvn -B -q dependency:go-offline", buildCommand: "mvn -B -q -DskipTests package", startCommand: "java -jar /app/app.jar" },
      /FROM maven:3\.9-eclipse-temurin-21/
    ],
    [
      "rust-backend",
      { appType: "rust-backend", port: 8080, installCommand: "cargo fetch", buildCommand: "cargo build --release", startCommand: "/app/api" },
      /FROM rust:1-bookworm/
    ],
    [
      "php-backend",
      { appType: "php-backend", port: 8080, installCommand: "composer install --no-dev --optimize-autoloader --no-interaction", buildCommand: "echo skip", startCommand: "php artisan serve --host=0.0.0.0 --port=8080" },
      /FROM php:8\.3-cli/
    ]
  ];

  for (const [name, overrides, expected] of cases) {
    it(`emits a Dockerfile for ${name}`, () => {
      const content = generateDockerfile(baseSuggestion(overrides));
      expect(content).toMatch(expected);
      expect(content).toContain("EXPOSE");
    });
  }
});
