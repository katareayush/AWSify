import { createHmac, createSign, randomUUID, timingSafeEqual } from "node:crypto";
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma.service";

interface GitHubTokenResponse {
  access_token?: string;
  error?: string;
  error_description?: string;
}

interface GitHubUserResponse {
  id: number;
  login: string;
  name?: string | null;
  email?: string | null;
  avatar_url?: string | null;
}

interface GitHubInstallationResponse {
  id: number;
  account: {
    login: string;
    type: string;
  } | null;
}

interface GitHubInstallationTokenResponse {
  token?: string;
  expires_at?: string;
  message?: string;
}

interface GitHubRepositoryResponse {
  id: number;
  full_name: string;
  default_branch: string;
  private: boolean;
}

interface GitHubRepositoriesResponse {
  repositories?: GitHubRepositoryResponse[];
}

interface SessionPayload {
  userId: string;
  githubLogin: string;
  exp: number;
}

@Injectable()
export class GithubService {
  constructor(private readonly prisma: PrismaService) {}

  createOAuthLoginUrl(): { url: string; state: string } | null {
    const clientId = process.env.GITHUB_CLIENT_ID;
    const apiUrl = process.env.API_URL;
    if (!clientId || !apiUrl) return null;

    const state = randomUUID();
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: `${apiUrl}/v1/github/callback`,
      scope: "read:user user:email",
      state
    });
    return { url: `https://github.com/login/oauth/authorize?${params.toString()}`, state };
  }

  createAppInstallUrl(): string | null {
    const slug = process.env.GITHUB_APP_SLUG;
    if (!slug) return null;
    return `https://github.com/apps/${slug}/installations/new`;
  }

  createAppInstallUrlForSession(sessionToken: string | undefined): { url: string; state: string } | { error: string } {
    const session = sessionToken ? this.verifySession(sessionToken) : null;
    if (!session) return { error: "not_authenticated" };
    const slug = process.env.GITHUB_APP_SLUG;
    if (!slug) return { error: "GITHUB_APP_SLUG not configured." };
    const state = randomUUID();
    return { url: `https://github.com/apps/${slug}/installations/new?state=${encodeURIComponent(state)}`, state };
  }

  async exchangeOAuthCode(code: string): Promise<{ sessionToken: string; githubLogin: string } | null> {
    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      throw new Error("GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET are required.");
    }

    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code })
    });
    const tokenData = (await tokenRes.json()) as GitHubTokenResponse;

    if (!tokenData.access_token) return null;

    const userRes = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28"
      }
    });
    const ghUser = (await userRes.json()) as GitHubUserResponse;

    const user = await this.prisma.user.upsert({
      where: { githubUserId: String(ghUser.id) },
      create: {
        githubUserId: String(ghUser.id),
        githubLogin: ghUser.login,
        name: ghUser.name ?? null,
        email: ghUser.email ?? null,
        avatarUrl: ghUser.avatar_url ?? null
      },
      update: {
        githubLogin: ghUser.login,
        name: ghUser.name ?? null,
        avatarUrl: ghUser.avatar_url ?? null
      }
    });

    return {
      sessionToken: this.signSession({ userId: user.id, githubLogin: user.githubLogin }),
      githubLogin: user.githubLogin
    };
  }

  async listRepositories(sessionToken: string) {
    const session = this.verifySession(sessionToken);
    if (!session) return { error: "invalid_session" };

    const installations = await this.prisma.gitHubInstallation.findMany({
      where: { user: { id: session.userId } },
      include: { repositories: true }
    });

    return {
      repositories: installations.flatMap((inst) =>
        inst.repositories.map((repo) => ({
          id: repo.id,
          fullName: repo.fullName,
          defaultBranch: repo.defaultBranch,
          private: repo.private
        }))
      )
    };
  }

  async syncInstallationForSession(sessionToken: string | undefined, installationId: string | undefined) {
    const session = sessionToken ? this.verifySession(sessionToken) : null;
    if (!session) return { error: "not_authenticated" };
    if (!installationId) return { error: "missing_installation_id" };

    const appJwt = createGithubAppJwt();
    const installationRes = await fetch(`https://api.github.com/app/installations/${installationId}`, {
      headers: githubHeaders(appJwt)
    });
    if (!installationRes.ok) return { error: "installation_lookup_failed" };
    const installation = (await installationRes.json()) as GitHubInstallationResponse;
    const accountLogin = installation.account?.login;
    const accountType = installation.account?.type;
    if (!accountLogin || !accountType) return { error: "installation_account_missing" };

    const savedInstallation = await this.prisma.gitHubInstallation.upsert({
      where: { installationId: String(installation.id) },
      create: {
        installationId: String(installation.id),
        accountLogin,
        accountType,
        userId: session.userId
      },
      update: {
        accountLogin,
        accountType,
        userId: session.userId
      }
    });

    const token = await createInstallationToken(String(installation.id));
    const repositories = await fetchInstallationRepositories(token);

    await this.prisma.$transaction([
      this.prisma.repository.deleteMany({
        where: { installationId: savedInstallation.id }
      }),
      ...repositories.map((repo) =>
        this.prisma.repository.create({
          data: {
            githubId: String(repo.id),
            fullName: repo.full_name,
            defaultBranch: repo.default_branch,
            private: repo.private,
            installationId: savedInstallation.id
          }
        })
      )
    ]);

    return {
      installation: {
        id: savedInstallation.id,
        installationId: savedInstallation.installationId,
        accountLogin,
        accountType
      },
      repositories: repositories.length
    };
  }

  async refreshRepositories(sessionToken: string | undefined) {
    const session = sessionToken ? this.verifySession(sessionToken) : null;
    if (!session) return { error: "not_authenticated" };

    const installations = await this.prisma.gitHubInstallation.findMany({
      where: { userId: session.userId }
    });

    for (const installation of installations) {
      const token = await createInstallationToken(installation.installationId);
      const repositories = await fetchInstallationRepositories(token);
      await this.prisma.$transaction([
        this.prisma.repository.deleteMany({ where: { installationId: installation.id } }),
        ...repositories.map((repo) =>
          this.prisma.repository.create({
            data: {
              githubId: String(repo.id),
              fullName: repo.full_name,
              defaultBranch: repo.default_branch,
              private: repo.private,
              installationId: installation.id
            }
          })
        )
      ]);
    }

    return this.listRepositories(sessionToken!);
  }

  signSession(payload: Omit<SessionPayload, "exp">): string {
    const data = Buffer.from(
      JSON.stringify({ ...payload, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 })
    ).toString("base64url");

    const sig = createHmac("sha256", this.requireSessionSecret()).update(data).digest("base64url");
    return `${data}.${sig}`;
  }

  signOAuthState(state: string): string {
    const sig = createHmac("sha256", this.requireSessionSecret()).update(state).digest("base64url");
    return `${state}.${sig}`;
  }

  verifyOAuthState(state: string | undefined, signedState: string | undefined): boolean {
    if (!state || !signedState) return false;
    const dot = signedState.lastIndexOf(".");
    if (dot < 0) return false;

    const storedState = signedState.slice(0, dot);
    const sig = signedState.slice(dot + 1);
    if (storedState !== state) return false;

    const expected = createHmac("sha256", this.requireSessionSecret()).update(storedState).digest("base64url");
    try {
      return timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
    } catch {
      return false;
    }
  }

  verifySession(token: string): SessionPayload | null {
    const dot = token.lastIndexOf(".");
    if (dot < 0) return null;

    const data = token.slice(0, dot);
    const sig = token.slice(dot + 1);
    const expected = createHmac("sha256", this.requireSessionSecret()).update(data).digest("base64url");

    try {
      if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    } catch {
      return null;
    }

    const payload = JSON.parse(Buffer.from(data, "base64url").toString()) as SessionPayload;
    if (payload.exp < Date.now()) return null;
    return payload;
  }

  private requireSessionSecret(): string {
    const secret = process.env.SESSION_SECRET;
    if (!secret || secret.length < 16) {
      throw new Error("SESSION_SECRET must be configured and at least 16 characters long.");
    }
    return secret;
  }
}

export function createGithubAppJwt(now = Math.floor(Date.now() / 1000)): string {
  const appId = process.env.GITHUB_APP_ID;
  const privateKeyBase64 = process.env.GITHUB_APP_PRIVATE_KEY_BASE64;
  if (!appId || !privateKeyBase64) {
    throw new Error("GITHUB_APP_ID and GITHUB_APP_PRIVATE_KEY_BASE64 are required.");
  }

  const header = base64UrlJson({ alg: "RS256", typ: "JWT" });
  const payload = base64UrlJson({ iat: now - 60, exp: now + 540, iss: appId });
  const signingInput = `${header}.${payload}`;
  const privateKey = Buffer.from(privateKeyBase64, "base64").toString("utf8");
  const signature = createSign("RSA-SHA256").update(signingInput).sign(privateKey, "base64url");
  return `${signingInput}.${signature}`;
}

export async function createInstallationToken(installationId: string): Promise<string> {
  const appJwt = createGithubAppJwt();
  const res = await fetch(`https://api.github.com/app/installations/${installationId}/access_tokens`, {
    method: "POST",
    headers: githubHeaders(appJwt)
  });
  const data = (await res.json()) as GitHubInstallationTokenResponse;
  if (!res.ok || !data.token) {
    throw new Error(data.message ?? `Failed to create GitHub installation token for ${installationId}.`);
  }
  return data.token;
}

async function fetchInstallationRepositories(token: string): Promise<GitHubRepositoryResponse[]> {
  const repositories: GitHubRepositoryResponse[] = [];
  let url = "https://api.github.com/installation/repositories?per_page=100";

  while (url) {
    const res = await fetch(url, { headers: githubHeaders(token) });
    if (!res.ok) throw new Error("Failed to list GitHub installation repositories.");
    const data = (await res.json()) as GitHubRepositoriesResponse;
    repositories.push(...(data.repositories ?? []));
    url = parseNextLink(res.headers.get("link"));
  }

  return repositories;
}

function githubHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28"
  };
}

function parseNextLink(linkHeader: string | null): string {
  if (!linkHeader) return "";
  const next = linkHeader.split(",").find((part) => part.includes('rel="next"'));
  const match = next?.match(/<([^>]+)>/);
  return match?.[1] ?? "";
}

function base64UrlJson(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}
