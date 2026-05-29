import Link from "next/link";
import { ArrowRight, Cloud, Github, KeyRound, ShieldCheck, TerminalSquare } from "lucide-react";
import { PageHeading } from "../../components/page-heading";
import { ProductShell } from "../../components/product-shell";
import { SetupStep } from "../../components/setup-step";
import { Button } from "../../components/ui/button";
import { Panel } from "../../components/ui/panel";

const deployments: Array<{ id: string; name: string; repo: string; status: string; target: string; updated: string }> = [];

export default function Home() {
  return (
    <ProductShell active="Deployments">
      <div className="space-y-5">
        <PageHeading
          eyebrow="Control plane"
          title="Deployments"
          description="Connect GitHub and AWS, then select a repository to create the first reviewed deployment plan."
          action={
            <>
              <Button variant="secondary">
                <Github className="h-4 w-4" />
                Connect GitHub
              </Button>
              <Link href="/repositories">
                <Button>
                  New deployment
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </>
          }
        />

        <div className="grid gap-3 md:grid-cols-4">
          <Metric icon={Github} label="Repos connected" value="0" />
          <Metric icon={KeyRound} label="AWS accounts" value="0" />
          <Metric icon={TerminalSquare} label="Plans awaiting approval" value="0" />
          <Metric icon={Cloud} label="Live services" value="0" />
        </div>

        <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
          <Panel className="p-6">
            <div className="flex items-center justify-between">
              <p className="text-[14px] font-medium tracking-tight text-white">Recent deployment plans</p>
              <span className="font-mono text-[10.5px] uppercase tracking-wider text-white/35">
                MVP workspace
              </span>
            </div>
            <div className="mt-5 divide-y divide-white/[0.05]">
              {deployments.length === 0 ? (
                <div className="py-14 text-center">
                  <p className="text-[14px] font-medium text-white">No deployment plans yet</p>
                  <p className="mx-auto mt-2 max-w-md text-[13px] leading-[1.6] text-white/55">
                    After GitHub and AWS are connected, selected repositories will appear here as reviewed deployment plans.
                  </p>
                  <Link href="/repositories" className="mt-5 inline-flex">
                    <Button variant="secondary">
                      Select repository
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              ) : (
                deployments.map((deployment) => (
                  <Link
                    key={deployment.id}
                    href={`/deployments/${deployment.id}`}
                    className="grid gap-3 py-4 text-[13.5px] transition-colors hover:bg-white/[0.02] sm:grid-cols-[1fr_150px_130px]"
                  >
                    <div>
                      <p className="font-medium text-white">{deployment.name}</p>
                      <p className="mt-1 font-mono text-[11px] text-white/45">{deployment.repo}</p>
                    </div>
                    <div>
                      <p className="text-white/70">{deployment.target}</p>
                      <p className="mt-1 font-mono text-[11px] text-white/45">{deployment.updated}</p>
                    </div>
                    <div className="flex items-center sm:justify-end">
                      <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-[11px] text-white/65">
                        {deployment.status}
                      </span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </Panel>

          <div className="space-y-3">
            <SetupStep
              icon={Github}
              title="Connect GitHub"
              description="Install the GitHub App and select repositories AWS-ify can scan."
              state="pending"
            />
            <SetupStep
              icon={KeyRound}
              title="Connect AWS"
              description="Create the CloudFormation role and validate the returned ARN."
              state="pending"
            />
            <SetupStep
              icon={ShieldCheck}
              title="Approve first plan"
              description="Review generated files, cost range, and resources before deployment."
              state="pending"
            />
          </div>
        </div>
      </div>
    </ProductShell>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof Github; label: string; value: string }) {
  return (
    <Panel className="p-5">
      <div className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-violet-soft" />
        <p className="font-mono text-[10.5px] uppercase tracking-wider text-white/45">{label}</p>
      </div>
      <p className="mt-4 font-mono text-[28px] font-medium tracking-tight text-white">{value}</p>
    </Panel>
  );
}
