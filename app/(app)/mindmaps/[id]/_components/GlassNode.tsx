"use client";

import { Handle, Position, type NodeProps, useReactFlow } from "@xyflow/react";
import { useState, useRef, useEffect } from "react";

export type GlassNodeData = { label: string; color?: string };

export function GlassNode({ id, data, selected }: NodeProps) {
  const { updateNodeData } = useReactFlow();
  const d = data as GlassNodeData;
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(d.label ?? "");
  const inputRef = useRef<HTMLInputElement>(null);
  const color = d.color ?? "var(--teal)";

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const commit = () => {
    setEditing(false);
    updateNodeData(id, { label: value.trim() || "Untitled" });
  };

  const handleStyle = { width: 8, height: 8 };

  return (
    <div
      className="glass-card px-4 py-2.5 min-w-[120px] max-w-[240px]"
      style={{
        borderLeft: `3px solid ${color}`,
        boxShadow: selected
          ? "0 0 0 1.5px var(--accent), 0 2px 14px rgba(0,0,0,0.35)"
          : undefined,
      }}
      onDoubleClick={() => {
        setValue(d.label ?? "");
        setEditing(true);
      }}
    >
      <Handle type="source" position={Position.Left} id="l" style={handleStyle} />
      <Handle type="source" position={Position.Right} id="r" style={handleStyle} />
      <Handle type="source" position={Position.Top} id="t" style={handleStyle} />
      <Handle type="source" position={Position.Bottom} id="b" style={handleStyle} />
      {editing ? (
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") setEditing(false);
          }}
          className="nodrag bg-transparent text-sm text-[var(--text)] outline-none w-full"
        />
      ) : (
        <span className="text-sm text-[var(--text)] break-words">
          {d.label || "Untitled"}
        </span>
      )}
    </div>
  );
}
