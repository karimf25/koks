export const AREAS = [
  { value: "uni", label: "University" },
  { value: "work", label: "Work" },
  { value: "sports", label: "Sports" },
  { value: "side-project", label: "Side Project" },
  { value: "personal", label: "Personal" },
  { value: "other", label: "Other" },
] as const;

export const AREA_COLORS: Record<string, string> = {
  uni: "var(--teal)",
  work: "var(--accent)",
  sports: "var(--amber)",
  "side-project": "var(--ice)",
  personal: "var(--gold)",
  other: "var(--slate)",
};
