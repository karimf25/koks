/**
 * Stateless MCP server via JSON-RPC over HTTP POST.
 * Implements: initialize, tools/list, tools/call
 * Auth: Bearer token matching MCP_API_KEY env var.
 */

import { NextRequest, NextResponse } from "next/server";
import { getTasks, createTask, updateTask, deleteTask, getTaskStats } from "@/lib/tasks";
import { getProjects, createProject } from "@/lib/projects";
import { getIdeas, createIdea, updateIdea } from "@/lib/ideas";
import { getEvents, getTodayEvents } from "@/lib/events";
import { getMemoryFiles, getMemoryFileByPath, createMemoryFile, updateMemoryFile } from "@/lib/memory";
import { getLatestFocusRun, runFocusEngine } from "@/lib/focus";

// ── Tool definitions ─────────────────────────────────────────────────────────

const TOOLS = [
  {
    name: "get_task_stats",
    description: "Get task statistics (total, today, this week)",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "list_tasks",
    description: "List tasks with optional filters",
    inputSchema: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["todo", "in_progress", "done", "cancelled"] },
        priority: { type: "number" },
        projectId: { type: "string" },
      },
    },
  },
  {
    name: "create_task",
    description: "Create a new task",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string" },
        priority: { type: "number" },
        dueDate: { type: "string" },
        projectId: { type: "string" },
        description: { type: "string" },
      },
      required: ["title"],
    },
  },
  {
    name: "update_task",
    description: "Update a task",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string" },
        status: { type: "string", enum: ["todo", "in_progress", "done", "cancelled"] },
        title: { type: "string" },
        priority: { type: "number" },
      },
      required: ["id"],
    },
  },
  {
    name: "delete_task",
    description: "Delete a task",
    inputSchema: { type: "object", properties: { id: { type: "string" } }, required: ["id"] },
  },
  {
    name: "list_projects",
    description: "List projects",
    inputSchema: {
      type: "object",
      properties: { status: { type: "string" } },
    },
  },
  {
    name: "create_project",
    description: "Create a project",
    inputSchema: {
      type: "object",
      properties: { name: { type: "string" }, area: { type: "string" }, description: { type: "string" } },
      required: ["name"],
    },
  },
  {
    name: "list_ideas",
    description: "List ideas",
    inputSchema: {
      type: "object",
      properties: { status: { type: "string", enum: ["inbox", "promoted", "parked", "dropped"] } },
    },
  },
  {
    name: "capture_idea",
    description: "Capture a new idea",
    inputSchema: {
      type: "object",
      properties: { title: { type: "string" }, body: { type: "string" } },
      required: ["title"],
    },
  },
  {
    name: "triage_idea",
    description: "Change an idea's status",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string" },
        status: { type: "string", enum: ["inbox", "promoted", "parked", "dropped"] },
      },
      required: ["id", "status"],
    },
  },
  {
    name: "list_events",
    description: "List events. Pass from/to as ISO date strings.",
    inputSchema: {
      type: "object",
      properties: { from: { type: "string" }, to: { type: "string" } },
    },
  },
  {
    name: "today_events",
    description: "Get today's events",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "search_memory",
    description: "Search memory files",
    inputSchema: {
      type: "object",
      properties: { search: { type: "string" }, kind: { type: "string" } },
    },
  },
  {
    name: "read_memory_file",
    description: "Read a memory file by path",
    inputSchema: { type: "object", properties: { path: { type: "string" } }, required: ["path"] },
  },
  {
    name: "write_memory_file",
    description: "Create or update a memory file",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string" },
        title: { type: "string" },
        content: { type: "string" },
        kind: { type: "string" },
        summary: { type: "string" },
      },
      required: ["path", "title", "content"],
    },
  },
  {
    name: "get_focus",
    description: "Get the latest focus run",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "run_focus_engine",
    description: "Run the AI focus engine (requires ANTHROPIC_API_KEY)",
    inputSchema: { type: "object", properties: {} },
  },
] as const;

// ── Tool executor ─────────────────────────────────────────────────────────────

async function callTool(name: string, input: Record<string, any>): Promise<string> {
  switch (name) {
    case "get_task_stats":
      return JSON.stringify(await getTaskStats());
    case "list_tasks":
      return JSON.stringify(await getTasks(input));
    case "create_task":
      return JSON.stringify(await createTask(input as any));
    case "update_task": {
      const { id, ...rest } = input;
      return JSON.stringify(await updateTask(id, rest as any));
    }
    case "delete_task":
      await deleteTask(input.id);
      return "deleted";
    case "list_projects":
      return JSON.stringify(await getProjects(input));
    case "create_project":
      return JSON.stringify(await createProject(input as any));
    case "list_ideas":
      return JSON.stringify(await getIdeas(input));
    case "capture_idea":
      return JSON.stringify(await createIdea(input as any));
    case "triage_idea":
      return JSON.stringify(await updateIdea(input.id, { status: input.status }));
    case "list_events":
      return JSON.stringify(await getEvents(input));
    case "today_events":
      return JSON.stringify(await getTodayEvents());
    case "search_memory":
      return JSON.stringify(await getMemoryFiles(input));
    case "read_memory_file": {
      const f = await getMemoryFileByPath(input.path);
      return f ? f.contentText : "not found";
    }
    case "write_memory_file": {
      const { path, title, content, kind, summary } = input;
      const existing = await getMemoryFileByPath(path);
      if (existing) {
        return JSON.stringify(await updateMemoryFile(existing.id, { title, contentText: content, kind, summary }));
      }
      return JSON.stringify(await createMemoryFile({ path, title, contentText: content, kind, summary }));
    }
    case "get_focus":
      return JSON.stringify(await getLatestFocusRun());
    case "run_focus_engine":
      if (!process.env.ANTHROPIC_API_KEY) return "ANTHROPIC_API_KEY not set";
      return (await runFocusEngine()).briefingMd;
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// ── JSON-RPC handler ──────────────────────────────────────────────────────────

function jsonrpc(id: string | number | null, result: unknown) {
  return NextResponse.json({ jsonrpc: "2.0", id, result });
}

function jsonrpcError(id: string | number | null, code: number, message: string) {
  return NextResponse.json({ jsonrpc: "2.0", id, error: { code, message } });
}

function auth(request: NextRequest) {
  const key = request.headers.get("authorization")?.replace("Bearer ", "");
  return key === process.env.MCP_API_KEY;
}

export async function POST(request: NextRequest) {
  if (!auth(request)) return jsonrpcError(null, -32001, "Unauthorized");

  let body: any;
  try {
    body = await request.json();
  } catch {
    return jsonrpcError(null, -32700, "Parse error");
  }

  const { id, method, params } = body;

  try {
    if (method === "initialize") {
      return jsonrpc(id, {
        protocolVersion: "2024-11-05",
        serverInfo: { name: "lifeos", version: "1.0.0" },
        capabilities: { tools: {} },
      });
    }

    if (method === "tools/list") {
      return jsonrpc(id, { tools: TOOLS });
    }

    if (method === "tools/call") {
      const { name, arguments: args } = params ?? {};
      const text = await callTool(name, args ?? {});
      return jsonrpc(id, { content: [{ type: "text", text }] });
    }

    return jsonrpcError(id, -32601, `Method not found: ${method}`);
  } catch (err) {
    console.error("MCP error:", err);
    return jsonrpcError(id, -32603, String(err));
  }
}

export async function GET() {
  return NextResponse.json({
    name: "lifeos-mcp",
    version: "1.0.0",
    transport: "http-post",
    endpoint: "/api/mcp",
  });
}
