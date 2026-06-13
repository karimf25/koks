"use client";

import React from "react";
import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Easing,
} from "remotion";
import type { WeekRecapData } from "@/lib/recap";

// Midnight Glass palette — hardcoded so the video is self-contained
// (CSS variables wouldn't survive a real server render).
const C = {
  bgBase: "#0A1420",
  bgDeep: "#092634",
  surface: "#16242F",
  glassBorder: "rgba(255,255,255,0.10)",
  glass: "rgba(255,255,255,0.05)",
  teal: "#20878E",
  ice: "#92C4C6",
  accent: "#F27405",
  accentHot: "#FF6E42",
  amber: "#D98D30",
  text: "#F2F5F8",
  text2: "#9FB3C4",
  text3: "#5C7287",
  cream: "#F6E3D6",
};

const FONT = "'Geist', 'Inter', system-ui, sans-serif";

export const RECAP_FPS = 30;
export const RECAP_WIDTH = 1280;
export const RECAP_HEIGHT = 720;

// Scene boundaries (frames)
const SCENES = {
  intro: { from: 0, duration: 80 },
  tasks: { from: 80, duration: 110 },
  days: { from: 190, duration: 90 },
  projects: { from: 280, duration: 90 },
  capture: { from: 370, duration: 80 },
  outro: { from: 450, duration: 90 },
};
export const RECAP_DURATION = 540;

export type RecapProps = {
  data: WeekRecapData;
  summary?: string | null;
};

// ── Shared bits ───────────────────────────────────────────────────────────────

function Background() {
  const frame = useCurrentFrame();
  const drift = interpolate(frame, [0, RECAP_DURATION], [0, 60]);
  return (
    <AbsoluteFill style={{ background: `linear-gradient(160deg, ${C.bgBase} 0%, ${C.bgDeep} 100%)` }}>
      <div
        style={{
          position: "absolute",
          width: 700,
          height: 700,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${C.teal}22 0%, transparent 70%)`,
          top: -250 + drift,
          right: -200,
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 600,
          height: 600,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${C.accent}14 0%, transparent 70%)`,
          bottom: -250,
          left: -150 + drift / 2,
        }}
      />
    </AbsoluteFill>
  );
}

/** Fades a scene in over its first 12 frames and out over its last 10. */
function SceneFade({ duration, children }: { duration: number; children: React.ReactNode }) {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 12, duration - 10, duration], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill
      style={{ opacity, justifyContent: "center", alignItems: "center", fontFamily: FONT }}
    >
      {children}
    </AbsoluteFill>
  );
}

function PopIn({ delay, children, style }: { delay: number; children: React.ReactNode; style?: React.CSSProperties }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 14, stiffness: 120 } });
  return (
    <div style={{ transform: `scale(${s}) translateY(${(1 - s) * 24}px)`, opacity: Math.min(1, s * 1.4), ...style }}>
      {children}
    </div>
  );
}

function Counter({ to, delay, style }: { to: number; delay: number; style?: React.CSSProperties }) {
  const frame = useCurrentFrame();
  const value = Math.round(
    interpolate(frame, [delay, delay + 50], [0, to], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    })
  );
  return <span style={style}>{value}</span>;
}

const labelStyle: React.CSSProperties = {
  fontSize: 22,
  letterSpacing: 6,
  textTransform: "uppercase",
  color: C.text3,
  fontWeight: 600,
};

// ── Scenes ────────────────────────────────────────────────────────────────────

function Intro({ data }: { data: WeekRecapData }) {
  return (
    <SceneFade duration={SCENES.intro.duration}>
      <PopIn delay={5}>
        <div style={{ textAlign: "center" }}>
          <p style={labelStyle}>LifeOS · Weekly Recap</p>
          <h1 style={{ fontSize: 84, color: C.cream, margin: "18px 0 10px", fontWeight: 700 }}>
            Your Week
          </h1>
          <p style={{ fontSize: 30, color: C.ice, margin: 0 }}>{data.weekLabel}</p>
        </div>
      </PopIn>
    </SceneFade>
  );
}

function TasksScene({ data }: { data: WeekRecapData }) {
  return (
    <SceneFade duration={SCENES.tasks.duration}>
      <div style={{ textAlign: "center" }}>
        <p style={labelStyle}>Tasks completed</p>
        <Counter
          to={data.tasksCompleted}
          delay={8}
          style={{ fontSize: 200, fontWeight: 700, color: C.accent, lineHeight: 1.1, display: "block" }}
        />
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12, alignItems: "center" }}>
          {data.completedTitles.slice(0, 4).map((t, i) => (
            <PopIn key={i} delay={30 + i * 8}>
              <div
                style={{
                  background: C.glass,
                  border: `1px solid ${C.glassBorder}`,
                  borderRadius: 14,
                  padding: "8px 22px",
                  color: C.text2,
                  fontSize: 22,
                  maxWidth: 700,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                ✓ {t}
              </div>
            </PopIn>
          ))}
          {data.tasksCompleted === 0 && (
            <PopIn delay={30}>
              <p style={{ color: C.text3, fontSize: 24 }}>A quiet week — fresh start ahead.</p>
            </PopIn>
          )}
        </div>
      </div>
    </SceneFade>
  );
}

function DaysScene({ data }: { data: WeekRecapData }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const max = Math.max(1, ...data.byDay.map((d) => d.count));
  return (
    <SceneFade duration={SCENES.days.duration}>
      <div style={{ textAlign: "center" }}>
        <p style={labelStyle}>Your rhythm</p>
        <div style={{ display: "flex", gap: 26, alignItems: "flex-end", height: 300, marginTop: 50 }}>
          {data.byDay.map((d, i) => {
            const s = spring({ frame: frame - 10 - i * 4, fps, config: { damping: 13 } });
            const h = Math.max(10, (d.count / max) * 240 * s);
            const isBest = d.day === data.bestDay && d.count > 0;
            return (
              <div key={d.day} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                <span style={{ color: isBest ? C.cream : C.text2, fontSize: 24, fontWeight: 600, opacity: s }}>
                  {d.count}
                </span>
                <div
                  style={{
                    width: 64,
                    height: h,
                    borderRadius: 14,
                    background: isBest
                      ? `linear-gradient(180deg, ${C.accentHot}, ${C.accent})`
                      : `linear-gradient(180deg, ${C.teal}, ${C.teal}66)`,
                    boxShadow: isBest ? `0 0 34px ${C.accent}55` : "none",
                  }}
                />
                <span style={{ color: isBest ? C.cream : C.text3, fontSize: 20, fontWeight: isBest ? 700 : 400 }}>
                  {d.day}
                </span>
              </div>
            );
          })}
        </div>
        {data.bestDay && (
          <PopIn delay={45}>
            <p style={{ color: C.ice, fontSize: 26, marginTop: 36 }}>
              {data.bestDay} was your power day 🔥
            </p>
          </PopIn>
        )}
      </div>
    </SceneFade>
  );
}

function ProjectsScene({ data }: { data: WeekRecapData }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const max = Math.max(1, ...data.projects.map((p) => p.completed));
  return (
    <SceneFade duration={SCENES.projects.duration}>
      <div style={{ width: 760 }}>
        <p style={{ ...labelStyle, textAlign: "center" }}>Where the work went</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 20, marginTop: 46 }}>
          {data.projects.length === 0 && (
            <PopIn delay={15}>
              <p style={{ color: C.text3, fontSize: 26, textAlign: "center" }}>
                Loose tasks only — no project work logged this week.
              </p>
            </PopIn>
          )}
          {data.projects.map((p, i) => {
            const s = spring({ frame: frame - 12 - i * 7, fps, config: { damping: 15 } });
            return (
              <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 18, opacity: Math.min(1, s * 1.3) }}>
                <span
                  style={{
                    width: 210,
                    textAlign: "right",
                    color: C.text2,
                    fontSize: 24,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {p.name}
                </span>
                <div
                  style={{
                    height: 36,
                    width: (p.completed / max) * 430 * s,
                    minWidth: 36,
                    borderRadius: 12,
                    background: `linear-gradient(90deg, ${p.color ?? C.teal}, ${p.color ?? C.teal}88)`,
                    border: `1px solid ${C.glassBorder}`,
                  }}
                />
                <span style={{ color: C.cream, fontSize: 26, fontWeight: 700 }}>{p.completed}</span>
              </div>
            );
          })}
        </div>
      </div>
    </SceneFade>
  );
}

function CaptureScene({ data }: { data: WeekRecapData }) {
  const tiles = [
    { label: "Ideas captured", value: data.ideasCaptured, color: C.amber },
    { label: "Notes touched", value: data.notesTouched, color: C.ice },
    { label: "Events", value: data.eventsCount, color: C.teal },
    { label: "Tasks added", value: data.tasksCreated, color: C.accent },
  ];
  return (
    <SceneFade duration={SCENES.capture.duration}>
      <div style={{ textAlign: "center" }}>
        <p style={labelStyle}>Captured along the way</p>
        <div style={{ display: "flex", gap: 26, marginTop: 50 }}>
          {tiles.map((t, i) => (
            <PopIn key={t.label} delay={10 + i * 7}>
              <div
                style={{
                  width: 220,
                  padding: "36px 0",
                  borderRadius: 24,
                  background: C.glass,
                  border: `1px solid ${C.glassBorder}`,
                  backdropFilter: "blur(20px)",
                }}
              >
                <Counter to={t.value} delay={14 + i * 7} style={{ fontSize: 72, fontWeight: 700, color: t.color }} />
                <p style={{ color: C.text3, fontSize: 20, marginTop: 8 }}>{t.label}</p>
              </div>
            </PopIn>
          ))}
        </div>
      </div>
    </SceneFade>
  );
}

function Outro({ data, summary }: RecapProps) {
  return (
    <SceneFade duration={SCENES.outro.duration}>
      <div style={{ textAlign: "center", maxWidth: 860 }}>
        <PopIn delay={5}>
          <p style={{ fontSize: 40, color: C.cream, lineHeight: 1.45, fontWeight: 500 }}>
            {summary ||
              (data.tasksCompleted > 0
                ? `${data.tasksCompleted} task${data.tasksCompleted === 1 ? "" : "s"} done. Keep the streak alive.`
                : "Next week is a blank page. Make it count.")}
          </p>
        </PopIn>
        <PopIn delay={28}>
          <p style={{ ...labelStyle, marginTop: 44 }}>— LifeOS —</p>
        </PopIn>
      </div>
    </SceneFade>
  );
}

// ── Composition ───────────────────────────────────────────────────────────────

export function RecapComposition({ data, summary }: RecapProps) {
  return (
    <AbsoluteFill>
      <Background />
      <Sequence from={SCENES.intro.from} durationInFrames={SCENES.intro.duration}>
        <Intro data={data} />
      </Sequence>
      <Sequence from={SCENES.tasks.from} durationInFrames={SCENES.tasks.duration}>
        <TasksScene data={data} />
      </Sequence>
      <Sequence from={SCENES.days.from} durationInFrames={SCENES.days.duration}>
        <DaysScene data={data} />
      </Sequence>
      <Sequence from={SCENES.projects.from} durationInFrames={SCENES.projects.duration}>
        <ProjectsScene data={data} />
      </Sequence>
      <Sequence from={SCENES.capture.from} durationInFrames={SCENES.capture.duration}>
        <CaptureScene data={data} />
      </Sequence>
      <Sequence from={SCENES.outro.from} durationInFrames={SCENES.outro.duration}>
        <Outro data={data} summary={summary} />
      </Sequence>
    </AbsoluteFill>
  );
}
