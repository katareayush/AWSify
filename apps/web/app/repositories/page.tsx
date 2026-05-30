"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Github, Loader2, Search } from "lucide-react";
import { PageHeading } from "../../components/page-heading";
import { ProductShell } from "../../components/product-shell";
import { Button } from "../../components/ui/button";
import { Panel } from "../../components/ui/panel";
import { useAuth } from "../../lib/use-auth";
import { api, type Repo, type AwsConnection } from "../../lib/api";

export default function RepositoriesPage() {
  const { me, loading } = useAuth();
  const router = useRouter();
  const [repos, setRepos] = useState<Repo[]>([]);
  const [connections, setConnections] = useState<AwsConnection[]>([]);
  const [query, setQuery] = useState("");
  const [deploying, setDeploying] = useState<string | null>(null);
  const [reposLoading, setReposLoading] = useState(true);

  useEffect(() => {
    if (!me?.authenticated) return;
    Promise.all([
      api.repositories().then(r => setRepos(r.repositories)),
      api.listConnections().then(r => setConnections(r.connections))
    ]).finally(() => setReposLoading(false));
  }, [me?.authenticated]);

  async function handleInstallApp() {
    try {
      const { url } = await api.appInstallUrl();
      window.location.href = url;
    } catch { /* ignore */ }
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
      router.push(`/deployments/${deploymentId}`);
    } catch (err) {
      alert(`Failed to trigger deployment: ${err instanceof Error ? err.message : String(err)}`);
      setDeploying(null);
    }
  }

  if (loading) return null;

  const filtered = repos.filter(r =>
    r.fullName.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <ProductShell active="Repositories">
      <div className="space-y-5">
        <PageHeading
          eyebrow="Repository selection"
          title="Choose what AWS-ify should deploy"
          description={
            connections.length === 0
              ? "Connect an AWS account first, then select a repository to deploy."
              : "Select a repository — AWS-ify will scan, plan, and deploy it to your AWS account."
          }
          action={
            <Button variant="secondary" onClick={handleInstallApp}>
              <Github className="h-4 w-4" />
              Manage GitHub App
            </Button>
          }
        />

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
              <div className="py-14 text-center">
                <p className="text-[14px] font-medium text-white">
                  {repos.length === 0 ? "No repositories connected" : "No results"}
                </p>
                <p className="mx-auto mt-2 max-w-md text-[13px] leading-[1.6] text-white/55">
                  {repos.length === 0
                    ? "Install the GitHub App to list repositories here."
                    : "Try a different search term."}
                </p>
                {repos.length === 0 && (
                  <Button className="mt-5" variant="secondary" onClick={handleInstallApp}>
                    <Github className="h-4 w-4" />
                    Install GitHub App
                  </Button>
                )}
              </div>
            ) : (
              filtered.map(repo => (
                <div
                  key={repo.id}
                  className="grid gap-3 py-4 text-[13.5px] md:grid-cols-[1fr_100px_130px]"
                >
                  <div>
                    <p className="font-medium text-white">{repo.fullName}</p>
                    <p className="mt-1 font-mono text-[11px] text-white/45">
                      Default branch: {repo.defaultBranch}
                      {repo.private ? " · private" : ""}
                    </p>
                  </div>
                  <div className="flex items-center">
                    <span className="rounded-full border border-violet/30 bg-violet/10 px-2.5 py-1 text-[11px] text-violet-soft">
                      Supported
                    </span>
                  </div>
                  <div className="flex md:justify-end">
                    <Button
                      variant="secondary"
                      disabled={deploying === repo.id || connections.length === 0}
                      onClick={() => handleDeploy(repo)}
                    >
                      {deploying === repo.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <>Deploy <ArrowRight className="h-4 w-4" /></>
                      )}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Panel>

        {connections.length === 0 && repos.length > 0 && (
          <Panel className="p-5">
            <p className="text-[13px] text-amber-400/80">
              No AWS connection found — <a href="/connections" className="underline">connect an AWS account</a> before deploying.
            </p>
          </Panel>
        )}
      </div>
    </ProductShell>
  );
}
