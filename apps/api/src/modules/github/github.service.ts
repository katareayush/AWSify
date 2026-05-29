import { createHmac, timingSafeEqual } from "node:crypto";
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

interface SessionPayload {
  userId: string;
  githubLogin: string;
  exp: number;
}

@Injectable()
export class GithubService {
  constructor(private readonly prisma: PrismaService) {}

  createOAuthLoginUrl(): string | null {
    const clientId = process.env.GITHUB_CLIENT_ID;
    const apiUrl = process.env.API_URL;
    if (!clientId || !apiUrl) return null;

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: `${apiUrl}/v1/github/callback`,
      scope: "read:user user:email",
      state: crypto.randomUUID()
    });
    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  }

  createAppInstallUrl(): string | null {
    const slug = process.env.GITHUB_APP_SLUG;
    if (!slug) return null;
    return `https://github.com/apps/${slug}/installations/new`;
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

  signSession(payload: Omit<SessionPayload, "exp">): string {
    const data = Buffer.from(
      JSON.stringify({ ...payload, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 })
    ).toString("base64url");

    const secret = process.env.SESSION_SECRET ?? "change-me-before-production";
    const sig = createHmac("sha256", secret).update(data).digest("base64url");
    return `${data}.${sig}`;
  }

  verifySession(token: string): SessionPayload | null {
    const dot = token.lastIndexOf(".");
    if (dot < 0) return null;

    const data = token.slice(0, dot);
    const sig = token.slice(dot + 1);
    const secret = process.env.SESSION_SECRET ?? "change-me-before-production";
    const expected = createHmac("sha256", secret).update(data).digest("base64url");

    try {
      if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    } catch {
      return null;
    }

    const payload = JSON.parse(Buffer.from(data, "base64url").toString()) as SessionPayload;
    if (payload.exp < Date.now()) return null;
    return payload;
  }
}
