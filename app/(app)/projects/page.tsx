import { Metadata } from "next";
import { getProjectsWithTaskCount } from "@/lib/projects";
import { serializeProject } from "@/lib/serialize";
import { ProjectGrid } from "./_components/ProjectGrid";

export const metadata: Metadata = { title: "Projects — LifeOS" };

export default async function ProjectsPage() {
  const rawProjects = await getProjectsWithTaskCount();
  const projects = rawProjects.map((p) => ({ ...serializeProject(p), taskCount: p.taskCount }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--cream)]">Projects</h1>
        <p className="text-sm text-[var(--text-3)] mt-1">
          {projects.length} project{projects.length !== 1 ? "s" : ""} across all areas
        </p>
      </div>
      <ProjectGrid initialProjects={projects} />
    </div>
  );
}
