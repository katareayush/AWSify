import { Settings } from "lucide-react";
import { PageHeading } from "../../components/page-heading";
import { ProductShell } from "../../components/product-shell";
import { Panel } from "../../components/ui/panel";

export default function SettingsPage() {
  return (
    <ProductShell active="Settings">
      <div className="space-y-5">
        <PageHeading
          eyebrow="Workspace"
          title="Settings"
          description="Workspace-level defaults for regions, approval policy, AI provider, and deployment notifications will live here."
        />
        <Panel className="p-5">
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold">Planned settings</p>
          </div>
          <div className="mt-4 grid gap-3 text-sm text-muted-foreground md:grid-cols-2">
            <p>Default AWS region: us-east-1</p>
            <p>AI provider: Claude with deterministic fallback</p>
            <p>Approval mode: always required</p>
            <p>Deployment target: ECS Fargate MVP</p>
          </div>
        </Panel>
      </div>
    </ProductShell>
  );
}
