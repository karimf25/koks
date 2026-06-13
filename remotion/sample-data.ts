import type { WeekRecapData } from "@/lib/recap";

/** Representative data so the composition is previewable in Remotion Studio and
 *  the local render test produces a meaningful video. Real props are injected
 *  at render time. */
export const SAMPLE_RECAP: WeekRecapData = {
  weekStart: "2026-06-08T00:00:00.000Z",
  weekEnd: "2026-06-14T23:59:59.000Z",
  weekLabel: "Jun 8 – Jun 14, 2026",
  isCurrentWeek: true,
  tasksCompleted: 12,
  completedTitles: [
    "Ship LifeOS Phase 5",
    "EmpowerU landing page",
    "Mech II tutorial 1-3",
    "Grocery run",
  ],
  tasksCreated: 18,
  ideasCaptured: 4,
  notesTouched: 6,
  eventsCount: 9,
  projects: [
    { name: "EmpowerU", color: "#F27405", completed: 5 },
    { name: "University", color: "#20878E", completed: 4 },
    { name: "Personal", color: "#D98D30", completed: 3 },
  ],
  byDay: [
    { day: "Mon", count: 1 },
    { day: "Tue", count: 3 },
    { day: "Wed", count: 2 },
    { day: "Thu", count: 4 },
    { day: "Fri", count: 1 },
    { day: "Sat", count: 1 },
    { day: "Sun", count: 0 },
  ],
  bestDay: "Thu",
};
