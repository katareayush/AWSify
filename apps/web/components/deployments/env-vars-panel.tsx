"use client";

import { useMemo, useState } from "react";
import { Check, Eye, EyeOff, KeyRound, Loader2, Save, Trash2 } from "lucide-react";
import { Button } from "../ui/button";
import { Panel } from "../ui/panel";
import { ConfirmDialog } from "../ui/confirm-dialog";
import { useToast } from "../ui/toast";
import { api } from "../../lib/api";

interface DetectedVar {
  name: string;
  required?: boolean;
  description?: string;
}

interface SavedVar {
  name: string;
  valuePreview: string | null;
  required: boolean;
  updatedAt: string;
}

interface EnvVarsPanelProps {
  deploymentId: string;
  detected: DetectedVar[];
  saved: SavedVar[];
  onChange: () => void | Promise<void>;
}

export function EnvVarsPanel({ deploymentId, detected, saved, onChange }: EnvVarsPanelProps) {
  const toast = useToast();
  const [values, setValues] = useState<Record<string, string>>({});
  const [visible, setVisible] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const savedByName = useMemo(() => new Map(saved.map((envVar) => [envVar.name, envVar])), [saved]);

  // Union of detected + already-saved (so a saved var not in latest scan still appears).
  const allNames = useMemo(() => {
    const names = new Set<string>(detected.map((envVar) => envVar.name));
    for (const envVar of saved) names.add(envVar.name);
    return Array.from(names);
  }, [detected, saved]);

  const allVars = useMemo(() => {
    return allNames.map((name) => {
      const det = detected.find((envVar) => envVar.name === name);
      const sav = savedByName.get(name);
      return {
        name,
        required: det?.required ?? sav?.required ?? true,
        description: det?.description,
        saved: sav
      };
    });
  }, [allNames, detected, savedByName]);

  const required = allVars.filter((envVar) => envVar.required);
  const optional = allVars.filter((envVar) => !envVar.required);

  const hasPendingChanges = Object.values(values).some((value) => value.length > 0);
  const missingRequiredCount = required.filter(
    (envVar) => !savedByName.has(envVar.name) && !(values[envVar.name]?.length)
  ).length;

  async function handleSave() {
    if (!hasPendingChanges) return;
    setSaving(true);
    setError(null);
    try {
      const result = await api.saveDeploymentEnv(deploymentId, values);
      setValues({});
      setVisible({});
      toast.success(`Saved ${result.saved.length} env var${result.saved.length === 1 ? "" : "s"}.`);
      await onChange();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save env vars.";
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  async function performDelete(name: string) {
    setDeleting(name);
    setError(null);
    try {
      await api.deleteDeploymentEnv(deploymentId, name);
      setValues((current) => {
        const next = { ...current };
        delete next[name];
        return next;
      });
      toast.success(`Removed ${name}.`);
      await onChange();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to delete env var.";
      setError(msg);
      toast.error(msg);
    } finally {
      setDeleting(null);
      setConfirmDelete(null);
    }
  }

  if (allVars.length === 0) return null;

  return (
    <Panel className="p-5">
      <div className="mb-4 flex items-center gap-2">
        <KeyRound className="h-4 w-4 text-violet-soft" />
        <p className="text-[13px] font-medium text-white">Environment variables</p>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 font-mono text-[10.5px] text-white/55">
            {saved.length}/{allVars.length} saved
          </span>
          {missingRequiredCount > 0 && (
            <span className="rounded-full border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 text-[10.5px] font-medium text-amber-300">
              {missingRequiredCount} missing
            </span>
          )}
        </div>
      </div>

      {required.length > 0 && (
        <Group title="Required" tone="required">
          {required.map((envVar) => (
            <EnvRow
              key={envVar.name}
              envVar={envVar}
              value={values[envVar.name] ?? ""}
              isVisible={!!visible[envVar.name]}
              isDeleting={deleting === envVar.name}
              onChangeValue={(v) => setValues((c) => ({ ...c, [envVar.name]: v }))}
              onToggleVisible={() => setVisible((c) => ({ ...c, [envVar.name]: !c[envVar.name] }))}
              onDelete={envVar.saved ? () => setConfirmDelete(envVar.name) : undefined}
            />
          ))}
        </Group>
      )}

      {optional.length > 0 && (
        <Group title="Optional" tone="optional">
          {optional.map((envVar) => (
            <EnvRow
              key={envVar.name}
              envVar={envVar}
              value={values[envVar.name] ?? ""}
              isVisible={!!visible[envVar.name]}
              isDeleting={deleting === envVar.name}
              onChangeValue={(v) => setValues((c) => ({ ...c, [envVar.name]: v }))}
              onToggleVisible={() => setVisible((c) => ({ ...c, [envVar.name]: !c[envVar.name] }))}
              onDelete={envVar.saved ? () => setConfirmDelete(envVar.name) : undefined}
            />
          ))}
        </Group>
      )}

      {error && (
        <div className="mt-4 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-[12px] text-red-300">
          {error}
        </div>
      )}

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-[11px] text-white/35">
          Blank fields keep their saved value.
        </p>
        <Button
          variant="secondary"
          onClick={handleSave}
          disabled={saving || !hasPendingChanges}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>

      <ConfirmDialog
        open={confirmDelete !== null}
        title={`Remove ${confirmDelete ?? ""}?`}
        description="The saved value will be deleted. The next deploy will fail until you re-save the variable."
        confirmLabel="Remove"
        tone="danger"
        onConfirm={() => (confirmDelete ? performDelete(confirmDelete) : Promise.resolve())}
        onCancel={() => setConfirmDelete(null)}
      />
    </Panel>
  );
}

function Group({ title, tone, children }: { title: string; tone: "required" | "optional"; children: React.ReactNode }) {
  return (
    <div className="mb-4 last:mb-0">
      <p className={`mb-2 text-[11px] uppercase tracking-wider ${tone === "required" ? "text-amber-300/70" : "text-white/40"}`}>
        {title}
      </p>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

interface EnvRowProps {
  envVar: { name: string; required: boolean; description?: string; saved?: SavedVar };
  value: string;
  isVisible: boolean;
  isDeleting: boolean;
  onChangeValue: (value: string) => void;
  onToggleVisible: () => void;
  onDelete?: () => void;
}

function EnvRow({ envVar, value, isVisible, isDeleting, onChangeValue, onToggleVisible, onDelete }: EnvRowProps) {
  const saved = envVar.saved;
  const hint = saved?.valuePreview ? lastChars(saved.valuePreview) : null;
  const inputPaddingRight = onDelete ? "pr-[68px]" : "pr-10";

  return (
    <label className="block rounded-lg border border-white/[0.06] bg-white/[0.015] p-3 transition-colors focus-within:border-white/[0.12]">
      <div className="flex items-center justify-between gap-3">
        <span className="truncate font-mono text-[12.5px] text-white">{envVar.name}</span>
        {saved ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[10.5px] font-medium text-emerald-300">
            <Check className="h-3 w-3" />
            Saved
          </span>
        ) : envVar.required ? (
          <span className="shrink-0 rounded-full border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 text-[10.5px] font-medium text-amber-300">
            Required
          </span>
        ) : (
          <span className="shrink-0 rounded-full border border-white/[0.08] bg-white/[0.02] px-2 py-0.5 text-[10.5px] text-white/45">
            Optional
          </span>
        )}
      </div>

      {hint && (
        <p className="mt-1 font-mono text-[10.5px] text-white/35">
          Current value ends in <span className="text-white/55">{hint}</span>
        </p>
      )}

      <div className="relative mt-2 flex items-center">
        <input
          value={value}
          onChange={(event) => onChangeValue(event.target.value)}
          type={isVisible ? "text" : "password"}
          autoComplete="off"
          spellCheck={false}
          placeholder={saved ? "Update value…" : "Paste value"}
          className={`h-9 w-full rounded-md border border-white/[0.08] bg-white/[0.03] pl-3 ${inputPaddingRight} font-mono text-[12px] text-white outline-none placeholder:text-white/25 focus:border-violet/40`}
        />
        <button
          type="button"
          onClick={onToggleVisible}
          className={`absolute ${onDelete ? "right-10" : "right-1.5"} flex h-7 w-7 items-center justify-center rounded text-white/40 hover:bg-white/[0.05] hover:text-white/80`}
          aria-label={isVisible ? "Hide value" : "Show value"}
          tabIndex={-1}
        >
          {isVisible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </button>
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            disabled={isDeleting}
            className="absolute right-1.5 flex h-7 w-7 items-center justify-center rounded text-white/40 hover:bg-red-500/10 hover:text-red-300 disabled:opacity-40"
            aria-label={`Delete ${envVar.name}`}
            tabIndex={-1}
          >
            {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>

      {envVar.description && (
        <p className="mt-2 text-[11px] leading-[1.5] text-white/40">{envVar.description}</p>
      )}
    </label>
  );
}

function lastChars(preview: string): string | null {
  const match = preview.match(/[^*•·\s]+$/);
  return match ? match[0] : null;
}
