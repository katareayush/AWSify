"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Boxes } from "lucide-react";
import { PageHeading } from "../../components/page-heading";
import { ProductShell } from "../../components/product-shell";
import { Button } from "../../components/ui/button";
import { EmptyState } from "../../components/ui/empty-state";
import { PageSkeleton } from "../../components/ui/skeleton";
import { ResourceGroupCard } from "../../components/resources/resource-group-card";
import { useAuth } from "../../lib/use-auth";
import { useToast } from "../../components/ui/toast";
import { api, type ResourceGroup } from "../../lib/api";

export default function ResourcesPage() {
  const { me, loading } = useAuth();
  const toast = useToast();
  const [groups, setGroups] = useState<ResourceGroup[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!me?.authenticated) {
      setDataLoading(false);
      return;
    }
    api.listResources()
      .then((r) => setGroups(r.groups))
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : "Could not load resources.");
      })
      .finally(() => setDataLoading(false));
  }, [loading, me?.authenticated, toast]);

  function handleTornDown(deploymentId: string) {
    // Teardown is queued; drop it from the active-resources view immediately.
    setGroups((current) => current.filter((group) => group.deploymentId !== deploymentId));
  }

  if (loading || dataLoading) {
    return (
      <ProductShell active="Resources">
        <PageSkeleton variant="list" />
      </ProductShell>
    );
  }

  const totalResources = groups.reduce((sum, group) => sum + group.resources.length, 0);

  return (
    <ProductShell active="Resources">
      <div className="space-y-5">
        <PageHeading
          eyebrow="Resources"
          title="AWS resources"
          description={
            groups.length > 0
              ? `${totalResources} resources across ${groups.length} deployment${groups.length === 1 ? "" : "s"}. Tear down a deployment's stack to remove its AWS resources.`
              : "Every deployed stack's AWS resources appear here, grouped by deployment, and can be torn down."
          }
        />

        {groups.length === 0 ? (
          <EmptyState
            icon={Boxes}
            title="No AWS resources yet"
            description="Once a deployment provisions infrastructure, its AWS resources show up here so you can review and tear them down."
            action={
              <Button asChild variant="secondary">
                <Link href="/deployments">
                  View deployments
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            }
          />
        ) : (
          <div className="space-y-4">
            {groups.map((group) => (
              <ResourceGroupCard key={group.deploymentId} group={group} onTornDown={handleTornDown} />
            ))}
          </div>
        )}
      </div>
    </ProductShell>
  );
}
