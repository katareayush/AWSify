import Link from "next/link";
import { ArrowLeft, FileCode2 } from "lucide-react";
import { PageHeading } from "../../../components/page-heading";
import { ProductShell } from "../../../components/product-shell";
import { Button } from "../../../components/ui/button";
import { Panel } from "../../../components/ui/panel";

export default function DeploymentPlanPage() {
  return (
    <ProductShell active="Deployments">
      <div className="space-y-5">
        <PageHeading
          eyebrow="Deployment plan"
          title="Plan data not loaded"
          description="This route is ready for persisted deployment-plan data. Until the API is wired, AWS-ify does not render fake repository, AWS, cost, or resource details."
          action={
            <Link href="/deployments">
              <Button variant="secondary">
                <ArrowLeft className="h-4 w-4" />
                Back to plans
              </Button>
            </Link>
          }
        />

        <Panel className="p-14 text-center">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03]">
            <FileCode2 className="h-5 w-5 text-violet-soft" />
          </div>
          <p className="mt-5 text-[14px] font-medium text-white">No plan payload available</p>
          <p className="mx-auto mt-2 max-w-lg text-[13px] leading-[1.6] text-white/55">
            Once backend persistence is connected, this page will render the selected plan,
            generated artifacts, infra graph, env vars, and approval controls from the API.
          </p>
        </Panel>
      </div>
    </ProductShell>
  );
}
