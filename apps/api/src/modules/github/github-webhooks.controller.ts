import { Controller, Headers, HttpCode, Post, Req } from "@nestjs/common";
import type { RawBodyRequest } from "@nestjs/common";
import type { Request } from "express";
import { GithubWebhooksService } from "./github-webhooks.service";

@Controller("github")
export class GithubWebhooksController {
  constructor(private readonly webhooks: GithubWebhooksService) {}

  @Post("webhooks")
  @HttpCode(200)
  async receive(
    @Req() req: RawBodyRequest<Request>,
    @Headers("x-github-event") event: string | undefined,
    @Headers("x-hub-signature-256") signature: string | undefined
  ) {
    // If no secret is configured we can't trust anything — accept the delivery
    // (so GitHub doesn't retry-storm) but do nothing with it.
    if (!process.env.GITHUB_WEBHOOK_SECRET) return { ok: true, skipped: "no_secret" };
    if (!this.webhooks.verifySignature(req.rawBody, signature)) {
      return { ok: false, error: "invalid_signature" };
    }

    await this.webhooks.handleEvent(event, req.body ?? {});
    return { ok: true };
  }
}
