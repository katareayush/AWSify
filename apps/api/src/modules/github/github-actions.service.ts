import { Injectable } from "@nestjs/common";
import sealedbox from "tweetnacl-sealedbox-js";
import { createInstallationToken } from "./github.service";

/**
 * Low-level write primitives for wiring a customer repo to run its own
 * AWS-ify deploy workflow: repo secrets/variables, the workflow file itself,
 * and on-demand `workflow_dispatch` triggers.
 *
 * All calls use a short-lived GitHub App installation token. Requires the App
 * to hold: contents:write (workflow file), actions:write (variables + dispatch),
 * secrets:write (Actions secrets), and workflows:write (files under
 * .github/workflows). A 403 here almost always means a missing App permission.
 */
@Injectable()
export class GithubActionsService {
  async setSecret(installationId: string, fullName: string, name: string, value: string): Promise<void> {
    const { owner, repo } = splitRepo(fullName);
    const token = await createInstallationToken(installationId);

    const keyRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/actions/secrets/public-key`, {
      headers: ghHeaders(token)
    });
    if (!keyRes.ok) throw new Error(await describe(keyRes, `read public key for ${fullName}`));
    const key = (await keyRes.json()) as { key: string; key_id: string };

    const encrypted = sealSecret(value, key.key);
    const putRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/actions/secrets/${encodeURIComponent(name)}`,
      {
        method: "PUT",
        headers: ghHeaders(token),
        body: JSON.stringify({ encrypted_value: encrypted, key_id: key.key_id })
      }
    );
    if (!putRes.ok) throw new Error(await describe(putRes, `set secret ${name}`));
  }

  /** Creates the Actions variable, or updates it if it already exists. */
  async setVariable(installationId: string, fullName: string, name: string, value: string): Promise<void> {
    const { owner, repo } = splitRepo(fullName);
    const token = await createInstallationToken(installationId);

    const create = await fetch(`https://api.github.com/repos/${owner}/${repo}/actions/variables`, {
      method: "POST",
      headers: ghHeaders(token),
      body: JSON.stringify({ name, value })
    });
    if (create.ok) return;
    if (create.status !== 409) throw new Error(await describe(create, `create variable ${name}`));

    const update = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/actions/variables/${encodeURIComponent(name)}`,
      {
        method: "PATCH",
        headers: ghHeaders(token),
        body: JSON.stringify({ name, value })
      }
    );
    if (!update.ok) throw new Error(await describe(update, `update variable ${name}`));
  }

  /**
   * Commits `content` to `path` on `branch`, creating or updating the file.
   * Returns whether an actual commit was made — an unchanged file is a no-op
   * on GitHub (so it fires no `push` event), which callers use to decide
   * whether they still need an explicit `workflow_dispatch`.
   */
  async commitFileToBranch(
    installationId: string,
    fullName: string,
    branch: string,
    path: string,
    content: string,
    message: string
  ): Promise<{ changed: boolean }> {
    const { owner, repo } = splitRepo(fullName);
    const token = await createInstallationToken(installationId);
    const existing = await getFile(token, owner, repo, path, branch);

    if (existing && existing.content === content) return { changed: false };

    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${encodePath(path)}`, {
      method: "PUT",
      headers: ghHeaders(token),
      body: JSON.stringify({
        message,
        content: Buffer.from(content, "utf8").toString("base64"),
        branch,
        ...(existing?.sha ? { sha: existing.sha } : {})
      })
    });
    if (!res.ok) throw new Error(await describe(res, `commit ${path}`));
    return { changed: true };
  }

  async fileExists(installationId: string, fullName: string, path: string, branch: string): Promise<boolean> {
    const { owner, repo } = splitRepo(fullName);
    const token = await createInstallationToken(installationId);
    return (await getFile(token, owner, repo, path, branch)) !== null;
  }

  /** Triggers a `workflow_dispatch` run of the named workflow file on `ref`. */
  async dispatchWorkflow(
    installationId: string,
    fullName: string,
    workflowFileName: string,
    ref: string
  ): Promise<void> {
    const { owner, repo } = splitRepo(fullName);
    const token = await createInstallationToken(installationId);
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${encodeURIComponent(workflowFileName)}/dispatches`,
      {
        method: "POST",
        headers: ghHeaders(token),
        body: JSON.stringify({ ref })
      }
    );
    if (!res.ok) throw new Error(await describe(res, `dispatch ${workflowFileName}`));
  }
}

function sealSecret(value: string, publicKeyBase64: string): string {
  const messageBytes = new TextEncoder().encode(value);
  const keyBytes = Buffer.from(publicKeyBase64, "base64");
  const sealed = sealedbox.seal(messageBytes, keyBytes);
  return Buffer.from(sealed).toString("base64");
}

async function getFile(
  token: string,
  owner: string,
  repo: string,
  path: string,
  branch: string
): Promise<{ sha: string; content: string } | null> {
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${encodePath(path)}?ref=${encodeURIComponent(branch)}`,
    { headers: ghHeaders(token) }
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(await describe(res, `read ${path}`));
  const data = (await res.json()) as { sha?: string; content?: string; encoding?: string };
  if (!data.sha || data.encoding !== "base64" || data.content === undefined) return null;
  return { sha: data.sha, content: Buffer.from(data.content.replace(/\n/g, ""), "base64").toString("utf8") };
}

function splitRepo(fullName: string): { owner: string; repo: string } {
  const [owner, repo] = fullName.split("/");
  if (!owner || !repo) throw new Error(`Invalid repository full name: ${fullName}`);
  return { owner, repo };
}

function ghHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
    "X-GitHub-Api-Version": "2022-11-28"
  };
}

function encodePath(path: string): string {
  return path.split("/").map(encodeURIComponent).join("/");
}

async function describe(res: Response, action: string): Promise<string> {
  const data = (await res.json().catch(() => ({}))) as { message?: string };
  const hint = res.status === 403
    ? " (the AWS-ify GitHub App is likely missing a permission: secrets, variables, contents, or workflows)"
    : "";
  return `GitHub API failed to ${action}: ${data.message ?? `HTTP ${res.status}`}${hint}`;
}
