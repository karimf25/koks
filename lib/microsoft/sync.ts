import {
  getValidAccessToken,
  listAllTasks,
  createTask as msCreateTask,
  updateTask as msUpdateTask,
  type MsTask,
  type MsTaskBody,
} from "./graph";
import {
  createTask,
  updateTask,
  getTasksByMsListId,
  getPushableTasks,
} from "@/lib/tasks";
import {
  getIntegration,
  updateIntegrationMetadata,
  type MicrosoftMeta,
} from "@/lib/integrations";
import type { Task } from "@/db";

// Sync direction: two-way (last-write-wins by modified time).

export type SyncResult = {
  ok: boolean;
  pulled: number; // tasks created/updated in LifeOS from Microsoft
  pushed: number; // tasks created/updated in Microsoft from LifeOS
  created: number; // brand-new tasks created on either side
  cancelled: number; // tasks cancelled in LifeOS because removed from Microsoft
  error?: string;
};

// ── Field mapping ───────────────────────────────────────────────────────────────

function msStatusToLifeos(s: MsTask["status"]): Task["status"] {
  if (s === "completed") return "done";
  if (s === "inProgress") return "in_progress";
  return "todo";
}

function lifeosStatusToMs(s: Task["status"]): MsTask["status"] {
  if (s === "done") return "completed";
  if (s === "in_progress") return "inProgress";
  return "notStarted";
}

function msImportanceToPriority(i: MsTask["importance"]): number {
  return i === "high" ? 1 : i === "low" ? 3 : 2;
}

function priorityToMsImportance(p: number): MsTask["importance"] {
  return p === 1 ? "high" : p === 3 ? "low" : "normal";
}

function msDue(ms: MsTask): string | null {
  if (!ms.dueDateTime?.dateTime) return null;
  // Microsoft returns e.g. "2026-06-15T00:00:00.0000000" + timeZone
  const d = new Date(`${ms.dueDateTime.dateTime}Z`);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

function lifeosTaskToMsBody(t: Task): MsTaskBody {
  const body: MsTaskBody = {
    title: t.title,
    status: lifeosStatusToMs(t.status as Task["status"]),
    importance: priorityToMsImportance(t.priority),
  };
  if (t.description) body.body = { content: t.description, contentType: "text" };
  if (t.dueDate) {
    body.dueDateTime = { dateTime: new Date(t.dueDate).toISOString().replace("Z", "0000000"), timeZone: "UTC" };
  }
  return body;
}

// ── Engine ───────────────────────────────────────────────────────────────────────

export async function syncMicrosoftTodo(): Promise<SyncResult> {
  const result: SyncResult = { ok: false, pulled: 0, pushed: 0, created: 0, cancelled: 0 };

  try {
    const token = await getValidAccessToken();
    if (!token) throw new Error("Not connected to Microsoft");

    const integ = await getIntegration("microsoft");
    const meta = (integ?.metadata as MicrosoftMeta) ?? {};
    const listId = meta.listId;
    if (!listId) throw new Error("No Microsoft To Do list selected");

    const msTasks = await listAllTasks(token, listId);
    const msById = new Map(msTasks.map((m) => [m.id, m]));

    const linked = await getTasksByMsListId(listId);
    const linkedByMsId = new Map(linked.filter((t) => t.msTodoId).map((t) => [t.msTodoId as string, t]));

    // ── Inbound: Microsoft → LifeOS ───────────────────────────────────────────
    for (const ms of msTasks) {
      const existing = linkedByMsId.get(ms.id);
      if (!existing) {
        // New task from Microsoft → create in LifeOS
        await createTask({
          title: ms.title,
          description: ms.body?.content || undefined,
          priority: msImportanceToPriority(ms.importance),
          status: msStatusToLifeos(ms.status),
          dueDate: msDue(ms),
          source: "microsoft",
          msTodoId: ms.id,
          msListId: listId,
          completedAt: ms.completedDateTime?.dateTime
            ? new Date(`${ms.completedDateTime.dateTime}Z`)
            : null,
        });
        result.created++;
        result.pulled++;
      } else {
        // Existing link → last-write-wins
        const msModified = new Date(ms.lastModifiedDateTime).getTime();
        const lifeosModified = existing.updatedAt.getTime();
        if (msModified > lifeosModified) {
          await updateTask(existing.id, {
            title: ms.title,
            description: ms.body?.content || undefined,
            priority: msImportanceToPriority(ms.importance),
            status: msStatusToLifeos(ms.status),
            dueDate: msDue(ms),
            completedAt: ms.completedDateTime?.dateTime
              ? new Date(`${ms.completedDateTime.dateTime}Z`)
              : null,
          });
          result.pulled++;
        }
      }
    }

    // ── Outbound: LifeOS → Microsoft (for already-linked tasks) ────────────────
    for (const t of linked) {
      if (!t.msTodoId) continue;
      const ms = msById.get(t.msTodoId);
      if (!ms) {
        // Task was deleted in Microsoft → cancel in LifeOS (conservative; no hard delete)
        if (t.status !== "cancelled") {
          await updateTask(t.id, { status: "cancelled" });
          result.cancelled++;
        }
        continue;
      }
      const msModified = new Date(ms.lastModifiedDateTime).getTime();
      const lifeosModified = t.updatedAt.getTime();
      if (lifeosModified > msModified) {
        await msUpdateTask(token, listId, t.msTodoId, lifeosTaskToMsBody(t));
        result.pushed++;
      }
    }

    // ── Outbound new: loose LifeOS tasks → Microsoft ──────────────────────────
    const pushable = await getPushableTasks();
    for (const t of pushable) {
      const created = await msCreateTask(token, listId, lifeosTaskToMsBody(t));
      await updateTask(t.id, { msTodoId: created.id, msListId: listId });
      result.created++;
      result.pushed++;
    }

    result.ok = true;
  } catch (err) {
    result.error = err instanceof Error ? err.message : String(err);
  }

  // Record outcome on the integration
  await updateIntegrationMetadata("microsoft", {
    lastSyncedAt: new Date().toISOString(),
    lastResult: {
      at: new Date().toISOString(),
      pulled: result.pulled,
      pushed: result.pushed,
      created: result.created,
      ok: result.ok,
      ...(result.error ? { error: result.error } : {}),
    },
  }).catch(() => {});

  return result;
}
