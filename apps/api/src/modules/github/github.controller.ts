import { Controller, Get, Query } from "@nestjs/common";
import { GithubService } from "./github.service";

@Controller("github")
export class GithubController {
  constructor(private readonly github: GithubService) {}

  @Get("login-url")
  loginUrl() {
    return { url: this.github.createOAuthLoginUrl() };
  }

  @Get("app-install-url")
  appInstallUrl() {
    return { url: this.github.createAppInstallUrl() };
  }

  @Get("callback")
  oauthCallback(@Query("code") code?: string) {
    return this.github.exchangeOAuthCode(code);
  }

  @Get("repositories")
  repositories() {
    return this.github.listMockRepositories();
  }
}
