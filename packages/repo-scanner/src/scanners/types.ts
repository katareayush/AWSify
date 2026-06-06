import type { ComputeTarget, DeploymentSuggestion } from "@awsify/deployment-schemas";

export interface RepoScanResult {
  root: string;
  packageManager: DeploymentSuggestion["packageManager"];
  appType: DeploymentSuggestion["appType"];
  computeTarget: ComputeTarget;
  buildCommand: string;
  startCommand: string;
  installCommand: string;
  port: number;
  healthPath: string;
  hasDockerfile: boolean;
  envVars: DeploymentSuggestion["envVars"];
  databaseRequired: boolean;
  databaseEngine: "postgresql" | "mysql" | "mongodb" | undefined;
  cacheRequired: boolean;
  signals: string[];
}
