import type { CookieOptions, Response } from "express";

export const SESSION_COOKIE = "aws_ify_session";
export const OAUTH_STATE_COOKIE = "aws_ify_oauth_state";
export const APP_INSTALL_STATE_COOKIE = "aws_ify_app_install_state";

export const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
export const OAUTH_STATE_MAX_AGE_MS = 10 * 60 * 1000;
export const APP_INSTALL_STATE_MAX_AGE_MS = 10 * 60 * 1000;

function baseCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
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
