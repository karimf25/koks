"use client";

import { useState } from "react";
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
import { ChevronLeft, ChevronRight, Sparkles, Loader2 } from "lucide-react";

export function RecapView({ data, weekOffset }: { data: WeekRecapData; weekOffset: number }) {
  const router = useRouter();
  const [summary, setSummary] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const goToWeek = (offset: number) => {
    router.push(offset === 0 ? "/recap" : `/recap?week=${offset}`);
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
      </GlassPanel>

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
