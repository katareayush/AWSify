"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUrlNumber, useUrlState } from "../../lib/use-url-state";
import { AlertTriangle, ArrowRight, GitBranch, GitCommitHorizontal, Github, KeyRound, Loader2, Lock, RefreshCw, Search, Users } from "lucide-react";
import { PageHeading } from "../../components/page-heading";
import { ProductShell } from "../../components/product-shell";
import { Button } from "../../components/ui/button";
import { Panel } from "../../components/ui/panel";
import { Pagination } from "../../components/ui/pagination";
import { PageSkeleton } from "../../components/ui/skeleton";
import { EmptyState } from "../../components/ui/empty-state";
import { useAuth } from "../../lib/use-auth";
import { useToast } from "../../components/ui/toast";
import { api, type Repo, type AwsConnection, type RepoRefSummary } from "../../lib/api";

const PAGE_SIZE = 10;

const DEPLOYMENT_PROFILES = [
  {
    key: "lean",
    label: "Lean launch",
    description: "Small team, early traffic, lowest baseline spend."
  },
  {
    key: "growth",
    label: "Growth traffic",
    description: "Production launch with room for regular usage spikes."
  },
  {
    key: "high-scale",
    label: "Large user base",
    description: "Higher availability expectations and heavier traffic."
  }
];

export default function RepositoriesPage() {
  return (
    <Suspense fallback={null}>
      <RepositoriesPageInner />
    </Suspense>
  );
}

function RepositoriesPageInner() {
  const { me, loading } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [repos, setRepos] = useState<Repo[]>([]);
  const [connections, setConnections] = useState<AwsConnection[]>([]);
  const [query, setQuery] = useUrlState("q", "");
  const [page, setPage] = useUrlNumber("page", 0);
  const [deploying, setDeploying] = useState<string | null>(null);
  const [reposLoading, setReposLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deploymentProfile, setDeploymentProfile] = useState("lean");
  const [repoRefs, setRepoRefs] = useState<Record<string, RepoRefSummary>>({});
  const [refsLoading, setRefsLoading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!me?.authenticated) return;
    Promise.all([
      api.repositories().then(r => setRepos(r.repositories)).catch((err) => {
        toast.error(err instanceof Error ? err.message : "Could not load repositories.");
      }),
      api.listConnections().then(r => setConnections(r.connections)).catch((err) => {
        toast.error(err instanceof Error ? err.message : "Could not load AWS connections.");
      })
    ]).finally(() => setReposLoading(false));
  }, [me?.authenticated, toast]);

  // Reset to the first page only when the search term actually changes —
  // not on mount (would break ?page= deep links).
  const prevQuery = useRef(query);
  useEffect(() => {
    if (prevQuery.current === query) return;
    prevQuery.current = query;
    setPage(0);
  }, [query, setPage]);

  async function handleInstallApp() {
    try {
      const { url } = await api.appInstallUrl();
      window.location.href = url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not start GitHub App installation.");
    }
  }

  async function handleRefreshRepos() {
    setRefreshing(true);
    try {
      const result = await api.refreshRepositories();
      setRepos(result.repositories);
      toast.success(`Repository list refreshed (${result.repositories.length} repos).`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Refresh failed.");
    } finally {
      setRefreshing(false);
    }
  }

  async function handleDeploy(repo: Repo) {
    const connection = connections.find((c) => c.status === "valid");
    if (!connection) {
      router.push("/connections");
      return;
    }
    setDeploying(repo.id);
    try {
      const { deploymentId } = await api.triggerDeploy({
        repoId: repo.id,
        branch: repoRefs[repo.id]?.branch ?? repo.defaultBranch,
        awsConnectionId: connection.id,
        deploymentProfile
      });
      toast.success(`Deployment started for ${repo.fullName}.`);
      router.push(`/deployments/${deploymentId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not start deployment.");
      setDeploying(null);
    }
  }

  const filtered = useMemo(
    () => repos.filter(r => r.fullName.toLowerCase().includes(query.toLowerCase())),
    [repos, query]
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);

  useEffect(() => {
    if (page !== currentPage) setPage(currentPage);
  }, [currentPage, page, setPage]);

  const paginated = useMemo(
    () => filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE),
    [filtered, currentPage]
  );

  useEffect(() => {
    if (!me?.authenticated || reposLoading) return;
    for (const repo of paginated) {
      if (repoRefs[repo.id] || refsLoading[repo.id]) continue;
      void loadRefs(repo.id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me?.authenticated, paginated, reposLoading]);

  async function loadRefs(repoId: string, branch?: string) {
    setRefsLoading((current) => ({ ...current, [repoId]: true }));
    try {
      const refs = await api.repositoryRefs(repoId, branch);
      setRepoRefs((current) => ({ ...current, [repoId]: refs }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load repository branches.");
    } finally {
      setRefsLoading((current) => ({ ...current, [repoId]: false }));
    }
  }

  if (loading) {
    return (
      <ProductShell active="Repositories">
        <PageSkeleton variant="list" />
      </ProductShell>
    );
  }

  const hasAws = connections.some((connection) => connection.status === "valid");
  const hasBrokenAws = !hasAws && connections.length > 0;

  return (
    <ProductShell active="Repositories">
      <div className="space-y-5">
        <PageHeading
          eyebrow="Repository selection"
          title="Choose what AWS-ify should deploy"
          description={
            hasAws
              ? "Select a repository — AWS-ify will scan, plan, and deploy it to your AWS account."
              : "Connect an AWS account first, then select a repository to deploy."
          }
          action={
            <div className="flex gap-2">
              <Button variant="secondary" onClick={handleRefreshRepos} disabled={refreshing}>
                {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Refresh
              </Button>
              <Button variant="secondary" onClick={handleInstallApp}>
                <Github className="h-4 w-4" />
                Manage GitHub App
              </Button>
            </div>
          }
        />

        {!hasAws && repos.length > 0 && (
          <Panel className="border-amber-500/25 bg-amber-500/[0.04] p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
              <div className="flex-1">
                <p className="text-[13px] font-medium text-amber-200">
                  {hasBrokenAws ? "AWS connection needs attention" : "AWS account not connected"}
                </p>
                <p className="mt-1 text-[12.5px] leading-[1.55] text-amber-200/75">
                  {hasBrokenAws
                    ? "Your AWS connection is invalid or still pending validation. Fix it to enable the Deploy button on each repository."
                    : "Deploying requires an IAM role from your AWS account. Connect one to enable the Deploy button on each repository."}
                </p>
              </div>
              <Button asChild variant="secondary" className="shrink-0">
                <Link href="/connections">
                  <KeyRound className="h-4 w-4" />
                  {hasBrokenAws ? "Fix AWS connection" : "Connect AWS"}
                </Link>
              </Button>
            </div>
          </Panel>
        )}

        <Panel className="p-6">
          <div className="mb-5 rounded-lg border border-white/[0.06] bg-white/[0.015] p-3">
            <div className="mb-3 flex items-center gap-2">
              <Users className="h-4 w-4 text-violet-soft" />
              <p className="text-[12.5px] font-medium text-white/85">Expected traffic</p>
            </div>
            <div className="grid gap-2 lg:grid-cols-3">
              {DEPLOYMENT_PROFILES.map((profile) => {
                const selected = deploymentProfile === profile.key;
                return (
                  <button
                    key={profile.key}
                    type="button"
                    onClick={() => setDeploymentProfile(profile.key)}
                    className={`rounded-md border px-3 py-2 text-left transition-colors ${
                      selected
                        ? "border-violet/35 bg-violet/10 text-white"
                        : "border-white/[0.07] bg-white/[0.02] text-white/65 hover:border-white/[0.14] hover:text-white"
                    }`}
                  >
                    <span className="block text-[12.5px] font-medium">{profile.label}</span>
                    <span className="mt-1 block text-[11px] leading-[1.45] text-white/40">{profile.description}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex h-10 items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 text-[13px] text-white/45">
            <Search className="h-3.5 w-3.5 shrink-0" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search repositories"
              className="flex-1 bg-transparent outline-none placeholder:text-white/35 text-white"
            />
          </div>

          <div className="mt-5 divide-y divide-white/[0.05]">
            {reposLoading ? (
              <div className="flex items-center justify-center py-14 gap-2 text-white/40">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-[13px]">Loading repositories…</span>
              </div>
            ) : filtered.length === 0 ? (
              repos.length === 0 ? (
                <EmptyState
                  icon={Github}
                  title="No repositories connected"
                  description="Install the GitHub App to list repositories here."
                  action={
                    <Button variant="secondary" onClick={handleInstallApp}>
                      <Github className="h-4 w-4" />
                      Install GitHub App
                    </Button>
                  }
                />
              ) : (
                <EmptyState
                  icon={Search}
                  title="No results"
                  description="Try a different search term."
                />
              )
            ) : (
              paginated.map(repo => (
                <div
                  key={repo.id}
                  className="grid gap-3 py-4 text-[13.5px] lg:grid-cols-[minmax(0,1fr)_minmax(220px,300px)_160px]"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium text-white">{repo.fullName}</p>
                      {repo.private && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-white/55">
                          <Lock className="h-2.5 w-2.5" />
                          private
                        </span>
                      )}
                    </div>
                    <p className="mt-1 font-mono text-[11px] text-white/45">
                      default branch · {repo.defaultBranch}
                    </p>
                  </div>
                  <RepoBranchControl
                    repo={repo}
                    refs={repoRefs[repo.id]}
                    loading={!!refsLoading[repo.id]}
                    onBranchChange={(branch) => loadRefs(repo.id, branch)}
                  />
                  <div className="flex lg:justify-end">
                    {hasAws ? (
                      <Button
                        variant="secondary"
                        disabled={deploying === repo.id}
                        onClick={() => handleDeploy(repo)}
                      >
                        {deploying === repo.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <>Deploy <ArrowRight className="h-4 w-4" /></>
                        )}
                      </Button>
                    ) : (
                      <Button asChild variant="secondary" title="Connect an AWS account first">
                        <Link href="/connections">
                          <KeyRound className="h-4 w-4" />
                          Connect AWS first
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <Pagination
            page={currentPage}
            pageSize={PAGE_SIZE}
            total={filtered.length}
            onPageChange={setPage}
            label="repositories"
          />
        </Panel>
      </div>
    </ProductShell>
  );
}

function RepoBranchControl({
  repo,
  refs,
  loading,
  onBranchChange
}: {
  repo: Repo;
  refs?: RepoRefSummary;
  loading: boolean;
  onBranchChange: (branch: string) => void;
}) {
  const commits = refs?.commits ?? [];
  const branch = refs?.branch ?? repo.defaultBranch;

  return (
    <div className="w-full min-w-0 max-w-full overflow-hidden rounded-md border border-white/[0.06] bg-white/[0.015] p-2.5">
      <label className="flex min-w-0 items-center gap-2">
        <GitBranch className="h-3.5 w-3.5 shrink-0 text-white/40" />
        <select
          value={branch}
          onChange={(event) => onBranchChange(event.target.value)}
          disabled={loading || !refs}
          className="w-0 min-w-0 flex-1 truncate bg-transparent font-mono text-[11.5px] text-white/75 outline-none disabled:opacity-50"
        >
          {refs ? (
            refs.branches.map((item) => (
              <option key={item.name} value={item.name}>
                {item.name}{item.isDefault ? " (default)" : ""}
              </option>
            ))
          ) : (
            <option value={repo.defaultBranch}>{loading ? "Loading branches..." : repo.defaultBranch}</option>
          )}
        </select>
        {loading && refs && <Loader2 className="h-3 w-3 shrink-0 animate-spin text-white/35" />}
      </label>
      <div className="mt-2 min-w-0 space-y-1">
        {loading && commits.length === 0 ? (
          <p className="flex items-center gap-1.5 text-[11px] text-white/35">
            <Loader2 className="h-3 w-3 animate-spin" />
            Loading recent commits
          </p>
        ) : commits.length > 0 ? (
          commits.slice(0, 2).map((commit) => (
            <div key={commit.sha} className="min-w-0 text-[11px] leading-[1.35]">
              <p className="flex min-w-0 items-center gap-1 text-white/65" title={commit.message}>
                <GitCommitHorizontal className="h-3 w-3 shrink-0 text-white/35" />
                <span className="min-w-0 truncate">{commit.message}</span>
              </p>
              <p className="mt-0.5 truncate font-mono text-white/35">
                {commit.shortSha} · {commit.author}
              </p>
            </div>
          ))
        ) : (
          <p className="text-[11px] text-white/35">Recent commits unavailable.</p>
        )}
      </div>
    </div>
  );
}
