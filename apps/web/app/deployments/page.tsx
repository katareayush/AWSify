import Link from "next/link";
import { ArrowRight, FileCode2, ListChecks } from "lucide-react";
import { PageHeading } from "../../components/page-heading";
import { ProductShell } from "../../components/product-shell";
import { Button } from "../../components/ui/button";
import { Panel } from "../../components/ui/panel";

const deploymentPlans: Array<{ id: string; name: string; repository: string; status: string }> = [];

export default function DeploymentsPage() {
  return (
    <ProductShell active="Templates">
      <div className="space-y-5">
        <PageHeading
          eyebrow="Templates"
          title="Generated deployment plans"
          description="Approved plans will show generated Dockerfiles, GitHub Actions, Pulumi previews, resources, costs, and deployment state."
        />

        <Panel className="p-5">
          {deploymentPlans.length === 0 ? (
            <div className="py-14 text-center">
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03]">
                <FileCode2 className="h-5 w-5 text-violet-soft" />
              </div>
              <p className="mt-5 text-[14px] font-medium text-white">No generated plans yet</p>
              <p className="mx-auto mt-2 max-w-md text-[13px] leading-[1.6] text-white/55">
                Select a connected repository and run a scan. AWS-ify will create a reviewed plan before any AWS resources are created.
              </p>
              <Link href="/repositories" className="mt-5 inline-flex">
                <Button variant="secondary">
                  Choose repository
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          ) : null}
        </Panel>

        <Panel className="p-5">
          <div className="flex items-start gap-3">
            <ListChecks className="mt-0.5 h-4 w-4 shrink-0 text-violet-soft" />
            <p className="text-[13px] leading-[1.6] text-white/55">
              Plan detail pages render from persisted deployment-plan data after the API is wired.
            </p>
          </div>
        </Panel>
      </div>
    </ProductShell>
  );
}
