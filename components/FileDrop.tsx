"use client";

import { useCallback, useRef, useState } from "react";
import { Paperclip, Upload, X, FileText, Loader2, Download } from "lucide-react";
import type { SerializedAttachment } from "@/lib/serialize";

type OwnerType = "task" | "project";

interface Props {
  ownerType: OwnerType;
  ownerId: string;
  initial?: SerializedAttachment[];
  onChange?: (attachments: SerializedAttachment[]) => void;
  /** Compact layout (e.g. inside a task row) hides the help text. */
  compact?: boolean;
}

function formatSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileDrop({ ownerType, ownerId, initial = [], onChange, compact }: Props) {
  const [items, setItems] = useState<SerializedAttachment[]>(initial);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const update = useCallback(
    (next: SerializedAttachment[]) => {
      setItems(next);
      onChange?.(next);
    },
    [onChange]
  );

  const uploadOne = useCallback(
    async (file: File) => {
      // 1. Ask the server for a signed direct-upload URL (bypasses the function body limit).
      const urlRes = await fetch("/api/attachments/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ownerType, ownerId, fileName: file.name }),
      });
      if (!urlRes.ok) throw new Error("Could not start upload");
      const { path, signedUrl } = await urlRes.json();

      // 2. PUT the file straight to Supabase Storage (mirrors supabase-js uploadToSignedUrl).
      const form = new FormData();
      form.append("cacheControl", "3600");
      form.append("", file);
      const putRes = await fetch(signedUrl, {
        method: "PUT",
        headers: { "x-upsert": "false" },
        body: form,
      });
      if (!putRes.ok) throw new Error("Upload failed");

      // 3. Record the metadata row.
      const recRes = await fetch("/api/attachments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerType,
          ownerId,
          name: file.name,
          path,
          mimeType: file.type || null,
          sizeBytes: file.size,
        }),
      });
      if (!recRes.ok) throw new Error("Could not save attachment");
      return (await recRes.json()) as SerializedAttachment;
    },
    [ownerType, ownerId]
  );

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      setBusy(true);
      setError(null);
      const added: SerializedAttachment[] = [];
      try {
        for (const file of Array.from(files)) {
          added.push(await uploadOne(file));
        }
        update([...added, ...items]);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Upload failed");
      } finally {
        setBusy(false);
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    [uploadOne, items, update]
  );

  const remove = useCallback(
    async (id: string) => {
      update(items.filter((a) => a.id !== id));
      await fetch(`/api/attachments/${id}`, { method: "DELETE" });
    },
    [items, update]
  );

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        disabled={busy}
        className={`flex items-center justify-center gap-2 rounded-xl border border-dashed px-3 py-2.5 text-xs transition-colors ${
          dragOver
            ? "border-[var(--accent)] bg-[var(--glass-strong)] text-[var(--text)]"
            : "border-[var(--glass-border)] text-[var(--text-3)] hover:text-[var(--text-2)] hover:border-[var(--text-3)]"
        }`}
      >
        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
        {busy ? "Uploading…" : compact ? "Attach file" : "Drop a file here, or click to attach"}
      </button>
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {error && <p className="text-xs text-[#FC8181]">{error}</p>}

      {items.length > 0 && (
        <ul className="flex flex-col gap-1">
          {items.map((a) => (
            <li
              key={a.id}
              className="group flex items-center gap-2 rounded-lg bg-[var(--glass)] border border-[var(--glass-border)] px-2.5 py-1.5"
            >
              <FileText className="w-3.5 h-3.5 flex-shrink-0 text-[var(--text-3)]" />
              <a
                href={`/api/attachments/${a.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 min-w-0 text-xs text-[var(--text-2)] hover:text-[var(--text)] truncate"
                title={a.name}
              >
                {a.name}
              </a>
              {a.sizeBytes ? (
                <span className="text-[10px] text-[var(--text-3)] font-mono flex-shrink-0">
                  {formatSize(a.sizeBytes)}
                </span>
              ) : null}
              <a
                href={`/api/attachments/${a.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--text-3)] hover:text-[var(--text)] flex-shrink-0"
                aria-label="Download"
              >
                <Download className="w-3 h-3" />
              </a>
              <button
                type="button"
                onClick={() => remove(a.id)}
                className="text-[var(--text-3)] hover:text-[#FC8181] flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Remove attachment"
              >
                <X className="w-3 h-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export { Paperclip };
