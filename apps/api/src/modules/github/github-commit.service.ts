import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { createInstallationToken } from "./github.service";

interface CommitError {
  error: string;
  detail?: string;
}

interface ArtifactDiffFile {
  path: string;
  status: "new" | "changed" | "unchanged";
  additions: number;
  deletions: number;
  hunks: Array<{ type: "context" | "add" | "remove"; content: string; lineNumber?: number }>;
}

// The CloudFormation role is a one-time setup artifact the customer applies in
// AWS, not a repo file — so it never appears in the against-branch diff.
const SKIP_KINDS = new Set(["cloudformation_role"]);

/**
 * Read-only preview of how the generated deploy artifacts differ from what's
 * currently on the deploy branch. Writing them (workflow + Dockerfile) and
 * wiring CI is handled by GithubActionsService / DeploymentsService.
 */
@Injectable()
export class GithubCommitService {
  constructor(private readonly prisma: PrismaService) {}

  async getDeploymentArtifactDiff(
    deploymentId: string,
    userId: string
  ): Promise<{ files: ArtifactDiffFile[]; branch: string } | CommitError> {
    const deployment = await this.prisma.deployment.findUnique({
      where: { id: deploymentId },
      include: {
        project: {
          include: {
            repository: { include: { installation: true } }
          }
        },
        plan: { include: { artifacts: true } }
      }
    });

    if (!deployment) return { error: "deployment_not_found" };
    if (deployment.project.userId !== userId) return { error: "not_authorized" };

    const repo = deployment.project.repository;
    const installation = repo.installation;
    const [owner, repoName] = repo.fullName.split("/");
    if (!owner || !repoName) return { error: "invalid_repo_fullname" };

    let token: string;
    try {
      token = await createInstallationToken(installation.installationId);
    } catch (err) {
      return { error: "installation_token_failed", detail: errorMessage(err) };
    }

    const branch = deployment.project.branch || repo.defaultBranch;
    const files: ArtifactDiffFile[] = [];
    for (const artifact of deployment.plan.artifacts.filter((a) => !SKIP_KINDS.has(a.kind))) {
      const existing = await getFileContent(token, owner, repoName, artifact.path, branch);
      if (existing.error && existing.error !== "not_found") {
        return { error: "file_lookup_failed", detail: `${artifact.path}: ${existing.error}` };
      }
      files.push(createLineDiff(artifact.path, existing.content ?? "", artifact.content, existing.error === "not_found"));
    }

    return { files, branch };
  }
}

function createLineDiff(path: string, before: string, after: string, isNew: boolean): ArtifactDiffFile {
  const beforeLines = before.split(/\r?\n/);
  const afterLines = after.split(/\r?\n/);
  const max = Math.max(beforeLines.length, afterLines.length);
  const hunks: ArtifactDiffFile["hunks"] = [];
  let additions = 0;
  let deletions = 0;

  for (let i = 0; i < max; i += 1) {
    const oldLine = beforeLines[i];
    const newLine = afterLines[i];
    if (oldLine === newLine) {
      if (hunks.length < 120 && oldLine !== undefined) hunks.push({ type: "context", content: oldLine, lineNumber: i + 1 });
      continue;
    }
    if (oldLine !== undefined && !(i === beforeLines.length - 1 && oldLine === "" && newLine === undefined)) {
      deletions += 1;
      if (hunks.length < 120) hunks.push({ type: "remove", content: oldLine, lineNumber: i + 1 });
    }
    if (newLine !== undefined && !(i === afterLines.length - 1 && newLine === "" && oldLine === undefined)) {
      additions += 1;
      if (hunks.length < 120) hunks.push({ type: "add", content: newLine, lineNumber: i + 1 });
    }
  }

  return {
    path,
    status: isNew ? "new" : additions === 0 && deletions === 0 ? "unchanged" : "changed",
    additions,
    deletions,
    hunks
  };
}

interface GitHubContentItem {
  sha?: string;
  message?: string;
}

async function getFileContent(
  token: string,
  owner: string,
  repo: string,
  path: string,
  branch: string
): Promise<{ content?: string; error?: string }> {
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${encodePath(path)}?ref=${encodeURIComponent(branch)}`,
    { headers: ghHeaders(token) }
  );
  if (res.status === 404) return { error: "not_found" };
  const data = (await res.json().catch(() => ({}))) as GitHubContentItem & { content?: string; encoding?: string };
  if (!res.ok) return { error: data.message ?? `HTTP ${res.status}` };
  if (!data.content || data.encoding !== "base64") return { error: "unsupported_content_encoding" };
  return { content: Buffer.from(data.content.replace(/\n/g, ""), "base64").toString("utf8") };
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

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
