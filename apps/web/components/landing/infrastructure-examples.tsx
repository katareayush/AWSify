import { Section } from "./primitives/section";
import { CodeBlock } from "./primitives/code-block";
import { ArchitectureDiagram } from "./architecture-diagram";
import { ResourceList } from "./resource-list";
import { serviceCode, workflowCode } from "./data";

export function InfrastructureExamples() {
  return (
    <Section
      id="examples"
      eyebrow="Generated output"
      title="Real infrastructure, not pseudocode."
      sub="Every plan produces a Dockerfile, a deployment workflow, and a Pulumi stack, auditable and versioned in your repo."
    >
      <div className="mt-16 grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <CodeBlock file="infra/service.ts" language="typescript" code={serviceCode} />
        </div>
        <div className="lg:col-span-2">
          <ArchitectureDiagram />
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <ResourceList />
        </div>
        <div className="lg:col-span-3">
          <CodeBlock file=".github/workflows/deploy.yml" language="yaml" code={workflowCode} />
        </div>
      </div>
    </Section>
  );
}
