import { humanizeError } from "./error-messages";

const BASE = process.env.NEXT_PUBLIC_API_URL;
if (!BASE) throw new Error("NEXT_PUBLIC_API_URL is required.");

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init?.headers }
  });
  let data: unknown = null;
  try { data = await res.json(); } catch { /* ignore */ }
  if (data && typeof data === "object" && "error" in data) {
    const errObj = data as { error: unknown; detail?: unknown; validation?: { reason?: unknown } };
    const code = String(errObj.error);
    const detail = typeof errObj.detail === "string" ? errObj.detail : "";
    const reason = typeof errObj.validation?.reason === "string" ? errObj.validation.reason : "";
    const composite = [code, detail, reason].filter(Boolean).join(": ");
    throw new ApiError(humanizeError(composite), res.status);
  }
  if (!res.ok) {
    throw new ApiError(humanizeError(`HTTP ${res.status}`), res.status);
  }
  return data as T;
}

// ---- types ----------------------------------------------------------------

export interface Me {
  authenticated: boolean;
  userId?: string;
  githubLogin?: string;
}

export interface Repo {
  id: string;
  fullName: string;
  defaultBranch: string;
  private: boolean;
}

export interface RepoRefSummary {
  branch: string;
  branches: Array<{ name: string; sha: string; isDefault: boolean }>;
  commits: Array<{
    sha: string;
    shortSha: string;
    message: string;
    author: string;
    committedAt: string | null;
    url: string | null;
  }>;
}

export interface AwsConnection {
  id: string;
  accountId: string;
  defaultRegion: string;
  status: "pending" | "valid" | "invalid";
  roleArn: string;
  createdAt: string;
}

export interface Deployment {
  id: string;
  projectId?: string;
  status: string;
  liveUrl: string | null;
  failureReason: string | null;
  createdAt: string;
  updatedAt: string;
  project: { name: string; repoFullName: string; branch: string };
}

export interface DeploymentDetail extends Deployment {
  projectId: string;
  logs: Array<{ status: string; message: string; at: string }>;
  projectEnvVars: Array<{ name: string; valuePreview: string | null; required: boolean; updatedAt: string }>;
  plan: {
    id: string;
    appName: string;
    region: string;
    suggestion: Record<string, unknown>;
    resources: Array<{ type: string; name: string; purpose: string }>;
    estimatedCost: { low: number; high: number; notes: string[] };
    artifacts: Array<{ kind: string; path: string; content: string; summary: string }>;
    status: string;
    updatedAt: string;
  };
}

export interface DeploymentDiagnosis {
  category: string;
  title: string;
  probableCause: string;
  suggestedFix: string;
  relatedLogs: string[];
}

export interface ArtifactDiffFile {
  path: string;
  status: "new" | "changed" | "unchanged";
  additions: number;
  deletions: number;
  hunks: Array<{ type: "context" | "add" | "remove"; content: string; lineNumber?: number }>;
}

export interface ProjectSettings {
  id: string;
  name: string;
  branch: string;
  repoFullName: string;
  defaultBranch: string;
  awsAccountId: string | null;
  awsRegion: string | null;
  createdAt: string;
  updatedAt: string;
  latestDeployment: { id: string; status: string; liveUrl: string | null; createdAt: string } | null;
  plan: {
    id: string;
    status: string;
    region: string;
    approvedAt: string | null;
    updatedAt: string;
    port: number | null;
    healthPath: string | null;
    artifactCount: number;
    editable: boolean;
  } | null;
  envVars: Array<{ name: string; valuePreview: string | null; required: boolean; updatedAt: string }>;
  detectedEnvVars: Array<{ name: string; required?: boolean; description?: string; example?: string; category?: string }>;
  hasCiToken: boolean;
}

export interface AuditEvent {
  id: string;
  type: string;
  message: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface PublicStatus {
  state: string;
  checkedAt: string;
  services: Array<{ name: string; state: string }>;
  recent: { active: number; deployed: number; failed: number; total: number; failureRate: number };
}

// ---- api calls ------------------------------------------------------------

export const api = {
  me: () => req<Me>("/github/me"),

  loginUrl: () => req<{ url: string }>("/github/login-url"),

  appInstallUrl: () => req<{ url: string }>("/github/app-install-url"),

  repositories: () => req<{ repositories: Repo[] }>("/github/repositories"),

  refreshRepositories: () => req<{ repositories: Repo[] }>("/github/repositories/refresh"),

  repositoryRefs: (repoId: string, branch?: string) =>
    req<RepoRefSummary>(
      `/github/repositories/${repoId}/refs${branch ? `?branch=${encodeURIComponent(branch)}` : ""}`
    ),

  cfnTemplate: () =>
    req<{ externalId: string; template: string | null; launchStackUrl: string | null }>(
      "/aws/cloudformation-template"
    ),

  validateConnection: (body: { roleArn: string; externalId: string; region: string }) =>
    req<{ status: string; reason?: string; accountId?: string; arn?: string }>("/aws/connections/validate", {
      method: "POST",
      body: JSON.stringify(body)
    }),

  saveConnection: (body: { roleArn: string; externalId: string; region?: string }) =>
    req<{ connection: AwsConnection }>("/aws/connections", {
      method: "POST",
      body: JSON.stringify(body)
    }),

  listConnections: () => req<{ connections: AwsConnection[] }>("/aws/connections"),

  triggerDeploy: (body: { repoId: string; branch: string; awsConnectionId: string; deploymentProfile?: string }) =>
    req<{ deploymentId: string }>("/deployments/trigger", {
      method: "POST",
      body: JSON.stringify(body)
    }),

  listDeployments: () => req<{ deployments: Deployment[] }>("/deployments"),

  getDeployment: (id: string) => req<{ deployment: DeploymentDetail }>(`/deployments/${id}`),

  deleteDeployment: (id: string) =>
    req<{ deleted: string }>(`/deployments/${id}`, {
      method: "DELETE"
    }),

  getDeploymentDiagnosis: (id: string) =>
    req<{ diagnosis: DeploymentDiagnosis }>(`/deployments/${id}/diagnosis`),

  getDeploymentArtifactDiff: (id: string) =>
    req<{ files: ArtifactDiffFile[]; branch: string }>(`/deployments/${id}/artifact-diff`),

  saveDeploymentEnv: (id: string, env: Record<string, string>) =>
    req<{ saved: string[]; added: string[] }>(`/deployments/${id}/env`, {
      method: "POST",
      body: JSON.stringify({ env })
    }),

  deleteDeploymentEnv: (id: string, name: string) =>
    req<{ deleted: string }>(`/deployments/${id}/env/${encodeURIComponent(name)}`, {
      method: "DELETE"
    }),

  saveDeploymentRuntime: (id: string, body: { port: number; healthPath: string }) =>
    req<{ suggestion: Record<string, unknown> }>(`/deployments/${id}/runtime`, {
      method: "POST",
      body: JSON.stringify(body)
    }),

  saveDeploymentScanReview: (
    id: string,
    body: {
      appType: string;
      packageManager: string;
      buildCommand: string;
      startCommand: string;
      installCommand: string;
      port: number;
      healthPath: string;
    }
  ) =>
    req<{ suggestion: Record<string, unknown> }>(`/deployments/${id}/scan-review`, {
      method: "POST",
      body: JSON.stringify(body)
    }),

  approveDeployment: (id: string) =>
    req<{ deploymentId: string; status: string }>(`/deployments/${id}/approve`, {
      method: "POST"
    }),

  redeployLatest: (id: string) =>
    req<{ deploymentId: string; status: string }>(`/deployments/${id}/redeploy`, {
      method: "POST"
    }),

  destroyDeploymentInfrastructure: (id: string) =>
    req<{ deploymentId: string; status: string }>(`/deployments/${id}/destroy`, {
      method: "POST"
    }),

  rotateDeploymentCiToken: (id: string) =>
    req<{
      token: string;
      secretName: string;
      variables: { name: string; value: string }[];
      variableName: string;
      variableValue: string;
      projectId: string;
    }>(`/deployments/${id}/ci-token`, {
      method: "POST"
    }),

  commitDeploymentArtifacts: (id: string) =>
    req<CommitArtifactsResponse>(`/deployments/${id}/commit-artifacts`, {
      method: "POST"
    }),

  getProjectSettings: (id: string) => req<{ settings: ProjectSettings }>(`/projects/${id}/settings`),

  updateProjectSettings: (id: string, body: { branch?: string; port?: number; healthPath?: string }) =>
    req<{ settings: ProjectSettings }>(`/projects/${id}/settings`, {
      method: "PATCH",
      body: JSON.stringify(body)
    }),

  getProjectAuditEvents: (id: string) => req<{ events: AuditEvent[]; unavailable?: boolean }>(`/projects/${id}/audit-events`),

  publicStatus: () => req<PublicStatus>("/health/public-status")
};

export interface CommitArtifactsResponse {
  prUrl: string;
  prNumber: number;
  branch: string;
  committed: string[];
}
