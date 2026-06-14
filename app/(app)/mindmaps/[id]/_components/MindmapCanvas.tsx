"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  Panel,
  ConnectionMode,
  useNodesState,
  useEdgesState,
  useReactFlow,
  addEdge,
  type Node,
  type Edge,
  type OnConnect,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import dagre from "@dagrejs/dagre";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Check, Loader2, Trash2, LayoutDashboard } from "lucide-react";
import { GlassNode, type GlassNodeData } from "./GlassNode";
import type { MindmapNode, MindmapEdge, MindmapData } from "@/lib/mindmaps";

interface Props {
  id: string;
  title: string;
  initialNodes: MindmapNode[];
  initialEdges: MindmapEdge[];
}

const NODE_W = 140;
const NODE_H = 48;

function applyDagreLayout(nodes: Node[], edges: Edge[]): Node[] {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "TB", nodesep: 60, ranksep: 80 });
  nodes.forEach((n) => g.setNode(n.id, { width: NODE_W, height: NODE_H }));
  edges.forEach((e) => g.setEdge(e.source, e.target));
  dagre.layout(g);
  return nodes.map((n) => {
    const { x, y } = g.node(n.id);
    return { ...n, position: { x: x - NODE_W / 2, y: y - NODE_H / 2 } };
  });
}

const NODE_COLORS = [
  { value: "var(--teal)", label: "Teal" },
  { value: "var(--accent)", label: "Orange" },
  { value: "var(--gold)", label: "Gold" },
  { value: "var(--ice)", label: "Ice" },
  { value: "var(--slate)", label: "Slate" },
];

type SaveState = "idle" | "saving" | "saved";

function toFlowNodes(nodes: MindmapNode[]): Node[] {
  return nodes.map((n) => ({
    id: n.id,
    type: "glass",
    position: n.position,
    data: { label: n.data.label, color: n.data.color } as GlassNodeData,
  }));
}

function toFlowEdges(edges: MindmapEdge[]): Edge[] {
  return edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    label: e.label,
  }));
}

function serialize(nodes: Node[], edges: Edge[]): MindmapData {
  return {
    nodes: nodes.map((n) => ({
      id: n.id,
      type: "glass",
      position: n.position,
      data: {
        label: (n.data as GlassNodeData).label,
        color: (n.data as GlassNodeData).color,
      },
    })),
    edges: edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      label: typeof e.label === "string" ? e.label : undefined,
    })),
  };
}

function Flow({ id, title, initialNodes, initialEdges }: Props) {
  const router = useRouter();
  const { screenToFlowPosition } = useReactFlow();
  const wrapperRef = useRef<HTMLDivElement>(null);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(toFlowNodes(initialNodes));
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(toFlowEdges(initialEdges));
  const [mapTitle, setMapTitle] = useState(title);
  const [saveState, setSaveState] = useState<SaveState>("idle");

  const nodeTypes = useMemo(() => ({ glass: GlassNode }), []);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRun = useRef(true);

  const selectedNode = nodes.find((n) => n.selected);
  const selectedEdge = edges.find((e) => e.selected);
  const hasSelection = !!selectedNode || !!selectedEdge;

  const persist = useCallback(
    (patch: { title?: string; data?: MindmapData }) => {
      setSaveState("saving");
      fetch(`/api/mindmaps/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      })
        .then(() => {
          setSaveState("saved");
          setTimeout(() => setSaveState("idle"), 1500);
        })
        .catch(() => setSaveState("idle"));
    },
    [id]
  );

  // Debounced autosave whenever the graph changes (skip the initial mount).
  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      persist({ data: serialize(nodes, edges) });
    }, 800);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [nodes, edges, persist]);

  const onConnect: OnConnect = useCallback(
    (connection) => {
      setEdges((eds) => addEdge({ ...connection, id: crypto.randomUUID() }, eds));
    },
    [setEdges]
  );

  const addNode = useCallback(() => {
    const rect = wrapperRef.current?.getBoundingClientRect();
    const center = rect
      ? screenToFlowPosition({ x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 })
      : { x: 0, y: 0 };
    const newNode: Node = {
      id: crypto.randomUUID(),
      type: "glass",
      position: { x: center.x - 60 + (Math.random() * 40 - 20), y: center.y - 20 + (Math.random() * 40 - 20) },
      data: { label: "New idea", color: "var(--teal)" } as GlassNodeData,
    };
    setNodes((nds) => [...nds, newNode]);
  }, [screenToFlowPosition, setNodes]);

  const recolorSelected = useCallback(
    (color: string) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.selected ? { ...n, data: { ...(n.data as GlassNodeData), color } } : n
        )
      );
    },
    [setNodes]
  );

  const saveTitle = () => {
    persist({ title: mapTitle.trim() || "Untitled map" });
  };

  const deleteSelected = useCallback(() => {
    setNodes((nds) => nds.filter((n) => !n.selected));
    setEdges((eds) => eds.filter((e) => !e.selected));
  }, [setNodes, setEdges]);

  const autoLayout = useCallback(() => {
    setNodes((nds) => applyDagreLayout(nds, edges));
  }, [edges, setNodes]);

  return (
    <div ref={wrapperRef} className="glass h-[calc(100dvh-11rem)] lg:h-[calc(100vh-9rem)] relative overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        connectionMode={ConnectionMode.Loose}
        deleteKeyCode={["Backspace", "Delete"]}
        fitView
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={{ animated: false }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="var(--glass-border)" />
        <Controls />
        <MiniMap
          pannable
          zoomable
          nodeColor={(n) => (n.data as GlassNodeData)?.color ?? "var(--teal)"}
          maskColor="rgba(9, 20, 30, 0.7)"
        />

        {/* Top toolbar */}
        <Panel position="top-left" className="!m-3">
          <div className="glass-card flex items-center gap-2 px-3 py-2">
            <button
              onClick={() => router.push("/mindmaps")}
              className="p-1 rounded-lg hover:bg-[var(--glass-strong)] transition-colors"
              aria-label="Back to mind maps"
            >
              <ArrowLeft className="w-4 h-4 text-[var(--text-2)]" />
            </button>
            <input
              value={mapTitle}
              onChange={(e) => setMapTitle(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
              className="bg-transparent text-sm font-semibold text-[var(--text)] outline-none w-24 sm:w-44"
            />
            <div className="w-px h-5 bg-[var(--glass-border)]" />
            <button
              onClick={addNode}
              className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-[var(--accent)] text-white hover:bg-[var(--accent-hot)] transition-colors"
            >
              <Plus className="w-3 h-3" /> Add node
            </button>
            <button
              onClick={autoLayout}
              title="Auto-layout (Tidy up)"
              className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg transition-colors hover:bg-[var(--glass-strong)]"
              style={{ color: "var(--text-2)" }}
            >
              <LayoutDashboard className="w-3 h-3" /> Tidy up
            </button>
            {hasSelection && (
              <button
                onClick={deleteSelected}
                title="Delete selected"
                className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg transition-colors"
                style={{ color: "var(--accent)", background: "var(--accent)15" }}
              >
                <Trash2 className="w-3 h-3" /> Delete
              </button>
            )}
            <SaveIndicator state={saveState} />
          </div>
        </Panel>

        {/* Color picker — only when a single node is selected */}
        {selectedNode && (
          <Panel position="top-right" className="!m-3 !mt-16 sm:!mt-3">
            <div className="glass-card flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-2">
              <span className="hidden sm:inline text-xs text-[var(--text-3)]">Color</span>
              {NODE_COLORS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => recolorSelected(c.value)}
                  className="w-5 h-5 rounded-full border border-[var(--glass-border)] transition-transform hover:scale-110"
                  style={{ background: c.value }}
                  aria-label={c.label}
                />
              ))}
            </div>
          </Panel>
        )}

        {/* Empty hint */}
        {nodes.length === 0 && (
          <Panel position="top-center" className="!mt-20">
            <p className="text-sm text-[var(--text-3)]">
              Click <span className="text-[var(--accent)]">Add node</span> to start. Drag from a node&apos;s edge to connect. Double-click to rename.
            </p>
          </Panel>
        )}
      </ReactFlow>
    </div>
  );
}

function SaveIndicator({ state }: { state: SaveState }) {
  if (state === "idle") return null;
  return (
    <span className="flex items-center gap-1 text-xs text-[var(--text-3)] ml-1">
      {state === "saving" ? (
        <><Loader2 className="w-3 h-3 animate-spin" /> Saving</>
      ) : (
        <><Check className="w-3 h-3 text-[var(--teal)]" /> Saved</>
      )}
    </span>
  );
}

export function MindmapCanvas(props: Props) {
  return (
    <ReactFlowProvider>
      <Flow {...props} />
    </ReactFlowProvider>
  );
}
