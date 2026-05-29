import { Injectable } from "@nestjs/common";

@Injectable()
export class GithubService {
  createOAuthLoginUrl() {
    const clientId = process.env.GITHUB_CLIENT_ID;
    const apiUrl = process.env.API_URL;

    if (!clientId || !apiUrl) {
      return null;
    }

    const redirectUri = `${apiUrl}/v1/github/callback`;
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: "read:user user:email",
      state: crypto.randomUUID()
    });
    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  }

  createAppInstallUrl() {
    const slug = process.env.GITHUB_APP_SLUG;
    if (!slug) return null;
    return `https://github.com/apps/${slug}/installations/new`;
  }

  exchangeOAuthCode(code?: string) {
    if (!code) return { status: "missing_code" };
    return {
      status: "received",
      note: "Wire GitHub token exchange and first-party session persistence here.",
      codePreview: `${code.slice(0, 4)}...`
    };
  }

  listRepositories() {
    return {
      repositories: [],
      note: "Repository listing is empty until GitHub App installation token exchange is wired."
    };
  }
}
