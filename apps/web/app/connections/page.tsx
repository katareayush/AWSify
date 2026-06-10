"use client";

import { PageHeading } from "../../components/page-heading";
import { ProductShell } from "../../components/product-shell";
import { PageSkeleton } from "../../components/ui/skeleton";
import { useAuth } from "../../lib/use-auth";
import { GithubSection } from "../../components/connections/github-section";
import { AwsSection } from "../../components/connections/aws-section";

export default function ConnectionsPage() {
  const { me, loading } = useAuth();

  if (loading) {
    return (
      <ProductShell active="Connections">
        <PageSkeleton />
      </ProductShell>
    );
  }

  return (
    <ProductShell active="Connections">
      <div className="space-y-6">
        <PageHeading
          eyebrow="Integrations"
          title="Connections"
          description="Link GitHub for repository access and an AWS IAM role for deployments. Both are required before the first deploy."
        />

        <GithubSection authenticated={!!me?.authenticated} login={me?.githubLogin} />

        {me?.authenticated && <AwsSection />}

        <p className="text-[12px] leading-[1.6] text-white/40">
          The IAM role grants only the permissions required for the ECS Fargate deployment path: ECR images, ECS services, an ALB, CloudWatch logs, and the scoped task roles.
        </p>
      </div>
    </ProductShell>
  );
}
