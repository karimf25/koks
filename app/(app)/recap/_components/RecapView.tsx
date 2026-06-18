"use client";

import { useState, useEffect } from "react";
import { Player } from "@remotion/player";
import { useRouter } from "next/navigation";
import { GlassPanel, GlassButton } from "@/components/glass";
import {
  RecapComposition,
  RECAP_DURATION,
  RECAP_FPS,
  RECAP_WIDTH,
  RECAP_HEIGHT,
} from "./RecapComposition";
import type { WeekRecapData } from "@/lib/recap";
import { ChevronLeft, ChevronRight, Sparkles, Loader2, Download, Film, BarChart2 } from "lucide-react";

// ── Chart helpers ─────────────────────────────────────────────────────────────

function DayBarChart({ byDay, bestDay }: { byDay: WeekRecapData["byDay"]; bestDay: string | null }) {
  const max = Math.max(...byDay.map((d) => d.count), 1);
  return (
    <div className="flex items-end gap-1.5 h-16">
      {byDay.map((d) => {
        const pct = (d.count / max) * 100;
        const isBest = d.day === bestDay;
        return (
          <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
            <div
              className="w-full rounded-t-sm transition-all duration-500"
              style={{
                height: `${Math.max(pct, 4)}%`,
                background: isBest ? "var(--teal)" : "var(--glass-strong)",
                minHeight: "3px",
              }}
            />
            <span className="text-[9px] text-[var(--text-3)]">{d.day}</span>
          </div>
        );
      })}
    </div>
  );
}

function PriorityDonut({ byPriority, total }: { byPriority: WeekRecapData["byPriority"]; total: number }) {
  if (total === 0) {
    return <div className="flex items-center justify-center h-16 text-xs text-[var(--text-3)]">No data</div>;
  }
  const segments = [
    { value: byPriority.p1, color: "var(--p1)", label: "P1" },
    { value: byPriority.p2, color: "var(--p2)", label: "P2" },
    { value: byPriority.p3, color: "var(--p3)", label: "P3" },
  ];
  return (
    <div className="flex items-center gap-3">
      <svg viewBox="0 0 36 36" className="w-14 h-14 flex-shrink-0">
        <DonutSegments segments={segments} total={total} />
        <text x="18" y="20" textAnchor="middle" fontSize="7" fill="var(--text-2)" fontWeight="600">
          {total}
        </text>
      </svg>
      <div className="space-y-1">
        {segments.map((s) => (
          <div key={s.label} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
            <span className="text-[10px] text-[var(--text-3)]">{s.label}: {s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DonutSegments({ segments, total }: { segments: { value: number; color: string }[]; total: number }) {
  const r = 15.9155;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  return (
    <>
      <circle cx="18" cy="18" r={r} fill="none" stroke="var(--glass-strong)" strokeWidth="3.5" />
      {segments.map((s, i) => {
        const dash = (s.value / total) * circ;
        const el = (
          <circle
            key={i}
            cx="18" cy="18" r={r}
            fill="none"
            stroke={s.color}
            strokeWidth="3.5"
            strokeDasharray={`${dash} ${circ - dash}`}
            strokeDashoffset={-offset}
            transform="rotate(-90 18 18)"
          />
        );
        offset += dash;
        return el;
      })}
    </>
  );
}

function IdeasStat({ captured, promoted }: { captured: number; promoted: number }) {
  const maxVal = Math.max(captured, promoted, 1);
  return (
    <div className="space-y-3">
      <StatBar label="Captured" value={captured} max={maxVal} color="var(--accent)" />
      <StatBar label="Promoted" value={promoted} max={maxVal} color="var(--teal)" />
    </div>
  );
}

function StatBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between text-[10px] text-[var(--text-3)] mb-1">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div className="h-1.5 rounded-full" style={{ background: "var(--glass-strong)" }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${(value / max) * 100}%`, background: color, minWidth: value > 0 ? "3px" : "0" }}
        />
      </div>
    </div>
  );
}

function ProjectProgress({ projects }: { projects: WeekRecapData["projects"] }) {
  if (projects.length === 0) {
    return <div className="flex items-center justify-center h-16 text-xs text-[var(--text-3)]">No project data</div>;
  }
  return (
    <div className="space-y-2.5">
      {projects.slice(0, 4).map((p) => {
        const pct = p.total > 0 ? Math.round((p.completed / p.total) * 100) : 0;
        return (
          <div key={p.name}>
            <div className="flex justify-between text-[10px] text-[var(--text-3)] mb-1">
              <span className="truncate max-w-[120px]">{p.name}</span>
              <span>{pct}%</span>
            </div>
            <div className="h-1.5 rounded-full" style={{ background: "var(--glass-strong)" }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, background: p.color ?? "var(--teal)", minWidth: pct > 0 ? "3px" : "0" }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main view ─────────────────────────────────────────────────────────────────

export function RecapView({ data, weekOffset }: { data: WeekRecapData; weekOffset: number }) {
  const router = useRouter();
  const [summary, setSummary] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Video export (Remotion Lambda)
  const [exportConfigured, setExportConfigured] = useState<boolean | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportError, setExportError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/recap/render")
      .then((r) => r.json())
      .then((r) => setExportConfigured(!!r.configured))
      .catch(() => setExportConfigured(false));
  }, []);

  const goToWeek = (offset: number) => {
    router.push(offset === 0 ? "/recap" : `/recap?week=${offset}`);
  };

  const exportVideo = async () => {
    setExporting(true);
    setExportError(null);
    setExportProgress(0);
    try {
      const start = await fetch("/api/recap/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ week: weekOffset, summary }),
      });
      const job = await start.json();
      if (!start.ok) throw new Error(job.error || "Could not start the render");
      const { renderId, bucketName } = job;

      // Poll progress until done (or it errors).
      while (true) {
        await new Promise((r) => setTimeout(r, 2000));
        const res = await fetch(
          `/api/recap/render/progress?renderId=${renderId}&bucketName=${bucketName}`
        );
        const p = await res.json();
        if (p.error) throw new Error(p.error);
        setExportProgress(Math.round((p.progress ?? 0) * 100));
        if (p.done && p.url) {
          window.open(p.url, "_blank");
          break;
        }
      }
    } catch (e) {
      setExportError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExporting(false);
    }
  };

  const generateSummary = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/recap/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ week: weekOffset }),
      });
      const r = await res.json();
      if (!res.ok || !r.summary) throw new Error(r.error || "Could not generate summary");
      setSummary(r.summary);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not generate summary");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--cream)]">Weekly Recap</h1>
          <p className="text-sm text-[var(--text-3)] mt-1">{data.weekLabel}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <GlassButton variant="ghost" size="sm" onClick={() => goToWeek(weekOffset - 1)}>
            <ChevronLeft className="w-4 h-4" />
          </GlassButton>
          <span className="text-xs text-[var(--text-3)] px-1 min-w-20 text-center">
            {data.isCurrentWeek ? "This week" : weekOffset === -1 ? "Last week" : `${Math.abs(weekOffset)} weeks ago`}
          </span>
          <GlassButton
            variant="ghost"
            size="sm"
            onClick={() => goToWeek(weekOffset + 1)}
            disabled={weekOffset >= 0}
          >
            <ChevronRight className="w-4 h-4" />
          </GlassButton>
        </div>
      </div>

      <GlassPanel className="!p-3 overflow-hidden">
        <div className="rounded-2xl overflow-hidden" style={{ aspectRatio: "16 / 9" }}>
          <Player
            component={RecapComposition}
            inputProps={{ data, summary }}
            durationInFrames={RECAP_DURATION}
            fps={RECAP_FPS}
            compositionWidth={RECAP_WIDTH}
            compositionHeight={RECAP_HEIGHT}
            style={{ width: "100%", height: "100%" }}
            controls
            loop
            autoPlay
            initiallyMuted
            acknowledgeRemotionLicense
          />
        </div>
        {/* Export row */}
        <div className="flex items-center gap-3 flex-wrap px-1 pt-3">
          <GlassButton
            variant="secondary"
            size="sm"
            onClick={exportVideo}
            disabled={exporting || exportConfigured === false}
            title={
              exportConfigured === false
                ? "Video export isn't set up yet — see HANDOFF.md"
                : "Render and download this recap as an MP4"
            }
          >
            {exporting ? (
              <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Rendering… {exportProgress}%</>
            ) : (
              <><Download className="w-3.5 h-3.5 mr-1.5" /> Download MP4</>
            )}
          </GlassButton>
          {exportConfigured === false && (
            <span className="flex items-center gap-1.5 text-xs text-[var(--text-3)]">
              <Film className="w-3.5 h-3.5" /> Cloud export not set up yet
            </span>
          )}
          {exportError && <span className="text-xs text-[#FC8181]">{exportError}</span>}
        </div>
      </GlassPanel>

      {/* Performance graphs */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <BarChart2 className="w-4 h-4 text-[var(--teal)]" />
          <h2 className="text-sm font-semibold text-[var(--text-2)]">Performance</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Tasks per day bar chart */}
          <GlassPanel className="!p-4">
            <p className="text-xs text-[var(--text-3)] mb-3">Tasks completed / day</p>
            <DayBarChart byDay={data.byDay} bestDay={data.bestDay} />
          </GlassPanel>

          {/* Priority breakdown donut */}
          <GlassPanel className="!p-4">
            <p className="text-xs text-[var(--text-3)] mb-3">By priority</p>
            <PriorityDonut byPriority={data.byPriority} total={data.tasksCompleted} />
          </GlassPanel>

          {/* Ideas captured vs promoted */}
          <GlassPanel className="!p-4">
            <p className="text-xs text-[var(--text-3)] mb-3">Ideas</p>
            <IdeasStat captured={data.ideasCaptured} promoted={data.ideasPromoted} />
          </GlassPanel>

          {/* Projects progress */}
          <GlassPanel className="!p-4">
            <p className="text-xs text-[var(--text-3)] mb-3">Projects</p>
            <ProjectProgress projects={data.projects} />
          </GlassPanel>
        </div>
      </div>

      <GlassPanel className="max-w-2xl">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-[var(--accent)]" />
          <h2 className="text-sm font-semibold text-[var(--text-2)]">AI summary</h2>
        </div>
        {summary ? (
          <p className="text-sm text-[var(--text)] leading-relaxed">{summary}</p>
        ) : (
          <p className="text-sm text-[var(--text-3)]">
            Let Claude write a short narrative of your week — it also plays in the video outro.
          </p>
        )}
        {error && <p className="text-xs text-[#FC8181] mt-2">{error}</p>}
        <div className="mt-4">
          <GlassButton variant="primary" size="sm" onClick={generateSummary} disabled={generating}>
            {generating ? (
              <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Writing…</>
            ) : (
              <><Sparkles className="w-3.5 h-3.5 mr-1.5" /> {summary ? "Rewrite summary" : "Generate summary"}</>
            )}
          </GlassButton>
        </div>
      </GlassPanel>
    </div>
  );
}
