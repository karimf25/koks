"use client";

import { useState, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Eye, Pencil } from "lucide-react";

type Mode = "edit" | "preview";

interface Props {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  /** Extra controls rendered on the right of the toggle row (e.g. a project picker). */
  toolbarRight?: ReactNode;
  defaultMode?: Mode;
  /** Applied to the body (textarea / preview) wrapper — use for height. */
  bodyClassName?: string;
  className?: string;
}

/**
 * Reusable Markdown edit/preview editor. Controlled value; manages its own
 * edit↔preview toggle. Shared by Notes, Memory Vault, and anywhere else that
 * needs Markdown editing (extracted from NotesView for v1.1 M0.2).
 */
export function MarkdownEditor({
  value,
  onChange,
  onBlur,
  placeholder = "Start writing in Markdown…",
  toolbarRight,
  defaultMode = "edit",
  bodyClassName = "flex-1",
  className = "",
}: Props) {
  const [mode, setMode] = useState<Mode>(defaultMode);

  return (
    <div className={`flex flex-col min-h-0 gap-3 ${className}`}>
      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--glass-border)] pb-3">
        <div className="flex rounded-xl bg-[var(--glass)] border border-[var(--glass-border)] p-0.5">
          <Toggle active={mode === "edit"} onClick={() => setMode("edit")} icon={Pencil} label="Edit" />
          <Toggle active={mode === "preview"} onClick={() => setMode("preview")} icon={Eye} label="Preview" />
        </div>
        {toolbarRight && <div className="ml-auto flex items-center gap-2 min-w-0">{toolbarRight}</div>}
      </div>

      <div className={`overflow-hidden ${bodyClassName}`}>
        {mode === "edit" ? (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            placeholder={placeholder}
            className="w-full h-full bg-[var(--surface)] border border-[var(--glass-border)] rounded-xl px-4 py-3 text-sm text-[var(--text)] outline-none resize-none font-mono leading-relaxed focus-visible:ring-2 focus-visible:ring-[var(--ice)]"
          />
        ) : (
          <div className="markdown-body h-full overflow-y-auto px-1 text-sm text-[var(--text-2)] leading-relaxed">
            {value.trim() ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown>
            ) : (
              <p className="text-[var(--text-3)] italic">Nothing to preview yet.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Toggle({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg transition-colors ${
        active ? "bg-[var(--accent)] text-white" : "text-[var(--text-3)] hover:text-[var(--text-2)]"
      }`}
    >
      <Icon className="w-3 h-3" /> {label}
    </button>
  );
}
