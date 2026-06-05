"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUrlNumber, useUrlState } from "../../lib/use-url-state";
import { AlertTriangle, ArrowRight, Github, KeyRound, Loader2, Lock, RefreshCw, Search } from "lucide-react";
import { PageHeading } from "../../components/page-heading";
import { ProductShell } from "../../components/product-shell";
import { Button } from "../../components/ui/button";
import { Panel } from "../../components/ui/panel";
import { Pagination } from "../../components/ui/pagination";
import { PageSkeleton } from "../../components/ui/skeleton";
import { EmptyState } from "../../components/ui/empty-state";
import { useAuth } from "../../lib/use-auth";
import { useToast } from "../../components/ui/toast";
import { api, type Repo, type AwsConnection } from "../../lib/api";

const PAGE_SIZE = 10;

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

  useEffect(() => { setPage(0); }, [query]);

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
    const connection = connections[0];
    if (!connection) {
      router.push("/connections");
      return;
    }
    setDeploying(repo.id);
    try {
      const { deploymentId } = await api.triggerDeploy({
        repoId: repo.id,
        branch: repo.defaultBranch,
        awsConnectionId: connection.id
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
  const paginated = useMemo(
    () => filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    [filtered, page]
  );

  if (loading) {
    return (
      <ProductShell active="Repositories">
        <PageSkeleton variant="list" />
      </ProductShell>
    );
  }

  const hasAws = connections.length > 0;

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
                <p className="text-[13px] font-medium text-amber-200">AWS account not connected</p>
                <p className="mt-1 text-[12.5px] leading-[1.55] text-amber-200/75">
                  Deploying requires an IAM role from your AWS account. Connect one to enable the Deploy button on each repository.
                </p>
              </div>
              <Button asChild variant="secondary" className="shrink-0">
                <Link href="/connections">
                  <KeyRound className="h-4 w-4" />
                  Connect AWS
                </Link>
              </Button>
            </div>
          </Panel>
        )}

        <Panel className="p-6">
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
                  className="grid gap-3 py-4 text-[13.5px] md:grid-cols-[1fr_200px]"
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
                  <div className="flex md:justify-end">
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
            page={page}
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
