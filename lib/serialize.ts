import type { Task, Project, Event, FocusRun, Idea, MemoryFile, Note, Mindmap, Automation, AgentRun, Attachment, TaskGroup } from "@/db";

export type SerializedTask = Omit<Task, "dueDate" | "createdAt" | "updatedAt" | "completedAt"> & {
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
};

export type SerializedProject = Omit<Project, "lastTouchedAt" | "createdAt" | "updatedAt"> & {
  lastTouchedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SerializedEvent = Omit<Event, "start" | "end" | "createdAt" | "updatedAt"> & {
  start: string;
  end: string;
  createdAt: string;
  updatedAt: string;
};

export type SerializedFocusRun = Omit<FocusRun, "runAt"> & { runAt: string };

function iso(d: Date | string | null | undefined): string | null {
  if (!d) return null;
  return d instanceof Date ? d.toISOString() : d;
}

function isoReq(d: Date | string): string {
  return d instanceof Date ? d.toISOString() : d;
}

export function serializeTask(t: Task): SerializedTask {
  return {
    ...t,
    dueDate: iso(t.dueDate),
    createdAt: isoReq(t.createdAt),
    updatedAt: isoReq(t.updatedAt),
    completedAt: iso(t.completedAt),
  };
}

export function serializeProject(p: Project): SerializedProject {
  return {
    ...p,
    lastTouchedAt: iso(p.lastTouchedAt),
    createdAt: isoReq(p.createdAt),
    updatedAt: isoReq(p.updatedAt),
  };
}

export function serializeEvent(e: Event): SerializedEvent {
  return {
    ...e,
    start: isoReq(e.start),
    end: isoReq(e.end),
    createdAt: isoReq(e.createdAt),
    updatedAt: isoReq(e.updatedAt),
  };
}

export function serializeFocusRun(f: FocusRun): SerializedFocusRun {
  return { ...f, runAt: isoReq(f.runAt) };
}

export type SerializedIdea = Omit<Idea, "createdAt" | "updatedAt"> & {
  createdAt: string;
  updatedAt: string;
};

export function serializeIdea(i: Idea): SerializedIdea {
  return { ...i, createdAt: isoReq(i.createdAt), updatedAt: isoReq(i.updatedAt) };
}

export type SerializedMemoryFile = Omit<MemoryFile, "createdAt" | "updatedAt"> & {
  createdAt: string;
  updatedAt: string;
};

export function serializeMemoryFile(m: MemoryFile): SerializedMemoryFile {
  return { ...m, createdAt: isoReq(m.createdAt), updatedAt: isoReq(m.updatedAt) };
}

export type SerializedNote = Omit<Note, "createdAt" | "updatedAt"> & {
  createdAt: string;
  updatedAt: string;
};

export function serializeNote(n: Note): SerializedNote {
  return { ...n, createdAt: isoReq(n.createdAt), updatedAt: isoReq(n.updatedAt) };
}

export type SerializedMindmap = Omit<Mindmap, "createdAt" | "updatedAt"> & {
  createdAt: string;
  updatedAt: string;
};

export function serializeMindmap(m: Mindmap): SerializedMindmap {
  return { ...m, createdAt: isoReq(m.createdAt), updatedAt: isoReq(m.updatedAt) };
}

export type SerializedAutomation = Omit<Automation, "lastRunAt" | "createdAt"> & {
  lastRunAt: string | null;
  createdAt: string;
};

export function serializeAutomation(a: Automation): SerializedAutomation {
  return { ...a, lastRunAt: iso(a.lastRunAt), createdAt: isoReq(a.createdAt) };
}

export type SerializedAgentRun = Omit<AgentRun, "startedAt" | "finishedAt"> & {
  startedAt: string;
  finishedAt: string | null;
};

export function serializeAgentRun(r: AgentRun): SerializedAgentRun {
  return { ...r, startedAt: isoReq(r.startedAt), finishedAt: iso(r.finishedAt) };
}

export type SerializedAttachment = Omit<Attachment, "createdAt"> & { createdAt: string };

export function serializeAttachment(a: Attachment): SerializedAttachment {
  return { ...a, createdAt: isoReq(a.createdAt) };
}

export type SerializedTaskGroup = Omit<TaskGroup, "createdAt"> & { createdAt: string };

export function serializeTaskGroup(g: TaskGroup): SerializedTaskGroup {
  return { ...g, createdAt: isoReq(g.createdAt) };
}
