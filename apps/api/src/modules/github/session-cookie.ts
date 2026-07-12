import type { CookieOptions, Response } from "express";

export const SESSION_COOKIE = "aws_ify_session";
export const OAUTH_STATE_COOKIE = "aws_ify_oauth_state";
export const APP_INSTALL_STATE_COOKIE = "aws_ify_app_install_state";

export const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
export const OAUTH_STATE_MAX_AGE_MS = 10 * 60 * 1000;
export const APP_INSTALL_STATE_MAX_AGE_MS = 10 * 60 * 1000;

function baseCookieOptions(): CookieOptions {
  // In production the web app and API are usually on different sites, so the
  // browser only attaches the session cookie to cross-site fetch()/XHR (e.g. the
  // /github/me auth check) when it's SameSite=None — and None requires Secure.
  // Dev runs same-site over http, where Lax is correct and Secure would drop the
  // cookie. Override with SESSION_COOKIE_SAMESITE=lax if you deploy same-site.
  const isProd = process.env.NODE_ENV === "production";
  const sameSite = (process.env.SESSION_COOKIE_SAMESITE as CookieOptions["sameSite"]) ?? (isProd ? "none" : "lax");
  return {
    httpOnly: true,
    secure: isProd,
    sameSite,
    path: "/"
  };
}

export function sessionCookieOptions(): CookieOptions {
  return { ...baseCookieOptions(), maxAge: SESSION_MAX_AGE_MS };
}

export function oauthStateCookieOptions(): CookieOptions {
  return { ...baseCookieOptions(), maxAge: OAUTH_STATE_MAX_AGE_MS };
}

export function appInstallStateCookieOptions(): CookieOptions {
  return { ...baseCookieOptions(), maxAge: APP_INSTALL_STATE_MAX_AGE_MS };
}

export function clearAuthCookie(res: Response, name: string): void {
  res.clearCookie(name, { path: "/" });
}

export function appUrl(): string {
  const value = process.env.APP_URL;
  if (!value) throw new Error("APP_URL is required.");
  return value;
}

export function redirectWithError(res: Response, path: string, errorCode: string): void {
  const url = new URL(path, appUrl());
  url.searchParams.set("error", errorCode);
  res.redirect(url.toString());
}
