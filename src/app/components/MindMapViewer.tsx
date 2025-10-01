"use client";

import React from "react";
import dynamic from "next/dynamic";
import { useMindMap } from "@/app/contexts/MindMapContext";

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false });

type Props = {
  spaceName?: string;
  fullBleed?: boolean;
};

export default function MindMapViewer({ spaceName, fullBleed = false }: Props) {
  const { state } = useMindMap();
  const nodes = React.useMemo(() => Object.values(state.nodesByLabel).map(n => ({ id: n.label, label: n.label, salience: n.displaySalience ?? n.salience ?? 5 })), [state.nodesByLabel]);
  const nodeIdSet = React.useMemo(() => new Set(nodes.map(n => n.id as string)), [nodes]);
  const links = React.useMemo(() => state.edges
    .filter(e => nodeIdSet.has(e.sourceLabel) && nodeIdSet.has(e.targetLabel))
    .map(e => ({ source: e.sourceLabel, target: e.targetLabel, relation: e.relation })), [state.edges, nodeIdSet]);

  const data = React.useMemo(() => ({ nodes, links }), [nodes, links]);

  const drawNode = React.useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const label = node.label as string;
    const salience = node.salience ?? 5;
    const baseRadius = 4 + salience; // world units
    const fontSizePx = Math.max(10, (12 + salience));
    ctx.font = `${fontSizePx / globalScale}px sans-serif`;
    const text = label || '';
    const textWidthPx = ctx.measureText(text).width * globalScale; // convert to screen px for comparison
    const paddingPx = 8;
    const targetRadiusPx = (textWidthPx / 2) + paddingPx;
    const radius = Math.max(baseRadius, targetRadiusPx / globalScale);

    // circle
    ctx.beginPath();
    ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
    ctx.fillStyle = node.color || '#bcd7e7';
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    ctx.lineWidth = Math.max(1 / globalScale, 0.5);
    ctx.stroke();

    // label
    ctx.font = `${fontSizePx / globalScale}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#1f2937';
    ctx.fillText(text, node.x, node.y);
  }, []);

  const containerClass = fullBleed ? "h-full" : "p-2 h-[420px] bg-white rounded border";

  return (
    <div className={containerClass}>
      {nodes.length > 0 && (
      <ForceGraph2D
        graphData={data as any}
        nodeLabel={(n: any) => n.label}
        nodeVal={(n: any) => 2 + (n.salience ?? 5)}
        nodeAutoColorBy={(n: any) => (n.salience ?? 5) > 6 ? 'high' : 'normal'}
        linkDirectionalArrowLength={4}
        linkDirectionalParticles={0}
        linkLabel={(l: any) => l.relation || ''}
        cooldownTicks={60}
        width={undefined}
        height={undefined}
        nodeCanvasObject={drawNode}
        nodeCanvasObjectMode={() => 'replace'}
      />)}
    </div>
  );
}


