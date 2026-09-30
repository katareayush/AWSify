import { afterEach, describe, expect, it } from "vitest";
import { allowedAppUrls, appUrlFromState, stateForOrigin } from "./session-cookie";

const originalAppUrl = process.env.APP_URL;
const originalPreviewUrls = process.env.PREVIEW_APP_URLS;

afterEach(() => {
  if (originalAppUrl === undefined) delete process.env.APP_URL;
  else process.env.APP_URL = originalAppUrl;
  if (originalPreviewUrls === undefined) delete process.env.PREVIEW_APP_URLS;
  else process.env.PREVIEW_APP_URLS = originalPreviewUrls;
});

describe("preview return origins", () => {
  it("keeps production OAuth state unchanged", () => {
    process.env.APP_URL = "https://awsify.example.com";
    process.env.PREVIEW_APP_URLS = "https://preview.awsify.example.com";
    expect(stateForOrigin("nonce", "https://awsify.example.com")).toBe("nonce");
    expect(appUrlFromState("nonce")).toBe("https://awsify.example.com");
  });

  it("returns to an exact allowlisted preview origin", () => {
    process.env.APP_URL = "https://awsify.example.com";
    process.env.PREVIEW_APP_URLS = "https://preview.awsify.example.com, https://preview.example.net";
    const state = stateForOrigin("nonce", "https://preview.awsify.example.com");
    expect(allowedAppUrls()).toHaveLength(3);
    expect(appUrlFromState(state)).toBe("https://preview.awsify.example.com");
  });

  it("does not accept a lookalike or unlisted redirect origin", () => {
    process.env.APP_URL = "https://awsify.example.com";
    process.env.PREVIEW_APP_URLS = "https://preview.awsify.example.com";
    expect(stateForOrigin("nonce", "https://preview.awsify.example.com.attacker.net")).toBe("nonce");
    const injected = `nonce.${Buffer.from("https://attacker.net").toString("base64url")}`;
    expect(appUrlFromState(injected)).toBe("https://awsify.example.com");
  });
});
