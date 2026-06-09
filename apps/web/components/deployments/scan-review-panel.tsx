"use client";

import { useEffect, useMemo, useState } from "react";
import type * as React from "react";
import { BrainCircuit, Loader2, Save, SlidersHorizontal } from "lucide-react";
import { api } from "../../lib/api";
import { Button } from "../ui/button";
import { Panel } from "../ui/panel";
import { useToast } from "../ui/toast";

const APP_TYPES = [
  "node-backend",
  "nextjs-app",
  "static-spa",
  "python-backend",
  "go-backend",
  "ruby-backend",
  "java-backend",
  "rust-backend",
  "php-backend"
];

const PACKAGE_MANAGERS = ["npm", "pnpm", "yarn", "bun"];

interface ScanReviewPanelProps {
  deploymentId: string;
  suggestion: Record<string, unknown>;
  editable: boolean;
  planReady: boolean;
  planSignature?: string;
  envVarCount: number;
  onSaved: () => void | Promise<void>;
}

export function ScanReviewPanel({
  deploymentId,
  suggestion,
  editable,
  planReady,
  planSignature,
  envVarCount,
  onSaved
}: ScanReviewPanelProps) {
  const toast = useToast();
  const initial = useMemo(() => readSuggestion(suggestion), [suggestion]);
  const [draft, setDraft] = useState(initial);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(initial);
  }, [initial, planSignature]);

  const parsedPort = Number(draft.port);
  const portValid = Number.isInteger(parsedPort) && parsedPort >= 1 && parsedPort <= 65535;
  const healthPathValid = draft.healthPath.startsWith("/");
  const commandsValid = draft.buildCommand.trim().length > 0 && draft.startCommand.trim().length > 0 && draft.installCommand.trim().length > 0;
  const canSave = editable && portValid && healthPathValid && commandsValid;
  const confidence = Math.max(0, Math.min(1, Number(suggestion.confidence ?? 0)));

  async function save() {
    if (!canSave) {
      toast.error("Check commands, port, and health path before saving.");
      return;
    }
    setSaving(true);
    try {
      await api.saveDeploymentScanReview(deploymentId, {
        appType: draft.appType,
        packageManager: draft.packageManager,
        buildCommand: draft.buildCommand.trim(),
        startCommand: draft.startCommand.trim(),
        installCommand: draft.installCommand.trim(),
        port: parsedPort,
        healthPath: draft.healthPath.trim() || "/"
      });
      await onSaved();
      toast.success("Scan review saved and plan preview regenerated.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save scan review.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Panel className="p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <BrainCircuit className="h-4 w-4 text-violet-soft" />
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-white">Scan review</p>
            <p className="mt-0.5 text-[11.5px] text-white/40">
              {planReady
                ? "These settings drive the generated plan and preview artifacts."
                : "Confirm what AWSify detected before it creates the plan."}
            </p>
          </div>
        </div>
        <div className="shrink-0 rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 font-mono text-[11px] text-white/60">
          {Math.round(confidence * 100)}% confidence
        </div>
      </div>

      <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
        <div className="h-full rounded-full bg-violet-soft" style={{ width: `${Math.round(confidence * 100)}%` }} />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Framework">
          <select
            value={draft.appType}
            onChange={(event) => setDraft((current) => ({ ...current, appType: event.target.value }))}
            disabled={!editable}
            className={inputClass}
          >
            {APP_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
        </Field>
        <Field label="Package manager">
          <select
            value={draft.packageManager}
            onChange={(event) => setDraft((current) => ({ ...current, packageManager: event.target.value }))}
            disabled={!editable}
            className={inputClass}
          >
            {PACKAGE_MANAGERS.map((manager) => <option key={manager} value={manager}>{manager}</option>)}
          </select>
        </Field>
        <Field label="Port">
          <input
            value={draft.port}
            onChange={(event) => setDraft((current) => ({ ...current, port: event.target.value }))}
            disabled={!editable}
            inputMode="numeric"
            className={inputClass}
          />
        </Field>
        <Field label="Health path">
          <input
            value={draft.healthPath}
            onChange={(event) => setDraft((current) => ({ ...current, healthPath: event.target.value }))}
            disabled={!editable}
            className={inputClass}
          />
        </Field>
      </div>

      <div className="mt-3 grid gap-3">
        <Field label="Install command">
          <input value={draft.installCommand} onChange={(event) => setDraft((current) => ({ ...current, installCommand: event.target.value }))} disabled={!editable} className={inputClass} />
        </Field>
        <Field label="Build command">
          <input value={draft.buildCommand} onChange={(event) => setDraft((current) => ({ ...current, buildCommand: event.target.value }))} disabled={!editable} className={inputClass} />
        </Field>
        <Field label="Start command">
          <input value={draft.startCommand} onChange={(event) => setDraft((current) => ({ ...current, startCommand: event.target.value }))} disabled={!editable} className={inputClass} />
        </Field>
      </div>

      <div className="mt-4 flex flex-col gap-3 border-t border-white/[0.06] pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <Pill label="Env vars" value={String(envVarCount)} />
          <Pill label="Dockerfile" value={suggestion.hasDockerfile ? "detected" : "generated"} />
        </div>
        {editable && (
          <Button variant="secondary" onClick={save} disabled={saving || !canSave}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {planReady ? "Save corrections" : "Create plan preview"}
          </Button>
        )}
      </div>

      {editable && (!portValid || !healthPathValid || !commandsValid) && (
        <p className="mt-3 flex items-center gap-1.5 text-[11px] text-amber-300/85">
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Commands cannot be blank, port must be 1-65535, and health path must start with /.
        </p>
      )}
    </Panel>
  );
}

function readSuggestion(suggestion: Record<string, unknown>) {
  return {
    appType: String(suggestion.appType ?? "node-backend"),
    packageManager: String(suggestion.packageManager ?? "npm"),
    installCommand: String(suggestion.installCommand ?? "npm install"),
    buildCommand: String(suggestion.buildCommand ?? "npm run build"),
    startCommand: String(suggestion.startCommand ?? "npm start"),
    port: String(suggestion.port ?? "3000"),
    healthPath: String(suggestion.healthPath ?? "/")
  };
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-white/40">{label}</span>
      {children}
    </label>
  );
}

function Pill({ label, value }: { label: string; value: string }) {
  return (
    <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[11px] text-white/55">
      {label}: <span className="font-mono text-white/75">{value}</span>
    </span>
  );
}

const inputClass = "h-9 w-full rounded-md border border-white/[0.08] bg-white/[0.03] px-3 font-mono text-[12px] text-white outline-none placeholder:text-white/25 focus:border-violet/40 disabled:opacity-60";
