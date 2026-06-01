import { Controller, Get, Query, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import { GithubService } from "./github.service";

const SESSION_COOKIE = "aws_ify_session";
const OAUTH_STATE_COOKIE = "aws_ify_oauth_state";
const APP_INSTALL_STATE_COOKIE = "aws_ify_app_install_state";
const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const OAUTH_STATE_MAX_AGE_MS = 10 * 60 * 1000;
const APP_INSTALL_STATE_MAX_AGE_MS = 10 * 60 * 1000;

@Controller("github")
export class GithubController {
  constructor(private readonly github: GithubService) {}

  @Get("login-url")
  loginUrl(@Res({ passthrough: true }) res: Response) {
    const login = this.github.createOAuthLoginUrl();
    if (!login) return { error: "GITHUB_CLIENT_ID or API_URL not configured." };
    res.cookie(OAUTH_STATE_COOKIE, this.github.signOAuthState(login.state), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: OAUTH_STATE_MAX_AGE_MS
    });
    return { url: login.url };
  }

  @Get("app-install-url")
  appInstallUrl(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies?.[SESSION_COOKIE] as string | undefined;
    const install = this.github.createAppInstallUrlForSession(token);
    if ("error" in install) return { error: install.error };
    res.cookie(APP_INSTALL_STATE_COOKIE, this.github.signOAuthState(install.state), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: APP_INSTALL_STATE_MAX_AGE_MS
    });
    return { url: install.url };
  }

  @Get("callback")
  async oauthCallback(
    @Query("code") code: string | undefined,
    @Query("state") state: string | undefined,
    @Req() req: Request,
    @Res() res: Response
  ) {
    if (!code) {
      res.status(400).json({ error: "missing_code" });
      return;
    }
    const signedState = req.cookies?.[OAUTH_STATE_COOKIE] as string | undefined;
    if (!this.github.verifyOAuthState(state, signedState)) {
      res.status(400).json({ error: "invalid_oauth_state" });
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
    res.clearCookie(OAUTH_STATE_COOKIE);

    res.redirect(`${requiredEnv("APP_URL")}/dashboard`);
  }

  @Get("repositories")
  async repositories(@Req() req: Request) {
    const token = req.cookies?.[SESSION_COOKIE] as string | undefined;
    if (!token) return { error: "not_authenticated" };
    return this.github.listRepositories(token);
  }

  @Get("repositories/refresh")
  async refreshRepositories(@Req() req: Request) {
    const token = req.cookies?.[SESSION_COOKIE] as string | undefined;
    return this.github.refreshRepositories(token);
  }

  @Get("app/callback")
  async appCallback(
    @Query("installation_id") installationId: string | undefined,
    @Query("state") state: string | undefined,
    @Req() req: Request,
    @Res() res: Response
  ) {
    const signedState = req.cookies?.[APP_INSTALL_STATE_COOKIE] as string | undefined;
    if (!this.github.verifyOAuthState(state, signedState)) {
      res.status(400).json({ error: "invalid_app_install_state" });
      return;
    }

    const token = req.cookies?.[SESSION_COOKIE] as string | undefined;
    const result = await this.github.syncInstallationForSession(token, installationId);
    if ("error" in result) {
      res.status(result.error === "not_authenticated" ? 401 : 400).json(result);
      return;
    }

    res.clearCookie(APP_INSTALL_STATE_COOKIE);
    res.redirect(`${requiredEnv("APP_URL")}/repositories`);
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

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required.`);
  return value;
}
