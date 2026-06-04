const BASE = process.env.NEXT_PUBLIC_API_URL;
if (!BASE) throw new Error("NEXT_PUBLIC_API_URL is required.");

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init?.headers }
  });
  let data: unknown = null;
  try { data = await res.json(); } catch { /* ignore */ }
  const error = data && typeof data === "object" && "error" in data ? String((data as { error: unknown }).error) : "";
  if (!res.ok || error) throw new Error(error || `HTTP ${res.status}`);
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
  status: string;
  liveUrl: string | null;
  failureReason: string | null;
  createdAt: string;
  updatedAt: string;
  project: { name: string; repoFullName: string; branch: string };
}

export interface DeploymentDetail extends Deployment {
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

// ---- api calls ------------------------------------------------------------

export const api = {
  me: () => req<Me>("/github/me"),

  loginUrl: () => req<{ url: string }>("/github/login-url"),

  appInstallUrl: () => req<{ url: string }>("/github/app-install-url"),

  repositories: () => req<{ repositories: Repo[] }>("/github/repositories"),

  refreshRepositories: () => req<{ repositories: Repo[] }>("/github/repositories/refresh"),

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

  triggerDeploy: (body: { repoId: string; branch: string; awsConnectionId: string }) =>
    req<{ deploymentId: string }>("/deployments/trigger", {
      method: "POST",
      body: JSON.stringify(body)
    }),

  listDeployments: () => req<{ deployments: Deployment[] }>("/deployments"),

  getDeployment: (id: string) => req<{ deployment: DeploymentDetail }>(`/deployments/${id}`),

  saveDeploymentEnv: (id: string, env: Record<string, string>) =>
    req<{ saved: string[] }>(`/deployments/${id}/env`, {
      method: "POST",
      body: JSON.stringify({ env })
    }),

  saveDeploymentRuntime: (id: string, body: { port: number; healthPath: string }) =>
    req<{ suggestion: Record<string, unknown> }>(`/deployments/${id}/runtime`, {
      method: "POST",
      body: JSON.stringify(body)
    }),

  approveDeployment: (id: string) =>
    req<{ deploymentId: string; status: string }>(`/deployments/${id}/approve`, {
      method: "POST"
    }),

  rotateDeploymentCiToken: (id: string) =>
    req<{ token: string; secretName: string; variableName: string; projectId: string }>(`/deployments/${id}/ci-token`, {
      method: "POST"
    }),

  commitDeploymentArtifacts: (id: string) =>
    req<CommitArtifactsResponse>(`/deployments/${id}/commit-artifacts`, {
      method: "POST"
    })
};

export interface CommitArtifactsResponse {
  prUrl: string;
  prNumber: number;
  branch: string;
  committed: string[];
}
