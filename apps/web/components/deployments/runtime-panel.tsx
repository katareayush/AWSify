"use client";

import { useEffect, useState } from "react";
import { HeartPulse, Loader2, Save } from "lucide-react";
import { Button } from "../ui/button";
import { Panel } from "../ui/panel";
import { useToast } from "../ui/toast";
import { api } from "../../lib/api";

interface RuntimePanelProps {
  deploymentId: string;
  initialPort: string;
  initialHealthPath: string;
  editable: boolean;
  planSignature?: string;
  onSaved: () => void | Promise<void>;
}

export function RuntimePanel({
  deploymentId,
  initialPort,
  initialHealthPath,
  editable,
  planSignature,
  onSaved
}: RuntimePanelProps) {
  const toast = useToast();
  const [port, setPort] = useState(initialPort);
  const [healthPath, setHealthPath] = useState(initialHealthPath);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setPort(initialPort);
    setHealthPath(initialHealthPath);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planSignature]);

  async function save() {
    const parsedPort = Number(port);
    if (!Number.isInteger(parsedPort) || parsedPort < 1 || parsedPort > 65535 || !healthPath.startsWith("/")) {
      toast.error("Enter a port from 1 to 65535 and a health path starting with /.");
      return;
    }
    setSaving(true);
    try {
      await api.saveDeploymentRuntime(deploymentId, {
        port: parsedPort,
        healthPath: healthPath || "/"
      });
      await onSaved();
      toast.success("Runtime settings saved.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save runtime settings.");
    } finally {
      setSaving(false);
    }
  }

  const parsedPort = Number(port);
  const portValid = Number.isInteger(parsedPort) && parsedPort >= 1 && parsedPort <= 65535;
  const healthPathValid = healthPath.startsWith("/");
  const canSave = editable && portValid && healthPathValid;

  return (
    <Panel className="p-5">
      <div className="mb-3 flex items-center gap-2">
        <HeartPulse className="h-4 w-4 text-violet-soft" />
        <p className="text-[13px] font-medium text-white">Runtime</p>
        {!editable && (
          <span className="ml-auto rounded-full border border-white/[0.08] bg-white/[0.02] px-2 py-0.5 text-[10.5px] text-white/45">
            locked
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Container port">
          <input
            value={port}
            onChange={(e) => setPort(e.target.value)}
            inputMode="numeric"
            pattern="[0-9]*"
            disabled={!editable}
            placeholder="3000"
            className="h-9 w-full rounded-md border border-white/[0.08] bg-white/[0.03] px-3 font-mono text-[12px] text-white outline-none placeholder:text-white/25 focus:border-violet/40 disabled:opacity-60"
          />
        </Field>
        <Field label="Health path">
          <input
            value={healthPath}
            onChange={(e) => setHealthPath(e.target.value)}
            placeholder="/"
            disabled={!editable}
            className="h-9 w-full rounded-md border border-white/[0.08] bg-white/[0.03] px-3 font-mono text-[12px] text-white outline-none placeholder:text-white/25 focus:border-violet/40 disabled:opacity-60"
          />
        </Field>
      </div>
      {editable && (!portValid || !healthPathValid) && (
        <p className="mt-2 text-[11px] leading-[1.5] text-amber-300/80">
          Port must be 1-65535 and health path must start with /.
        </p>
      )}
      {editable && (
        <Button
          className="mt-3 w-full"
          variant="secondary"
          onClick={save}
          disabled={saving || !canSave}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save runtime
        </Button>
      )}
    </Panel>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-white/40">{label}</span>
      {children}
    </label>
  );
}
