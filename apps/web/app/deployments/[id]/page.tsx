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

        <Panel className="p-12 text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-md border border-border bg-background">
            <FileCode2 className="h-5 w-5 text-primary" />
          </div>
          <p className="mt-4 text-sm font-medium">No plan payload available</p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
            Once backend persistence is connected, this page will render the selected plan, generated artifacts, infra graph, env vars, and approval controls from the API.
          </p>
        </Panel>
      </div>
    </ProductShell>
  );
}
