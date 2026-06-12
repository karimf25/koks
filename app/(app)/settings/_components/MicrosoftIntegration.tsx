"use client";

import { useState, useEffect, useCallback } from "react";
import { GlassPanel, GlassButton } from "@/components/glass";
import { RefreshCw, Plug, CheckCircle2, AlertTriangle, Link2Off, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type Status = {
  configured: boolean;
  connected: boolean;
  account: string | null;
  listId: string | null;
  listName: string | null;
  lastSyncedAt: string | null;
  lastResult: { at: string; pulled: number; pushed: number; created: number; ok: boolean; error?: string } | null;
};

type MsList = { id: string; name: string; wellknown: string | null };

type Banner = { kind: "ok" | "error"; text: string } | null;

export function MicrosoftIntegration() {
  const [status, setStatus] = useState<Status | null>(null);
  const [lists, setLists] = useState<MsList[]>([]);
  const [banner, setBanner] = useState<Banner>(null);
  const [syncing, setSyncing] = useState(false);
  const [busy, setBusy] = useState(false);

  const loadStatus = useCallback(async () => {
    const res = await fetch("/api/integrations/microsoft/status");
    if (res.ok) setStatus(await res.json());
  }, []);

  const loadLists = useCallback(async () => {
    const res = await fetch("/api/integrations/microsoft/lists");
    if (res.ok) setLists(await res.json());
  }, []);

  // Read OAuth redirect result from the URL (?ms=connected|error&msg=...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ms = params.get("ms");
    if (ms === "connected") setBanner({ kind: "ok", text: "Connected to Microsoft To Do." });
    else if (ms === "error") setBanner({ kind: "error", text: params.get("msg") || "Connection failed." });
    if (ms) window.history.replaceState({}, "", window.location.pathname);
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    if (status?.connected) loadLists();
  }, [status?.connected, loadLists]);

  const connect = () => {
    window.location.href = "/api/integrations/microsoft/connect";
  };

  const disconnect = async () => {
    setBusy(true);
    await fetch("/api/integrations/microsoft/disconnect", { method: "POST" });
    setLists([]);
    await loadStatus();
    setBanner({ kind: "ok", text: "Disconnected from Microsoft." });
    setBusy(false);
  };

  const selectList = async (listId: string) => {
    const list = lists.find((l) => l.id === listId);
    setBusy(true);
    await fetch("/api/integrations/microsoft/select-list", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listId, listName: list?.name }),
    });
    await loadStatus();
    setBusy(false);
  };

  const syncNow = async () => {
    setSyncing(true);
    setBanner(null);
    try {
      const res = await fetch("/api/integrations/microsoft/sync", { method: "POST" });
      const r = await res.json();
      if (r.ok) {
        setBanner({
          kind: "ok",
          text: `Synced — pulled ${r.pulled}, pushed ${r.pushed}${r.cancelled ? `, cancelled ${r.cancelled}` : ""}.`,
        });
      } else {
        setBanner({ kind: "error", text: r.error || "Sync failed." });
      }
      await loadStatus();
    } catch (e) {
      setBanner({ kind: "error", text: e instanceof Error ? e.message : "Sync failed." });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <GlassPanel className="max-w-lg">
      <div className="flex items-center gap-2 mb-5">
        <Plug className="w-4 h-4 text-[var(--teal)]" />
        <h2 className="text-sm font-semibold text-[var(--text-2)]">Microsoft To Do</h2>
        {status?.connected && (
          <span className="ml-auto flex items-center gap-1 text-xs text-[var(--teal)]">
            <CheckCircle2 className="w-3.5 h-3.5" /> Connected
          </span>
        )}
      </div>

      {banner && (
        <div
          className="flex items-start gap-2 text-xs rounded-xl px-3 py-2 mb-4"
          style={{
            background: banner.kind === "ok" ? "rgba(32,135,142,0.12)" : "rgba(229,62,62,0.12)",
            color: banner.kind === "ok" ? "var(--ice)" : "#FC8181",
            border: `1px solid ${banner.kind === "ok" ? "rgba(32,135,142,0.3)" : "rgba(229,62,62,0.3)"}`,
          }}
        >
          {banner.kind === "ok" ? (
            <CheckCircle2 className="w-3.5 h-3.5 mt-px flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-3.5 h-3.5 mt-px flex-shrink-0" />
          )}
          <span className="break-words">{banner.text}</span>
        </div>
      )}

      {/* Loading */}
      {!status && <p className="text-sm text-[var(--text-3)]">Loading…</p>}

      {/* Not configured */}
      {status && !status.configured && (
        <p className="text-sm text-[var(--text-3)]">
          Not enabled yet. Add <code className="text-[var(--text-2)]">MS_CLIENT_ID</code> and{" "}
          <code className="text-[var(--text-2)]">MS_CLIENT_SECRET</code> environment variables, then
          redeploy.
        </p>
      )}

      {/* Configured, not connected */}
      {status && status.configured && !status.connected && (
        <div className="space-y-3">
          <p className="text-sm text-[var(--text-3)]">
            Sync your tasks two-way with Microsoft To Do.
          </p>
          <GlassButton variant="primary" size="sm" onClick={connect}>
            <Plug className="w-3.5 h-3.5 mr-1.5" /> Connect Microsoft account
          </GlassButton>
        </div>
      )}

      {/* Connected */}
      {status && status.connected && (
        <div className="space-y-4">
          <div>
            <label className="text-xs text-[var(--text-3)] block mb-1">Account</label>
            <p className="text-sm text-[var(--text)]">{status.account ?? "Microsoft account"}</p>
          </div>

          <div>
            <label className="text-xs text-[var(--text-3)] block mb-1">List to sync</label>
            <select
              value={status.listId ?? ""}
              onChange={(e) => selectList(e.target.value)}
              disabled={busy || lists.length === 0}
              className="w-full bg-[var(--surface)] border border-[var(--glass-border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--ice)]"
            >
              <option value="">{lists.length ? "Choose a list…" : "Loading lists…"}</option>
              {lists.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
            {!status.listId && (
              <p className="text-xs text-[var(--amber)] mt-1">Pick a list to enable syncing.</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <GlassButton
              variant="primary"
              size="sm"
              onClick={syncNow}
              disabled={syncing || !status.listId}
            >
              {syncing ? (
                <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Syncing…</>
              ) : (
                <><RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Sync now</>
              )}
            </GlassButton>
            <GlassButton variant="danger" size="sm" onClick={disconnect} disabled={busy}>
              <Link2Off className="w-3.5 h-3.5 mr-1.5" /> Disconnect
            </GlassButton>
          </div>

          {status.lastSyncedAt && (
            <p className="text-xs text-[var(--text-3)] pt-2 border-t border-[var(--glass-border)]">
              Last synced {formatDistanceToNow(new Date(status.lastSyncedAt), { addSuffix: true })}
              {status.lastResult && !status.lastResult.ok && (
                <span className="text-[#FC8181]"> · last run failed</span>
              )}
            </p>
          )}
          <p className="text-xs text-[var(--text-3)]">
            Two-way sync · auto-syncs daily. Loose tasks (no project) you add in LifeOS are pushed to
            this list.
          </p>
        </div>
      )}
    </GlassPanel>
  );
}
