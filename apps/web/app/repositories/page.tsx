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

        <Panel className="p-5">
          <div className="flex h-10 items-center gap-2 rounded-md border border-border bg-background px-3 text-sm text-muted-foreground">
            <Search className="h-4 w-4" />
            Search repositories
          </div>

          <div className="mt-4 divide-y divide-border">
            {repos.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-sm font-medium">No repositories connected</p>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                  Install the GitHub App to list repositories here. AWS-ify will show supported stacks after the repo metadata sync runs.
                </p>
                <Button className="mt-4" variant="secondary">
                  <Github className="h-4 w-4" />
                  Install GitHub App
                </Button>
              </div>
            ) : (
              repos.map((repo) => (
                <div key={repo.id} className="grid gap-3 py-4 text-sm md:grid-cols-[1fr_150px_130px_130px]">
                  <div>
                    <p className="font-medium">{repo.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Default branch: {repo.branch}</p>
                  </div>
                  <p className="text-muted-foreground">{repo.stack}</p>
                  <div>
                    <span className={`rounded-md px-2 py-1 text-xs ${repo.status === "Supported" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
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

        <Panel className="p-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
            <p className="text-sm text-muted-foreground">Repo access should come from the GitHub App installation, not broad personal OAuth scopes.</p>
          </div>
        </Panel>
      </div>
    </ProductShell>
  );
}
