"use client";

import { Background, Controls, ReactFlow, type Edge, type Node } from "@xyflow/react";

const nodes: Node[] = [
  { id: "github", position: { x: 0, y: 90 }, data: { label: "GitHub repo" }, type: "input" },
  { id: "worker", position: { x: 210, y: 90 }, data: { label: "AWS-ify worker" } },
  { id: "ecr", position: { x: 430, y: 10 }, data: { label: "ECR image" } },
  { id: "ecs", position: { x: 430, y: 100 }, data: { label: "ECS Fargate" } },
  { id: "alb", position: { x: 660, y: 100 }, data: { label: "Public ALB URL" }, type: "output" },
  { id: "logs", position: { x: 430, y: 190 }, data: { label: "CloudWatch logs" } }
];

const edges: Edge[] = [
  { id: "github-worker", source: "github", target: "worker" },
  { id: "worker-ecr", source: "worker", target: "ecr" },
  { id: "ecr-ecs", source: "ecr", target: "ecs" },
  { id: "ecs-alb", source: "ecs", target: "alb" },
  { id: "ecs-logs", source: "ecs", target: "logs" }
];

export function InfraDiagram() {
  return (
    <div className="h-[300px] w-full overflow-hidden rounded-md border border-border bg-background">
      <ReactFlow nodes={nodes} edges={edges} fitView nodesDraggable={false} nodesConnectable={false} panOnScroll>
        <Background />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
