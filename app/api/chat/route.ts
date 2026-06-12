import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getTasks, createTask, updateTask } from "@/lib/tasks";
import { getProjects } from "@/lib/projects";
import { getIdeas, createIdea } from "@/lib/ideas";
import { getEvents } from "@/lib/events";
import { getMemoryFiles, createMemoryFile, updateMemoryFile } from "@/lib/memory";
import { getNotes, getNote, createNote, updateNote } from "@/lib/notes";
import { getLatestFocusRun } from "@/lib/focus";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const tools: Anthropic.Tool[] = [
  {
    name: "list_tasks",
    description: "List tasks with optional filters",
    input_schema: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["todo", "in_progress", "done", "cancelled"] },
        priority: { type: "number", enum: [1, 2, 3] },
      },
    },
  },
  {
    name: "create_task",
    description: "Create a new task",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string" },
        priority: { type: "number", enum: [1, 2, 3] },
        dueDate: { type: "string", description: "ISO date string" },
        projectId: { type: "string" },
      },
      required: ["title"],
    },
  },
  {
    name: "complete_task",
    description: "Mark a task as done",
    input_schema: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
    },
  },
  {
    name: "list_projects",
    description: "List active projects",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "list_ideas",
    description: "List ideas from the inbox",
    input_schema: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["inbox", "promoted", "parked", "dropped"] },
      },
    },
  },
  {
    name: "capture_idea",
    description: "Capture a new idea",
    input_schema: {
      type: "object",
      properties: { title: { type: "string" }, body: { type: "string" } },
      required: ["title"],
    },
  },
  {
    name: "list_events",
    description: "List events for a date range",
    input_schema: {
      type: "object",
      properties: {
        from: { type: "string", description: "ISO date string" },
        to: { type: "string", description: "ISO date string" },
      },
    },
  },
  {
    name: "read_memory",
    description: "Search memory files",
    input_schema: {
      type: "object",
      properties: { search: { type: "string" } },
    },
  },
  {
    name: "save_memory",
    description: "Save a note or decision to the Memory Vault",
    input_schema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Unique path like 'decisions/auth-2026'" },
        title: { type: "string" },
        content: { type: "string" },
        kind: { type: "string", enum: ["conversation", "decision", "spec", "reference"] },
      },
      required: ["path", "title", "content"],
    },
  },
  {
    name: "get_focus",
    description: "Get the latest focus run briefing",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "list_notes",
    description: "List notes, optionally filtered by a search term",
    input_schema: {
      type: "object",
      properties: { search: { type: "string" } },
    },
  },
  {
    name: "save_note",
    description: "Create a new note, or update an existing one when an id is provided",
    input_schema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Provide to update an existing note" },
        title: { type: "string" },
        content: { type: "string", description: "Markdown body" },
        projectId: { type: "string" },
      },
      required: ["title"],
    },
  },
];

async function executeTool(name: string, input: Record<string, any>): Promise<string> {
  try {
    switch (name) {
      case "list_tasks":
        return JSON.stringify(await getTasks(input));
      case "create_task":
        return JSON.stringify(await createTask(input as any));
      case "complete_task":
        return JSON.stringify(await updateTask(input.id, { status: "done" }));
      case "list_projects":
        return JSON.stringify(await getProjects({ status: "active" }));
      case "list_ideas":
        return JSON.stringify(await getIdeas(input));
      case "capture_idea":
        return JSON.stringify(await createIdea({ title: input.title, body: input.body }));
      case "list_events":
        return JSON.stringify(await getEvents(input));
      case "read_memory":
        return JSON.stringify(await getMemoryFiles({ search: input.search }));
      case "save_memory": {
        const existing = await getMemoryFiles({ search: input.path });
        const match = existing.find((f) => f.path === input.path);
        if (match) {
          return JSON.stringify(
            await updateMemoryFile(match.id, { title: input.title, contentText: input.content, kind: input.kind })
          );
        }
        return JSON.stringify(
          await createMemoryFile({ path: input.path, title: input.title, contentText: input.content, kind: input.kind })
        );
      }
      case "get_focus":
        return JSON.stringify(await getLatestFocusRun());
      case "list_notes":
        return JSON.stringify(await getNotes({ search: input.search }));
      case "save_note": {
        if (input.id) {
          const existing = await getNote(input.id);
          if (!existing) return JSON.stringify({ error: "Note not found" });
          return JSON.stringify(
            await updateNote(input.id, {
              title: input.title,
              content: input.content,
              projectId: input.projectId,
            })
          );
        }
        return JSON.stringify(
          await createNote({ title: input.title, content: input.content, projectId: input.projectId })
        );
      }
      default:
        return JSON.stringify({ error: "Unknown tool" });
    }
  } catch (err) {
    return JSON.stringify({ error: String(err) });
  }
}

export async function POST(request: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY is not set" }, { status: 503 });
  }

  const { messages } = await request.json();

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));

      try {
        let currentMessages: Anthropic.MessageParam[] = messages;

        // Agentic loop — keep going until stop_reason is "end_turn"
        while (true) {
          const response = await client.messages.create({
            model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6",
            max_tokens: 4096,
            system: `You are the built-in AI assistant for LifeOS, a personal life management platform. You have full access to the user's tasks, projects, ideas, events, and memory vault through tools. Be concise, helpful, and proactive. Today is ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}.`,
            tools,
            messages: currentMessages,
            stream: true,
          });

          let assistantContent: any[] = [];
          let inputAccumulator: Record<string, string> = {};
          let currentToolId = "";
          let currentToolName = "";

          for await (const event of response) {
            if (event.type === "content_block_start") {
              if (event.content_block.type === "text") {
                assistantContent.push({ type: "text", text: "" });
              } else if (event.content_block.type === "tool_use") {
                currentToolId = event.content_block.id;
                currentToolName = event.content_block.name;
                inputAccumulator[currentToolId] = "";
                assistantContent.push({
                  type: "tool_use",
                  id: currentToolId,
                  name: currentToolName,
                  input: {},
                });
                send({ type: "tool_start", name: currentToolName });
              }
            } else if (event.type === "content_block_delta") {
              const last = assistantContent[assistantContent.length - 1];
              if (event.delta.type === "text_delta" && last?.type === "text") {
                last.text += event.delta.text;
                send({ type: "text", text: event.delta.text });
              } else if (event.delta.type === "input_json_delta") {
                inputAccumulator[currentToolId] = (inputAccumulator[currentToolId] ?? "") + event.delta.partial_json;
              }
            } else if (event.type === "content_block_stop") {
              const last = assistantContent[assistantContent.length - 1];
              if (last?.type === "tool_use") {
                try {
                  last.input = JSON.parse(inputAccumulator[last.id] ?? "{}");
                } catch {}
              }
            } else if (event.type === "message_delta") {
              if (event.delta.stop_reason === "end_turn") {
                send({ type: "done" });
                controller.close();
                return;
              }
              if (event.delta.stop_reason === "tool_use") {
                // Execute all tool calls
                const toolUses = assistantContent.filter((b) => b.type === "tool_use") as any[];
                const toolResults: Anthropic.ToolResultBlockParam[] = await Promise.all(
                  toolUses.map(async (tu) => ({
                    type: "tool_result" as const,
                    tool_use_id: tu.id,
                    content: await executeTool(tu.name, tu.input as Record<string, any>),
                  }))
                );

                currentMessages = [
                  ...currentMessages,
                  { role: "assistant", content: assistantContent },
                  { role: "user", content: toolResults },
                ];
                break; // continue the while loop
              }
            }
          }
        }
      } catch (err) {
        send({ type: "error", message: String(err) });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
