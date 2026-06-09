"use client";

import { useMemo } from "react";
import { Background, Controls, Handle, MarkerType, Position, ReactFlow, type Edge, type Node, type NodeProps } from "@xyflow/react";
import { Boxes, Cloud, Container, Database, HardDrive, KeyRound, RadioTower, ServerCog } from "lucide-react";
import { Panel } from "../ui/panel";

interface Resource {
  type: string;
  name: string;
  purpose: string;
}

interface InfrastructureGraphProps {
  resources?: Resource[];
  suggestion?: Record<string, unknown> | null;
}

type InfraNodeData = {
  label: string;
  sub: string;
  tone: "core" | "network" | "storage" | "observability" | "security" | "future";
  icon: "alb" | "ecs" | "ecr" | "logs" | "iam" | "rds" | "redis";
};

const nodeTypes = { infra: InfraNode };

export function InfrastructureGraph({ resources = [], suggestion }: InfrastructureGraphProps) {
  const hasPlan = resources.length > 0 || !!suggestion;
  const database = readRequired(suggestion?.database);
  const cache = readRequired(suggestion?.cache);
  const resourceByType = useMemo(() => new Map(resources.map((resource) => [resource.type, resource])), [resources]);

  const nodes = useMemo<Node<InfraNodeData>[]>(() => {
    const base: Node<InfraNodeData>[] = [
      node("alb", "ALB", resourceByType.get("elasticloadbalancingv2.loadBalancer")?.name ?? "Application Load Balancer", "Public HTTP entrypoint", "alb", "network", 40, 86),
      node("ecs", "ECS Fargate", resourceByType.get("ecs.service")?.name ?? "Service + tasks", "Runs the approved container", "ecs", "core", 300, 86),
      node("ecr", "ECR", resourceByType.get("ecr.repository")?.name ?? "Container repository", "Stores built images", "ecr", "storage", 300, 238),
      node("logs", "CloudWatch", resourceByType.get("cloudwatch.logGroup")?.name ?? "Log group", "Receives app logs", "logs", "observability", 560, 86),
      node("iam", "IAM role", resourceByType.get("iam.role")?.name ?? "Task execution role", "Limits AWS permissions", "iam", "security", 560, 238),
      node("rds", database ? "RDS" : "Future RDS", database ? "Detected database dependency" : "Optional database later", database ? "Planned signal" : "Not provisioned in MVP", "rds", database ? "storage" : "future", 40, 238),
      node("redis", cache ? "Redis" : "Future Redis", cache ? "Detected cache dependency" : "Optional cache later", cache ? "Planned signal" : "Not provisioned in MVP", "redis", cache ? "storage" : "future", 40, 390)
    ];
    return base;
  }, [cache, database, resourceByType]);

  const edges = useMemo<Edge[]>(() => [
    edge("alb", "ecs", "HTTP"),
    edge("ecs", "ecr", "pulls image"),
    edge("ecs", "logs", "logs"),
    edge("iam", "ecs", "permits"),
    ...(database ? [edge("ecs", "rds", "future data")] : []),
    ...(cache ? [edge("ecs", "redis", "future cache")] : [])
  ], [cache, database]);

  if (!hasPlan) return null;

  return (
    <Panel className="overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-white/[0.05] px-5 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <Boxes className="h-4 w-4 text-violet-soft" />
          <p className="text-[13px] font-medium text-white">Infrastructure diagram</p>
        </div>
        <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 font-mono text-[10.5px] text-white/45">
          ECS + ALB
        </span>
      </div>
      <div className="h-[430px] min-w-0 bg-[#07070a]">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.18 }}
          minZoom={0.65}
          maxZoom={1.25}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          panOnScroll={false}
          zoomOnScroll={false}
          proOptions={{ hideAttribution: true }}
        >
          <Background color="rgba(255,255,255,0.08)" gap={28} size={1} />
          <Controls showInteractive={false} position="bottom-right" />
        </ReactFlow>
      </div>
    </Panel>
  );
}

function node(
  id: string,
  label: string,
  sub: string,
  detail: string,
  icon: InfraNodeData["icon"],
  tone: InfraNodeData["tone"],
  x: number,
  y: number
): Node<InfraNodeData> {
  return {
    id,
    type: "infra",
    position: { x, y },
    data: { label, sub: `${sub} · ${detail}`, tone, icon }
  };
}

function edge(source: string, target: string, label: string): Edge {
  return {
    id: `${source}-${target}`,
    source,
    target,
    label,
    type: "smoothstep",
    markerEnd: { type: MarkerType.ArrowClosed, color: "rgba(255,255,255,0.35)" },
    style: { stroke: "rgba(255,255,255,0.28)", strokeWidth: 1.4 },
    labelStyle: { fill: "rgba(255,255,255,0.46)", fontSize: 11 },
    labelBgStyle: { fill: "rgba(7,7,10,0.86)" }
  };
}

function InfraNode({ data }: NodeProps<Node<InfraNodeData>>) {
  const Icon = iconFor(data.icon);
  const toneClass = {
    core: "border-violet-400/30 bg-violet-400/10 text-violet-100",
    network: "border-sky-400/30 bg-sky-400/10 text-sky-100",
    storage: "border-emerald-400/25 bg-emerald-400/10 text-emerald-100",
    observability: "border-amber-400/25 bg-amber-400/10 text-amber-100",
    security: "border-rose-400/25 bg-rose-400/10 text-rose-100",
    future: "border-dashed border-white/15 bg-white/[0.025] text-white/55"
  }[data.tone];

  return (
    <div className={`w-[190px] rounded-lg border px-3 py-2.5 shadow-[0_18px_40px_-30px_rgba(0,0,0,0.9)] ${toneClass}`}>
      <Handle type="target" position={Position.Left} className="!h-2 !w-2 !border-white/30 !bg-[#111]" />
      <Handle type="source" position={Position.Right} className="!h-2 !w-2 !border-white/30 !bg-[#111]" />
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 shrink-0" />
        <p className="truncate text-[12.5px] font-medium text-white" title={data.label}>{data.label}</p>
      </div>
      <p className="mt-1 line-clamp-2 text-[10.5px] leading-[1.35] text-white/48" title={data.sub}>
        {data.sub}
      </p>
    </div>
  );
}

function iconFor(icon: InfraNodeData["icon"]) {
  return {
    alb: RadioTower,
    ecs: Container,
    ecr: HardDrive,
    logs: Cloud,
    iam: KeyRound,
    rds: Database,
    redis: ServerCog
  }[icon];
}

function readRequired(value: unknown) {
  return !!(value && typeof value === "object" && "required" in value && (value as { required?: unknown }).required === true);
}
