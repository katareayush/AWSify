import { ArrowRight, CheckCircle2, Github, Search } from "lucide-react";
import { PageHeading } from "../../components/page-heading";
import { ProductShell } from "../../components/product-shell";
import { Button } from "../../components/ui/button";
import { Panel } from "../../components/ui/panel";

const repos: Array<{ id: string; name: string; branch: string; stack: string; status: string }> = [];

export default function RepositoriesPage() {
  return (
    <ProductShell active="Repositories">
      <div className="space-y-5">
        <PageHeading
          eyebrow="Repository selection"
          title="Choose what AWS-ify should scan"
          description="The MVP supports Node.js backends and Next.js apps. Unsupported stacks stay visible but cannot be deployed yet."
          action={
            <Button variant="secondary">
              <Github className="h-4 w-4" />
              Manage GitHub App
            </Button>
          }
        />

        <Panel className="p-6">
          <div className="flex h-10 items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 text-[13px] text-white/45">
            <Search className="h-3.5 w-3.5" />
            Search repositories
          </div>

          <div className="mt-5 divide-y divide-white/[0.05]">
            {repos.length === 0 ? (
              <div className="py-14 text-center">
                <p className="text-[14px] font-medium text-white">No repositories connected</p>
                <p className="mx-auto mt-2 max-w-md text-[13px] leading-[1.6] text-white/55">
                  Install the GitHub App to list repositories here. AWS-ify will show supported stacks after the repo metadata sync runs.
                </p>
                <Button className="mt-5" variant="secondary">
                  <Github className="h-4 w-4" />
                  Install GitHub App
                </Button>
              </div>
            ) : (
              repos.map((repo) => (
                <div
                  key={repo.id}
                  className="grid gap-3 py-4 text-[13.5px] md:grid-cols-[1fr_150px_130px_130px]"
                >
                  <div>
                    <p className="font-medium text-white">{repo.name}</p>
                    <p className="mt-1 font-mono text-[11px] text-white/45">
                      Default branch: {repo.branch}
                    </p>
                  </div>
                  <p className="text-white/55">{repo.stack}</p>
                  <div>
                    <span
                      className={`rounded-full border px-2.5 py-1 text-[11px] ${
                        repo.status === "Supported"
                          ? "border-violet/30 bg-violet/10 text-violet-soft"
                          : "border-white/[0.08] bg-white/[0.04] text-white/55"
                      }`}
                    >
                      {repo.status}
                    </span>
                  </div>
                  <div className="flex md:justify-end">
                    <Button variant="secondary" disabled={repo.status !== "Supported"}>
                      Scan
                      {repo.status === "Supported" ? <ArrowRight className="h-4 w-4" /> : null}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Panel>

        <Panel className="p-5">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-violet-soft" />
            <p className="text-[13px] leading-[1.6] text-white/55">
              Repo access should come from the GitHub App installation, not broad personal OAuth scopes.
            </p>
          </div>
        </Panel>
      </div>
    </ProductShell>
  );
}
