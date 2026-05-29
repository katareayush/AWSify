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
        <Panel className="p-6">
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-violet-soft" />
            <p className="text-[14px] font-medium tracking-tight text-white">Planned settings</p>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <SettingRow label="AWS region" value="not configured" />
            <SettingRow label="AI provider" value="Anthropic required" />
            <SettingRow label="Approval mode" value="always required" />
            <SettingRow label="Deployment target" value="not configured" />
          </div>
        </Panel>
      </div>
    </ProductShell>
  );
}

function SettingRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.015] px-4 py-3">
      <span className="font-mono text-[11px] uppercase tracking-wider text-white/45">{label}</span>
      <span className="text-[13px] text-white/75">{value}</span>
    </div>
  );
}
