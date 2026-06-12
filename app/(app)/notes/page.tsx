import { Metadata } from "next";
import { getNotes } from "@/lib/notes";
import { getProjects } from "@/lib/projects";
import { serializeNote, serializeProject } from "@/lib/serialize";
import { NotesView } from "./_components/NotesView";

export const metadata: Metadata = { title: "Notes — LifeOS" };

export default async function NotesPage() {
  const [rawNotes, rawProjects] = await Promise.all([getNotes(), getProjects()]);
  const notes = rawNotes.map(serializeNote);
  const projects = rawProjects.map(serializeProject);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--cream)]">Notes</h1>
        <p className="text-sm text-[var(--text-3)] mt-1">
          {notes.length} note{notes.length !== 1 ? "s" : ""} · Markdown, linked to projects
        </p>
      </div>
      <NotesView initialNotes={notes} projects={projects} />
    </div>
  );
}
