import { Controller, Get, Param, Query, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import { GithubService } from "./github.service";
import {
  APP_INSTALL_STATE_COOKIE,
  OAUTH_STATE_COOKIE,
  SESSION_COOKIE,
  appInstallStateCookieOptions,
  appUrl,
  clearAuthCookie,
  oauthStateCookieOptions,
  redirectWithError,
  sessionCookieOptions
} from "./session-cookie";

@Controller("github")
export class GithubController {
  constructor(private readonly github: GithubService) {}

  @Get("login-url")
  loginUrl(@Res({ passthrough: true }) res: Response) {
    const login = this.github.createOAuthLoginUrl();
    if (!login) return { error: "GITHUB_CLIENT_ID or API_URL not configured." };
    res.cookie(OAUTH_STATE_COOKIE, this.github.signOAuthState(login.state), oauthStateCookieOptions());
    return { url: login.url };
  }

  @Get("app-install-url")
  appInstallUrl(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies?.[SESSION_COOKIE] as string | undefined;
    const install = this.github.createAppInstallUrlForSession(token);
    if ("error" in install) return { error: install.error };
    res.cookie(APP_INSTALL_STATE_COOKIE, this.github.signOAuthState(install.state), appInstallStateCookieOptions());
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
      redirectWithError(res, "/onboarding", "missing_code");
      return;
    }
    const signedState = req.cookies?.[OAUTH_STATE_COOKIE] as string | undefined;
    if (!this.github.verifyOAuthState(state, signedState)) {
      redirectWithError(res, "/onboarding", "invalid_oauth_state");
      return;
    }

    let result;
    try {
      result = await this.github.exchangeOAuthCode(code);
    } catch (err) {
      console.error("[github/callback] exchangeOAuthCode threw:", err);
      redirectWithError(res, "/onboarding", "github_auth_error");
      return;
    }
    if (!result) {
      redirectWithError(res, "/onboarding", "github_auth_failed");
      return;
    }

    res.cookie(SESSION_COOKIE, result.sessionToken, sessionCookieOptions());
    clearAuthCookie(res, OAUTH_STATE_COOKIE);

    res.redirect(`${appUrl()}/dashboard`);
  }

  @Get("repositories")
  async repositories(@Req() req: Request) {
    const token = req.cookies?.[SESSION_COOKIE] as string | undefined;
    if (!token) return { error: "not_authenticated" };
    return this.github.listRepositories(token);
  }

  @Get("repositories/:id/refs")
  async repositoryRefs(
    @Req() req: Request,
    @Param("id") id: string,
    @Query("branch") branch: string | undefined
  ) {
    const token = req.cookies?.[SESSION_COOKIE] as string | undefined;
    return this.github.repositoryRefs(token, id, branch);
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
      redirectWithError(res, "/repositories", "invalid_app_install_state");
      return;
    }

    const token = req.cookies?.[SESSION_COOKIE] as string | undefined;
    const result = await this.github.syncInstallationForSession(token, installationId);
    if ("error" in result && result.error) {
      const errorCode = result.error;
      const path = errorCode === "not_authenticated" ? "/onboarding" : "/repositories";
      redirectWithError(res, path, errorCode);
      return;
    }

    clearAuthCookie(res, APP_INSTALL_STATE_COOKIE);
    res.redirect(`${appUrl()}/repositories`);
  }

  @Get("me")
  me(@Req() req: Request) {
    const token = req.cookies?.[SESSION_COOKIE] as string | undefined;
    if (!token) return { authenticated: false };
    const session = this.github.verifySession(token);
    if (!session) return { authenticated: false };
    return { authenticated: true, userId: session.userId, githubLogin: session.githubLogin };
  }

  @Get("logout")
  logout(@Res({ passthrough: true }) res: Response) {
    clearAuthCookie(res, SESSION_COOKIE);
    return { ok: true };
  }
}
