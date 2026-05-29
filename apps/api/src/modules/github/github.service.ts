import { Injectable } from "@nestjs/common";

@Injectable()
export class GithubService {
  createOAuthLoginUrl() {
    const clientId = process.env.GITHUB_CLIENT_ID ?? "missing-client-id";
    const redirectUri = `${process.env.API_URL ?? "http://localhost:4000"}/v1/github/callback`;
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: "read:user user:email",
      state: "local-dev-state"
    });
    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  }

  createAppInstallUrl() {
    const slug = process.env.GITHUB_APP_SLUG ?? "awsify-dev";
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

  listMockRepositories() {
    return {
      repositories: [
        {
          id: "repo_mock_express",
          fullName: "demo/express-api",
          defaultBranch: "main",
          private: true,
          supported: true
        },
        {
          id: "repo_mock_next",
          fullName: "demo/next-dashboard",
          defaultBranch: "main",
          private: false,
          supported: true
        }
      ]
    };
  }
}
