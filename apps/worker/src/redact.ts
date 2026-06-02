const URL_BASIC_AUTH = /(https?:\/\/)[^:/?#\s]+:[^@\s]+@/gi;
const BEARER_TOKEN = /(authorization:\s*bearer\s+)[A-Za-z0-9._\-+/=]+/gi;
const GITHUB_TOKEN = /\b(ghs|ghp|gho|ghu|ghr)_[A-Za-z0-9_]{16,}\b|\bgithub_pat_[A-Za-z0-9_]{20,}\b/g;
const AWS_ACCESS_KEY = /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g;

export function redactSecrets(input: string): string {
  if (!input) return input;
  return input
    .replace(URL_BASIC_AUTH, "$1***:***@")
    .replace(BEARER_TOKEN, "$1***")
    .replace(GITHUB_TOKEN, "***")
    .replace(AWS_ACCESS_KEY, "***");
}
