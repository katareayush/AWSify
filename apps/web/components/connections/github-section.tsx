"use client";

import { Github } from "lucide-react";
import { Button } from "../ui/button";
import { api } from "../../lib/api";
import { Section } from "./section";

interface GithubSectionProps {
  authenticated: boolean;
  login?: string | null;
}

export function GithubSection({ authenticated, login }: GithubSectionProps) {
  async function handleConnect() {
    try {
      const { url } = await api.loginUrl();
      window.location.href = url;
    } catch {
      window.location.href = "/";
    }
  }

  return (
    <Section
      icon={<Github className="h-4 w-4 text-white/55" />}
      title="GitHub"
      status={authenticated ? "Connected" : "Not connected"}
      statusTone={authenticated ? "ok" : "muted"}
    >
      {authenticated ? (
        <p className="text-[13px] text-white/55">
          Signed in as <span className="text-white/80">@{login}</span>
        </p>
      ) : (
        <Button variant="secondary" onClick={handleConnect}>
          <Github className="h-4 w-4" />
          Connect GitHub
        </Button>
      )}
    </Section>
  );
}
