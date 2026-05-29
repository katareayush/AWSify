import { Controller, Get, Query, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import { GithubService } from "./github.service";

const SESSION_COOKIE = "aws_ify_session";
const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

@Controller("github")
export class GithubController {
  constructor(private readonly github: GithubService) {}

  @Get("login-url")
  loginUrl() {
    const url = this.github.createOAuthLoginUrl();
    if (!url) return { error: "GITHUB_CLIENT_ID or API_URL not configured." };
    return { url };
  }

  @Get("app-install-url")
  appInstallUrl() {
    const url = this.github.createAppInstallUrl();
    if (!url) return { error: "GITHUB_APP_SLUG not configured." };
    return { url };
  }

  @Get("callback")
  async oauthCallback(@Query("code") code: string | undefined, @Res() res: Response) {
    if (!code) {
      res.status(400).json({ error: "missing_code" });
      return;
    }

    const result = await this.github.exchangeOAuthCode(code);
    if (!result) {
      res.status(401).json({ error: "github_auth_failed" });
      return;
    }

    res.cookie(SESSION_COOKIE, result.sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_MAX_AGE_MS
    });

    const webUrl = process.env.WEB_URL ?? "http://localhost:3000";
    res.redirect(`${webUrl}/dashboard`);
  }

  @Get("repositories")
  async repositories(@Req() req: Request) {
    const token = req.cookies?.[SESSION_COOKIE] as string | undefined;
    if (!token) return { error: "not_authenticated" };
    return this.github.listRepositories(token);
  }

  @Get("me")
  me(@Req() req: Request) {
    const token = req.cookies?.[SESSION_COOKIE] as string | undefined;
    if (!token) return { authenticated: false };
    const session = this.github.verifySession(token);
    if (!session) return { authenticated: false };
    return { authenticated: true, userId: session.userId, githubLogin: session.githubLogin };
  }
}
