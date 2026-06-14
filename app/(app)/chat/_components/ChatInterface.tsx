"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { motion, AnimatePresence } from "motion/react";
import { GlassCard, GlassButton } from "@/components/glass";
import { Send, Bot, User, Wrench, AlertCircle, Sparkles, Mic, MicOff } from "lucide-react";

type Message =
  | { role: "user"; content: string }
  | { role: "assistant"; parts: Part[] };

type Part =
  | { type: "text"; text: string }
  | { type: "tool"; name: string }
  | { type: "error"; message: string };

const spring = { type: "spring", stiffness: 260, damping: 26 } as const;

const SUGGESTIONS = [
  "What are my top priority tasks today?",
  "Show me this week's schedule",
  "What ideas are in my inbox?",
  "Summarize my active projects",
];

export function ChatInterface({ hasApiKey }: { hasApiKey: boolean }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [sessionTokens, setSessionTokens] = useState(0);
  const [listening, setListening] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  const toggleVoice = () => {
    const SpeechRecognition = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput((prev) => (prev ? prev + " " + transcript : transcript));
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);

    recognition.start();
    setListening(true);
  };

  // Scroll the messages container only — NOT the whole document. scrollIntoView
  // would scroll the page on mobile, sliding the header/title out of view.
  useEffect(() => {
    if (messages.length === 0) return;
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || streaming) return;
    setInput("");

    const userMsg: Message = { role: "user", content };
    setMessages((prev) => [...prev, userMsg]);

    const apiMessages = [...messages, userMsg].map((m) => ({
      role: m.role,
      content:
        m.role === "user"
          ? m.content
          : m.parts
              .filter((p) => p.type === "text")
              .map((p) => (p as { type: "text"; text: string }).text)
              .join(""),
    }));

    const assistantIdx = messages.length + 1; // position after user msg
    setMessages((prev) => [...prev, { role: "assistant", parts: [] }]);
    setStreaming(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages }),
      });

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = JSON.parse(line.slice(6));

          setMessages((prev) => {
            const msgs = [...prev];
            const last = msgs[msgs.length - 1];
            if (last.role !== "assistant") return msgs;
            const parts = [...last.parts];

            if (data.type === "text") {
              const lastPart = parts[parts.length - 1];
              if (lastPart?.type === "text") {
                parts[parts.length - 1] = { type: "text", text: lastPart.text + data.text };
              } else {
                parts.push({ type: "text", text: data.text });
              }
            } else if (data.type === "tool_start") {
              parts.push({ type: "tool", name: data.name });
            } else if (data.type === "error") {
              parts.push({ type: "error", message: data.message });
            } else if (data.type === "usage") {
              setSessionTokens((n) => n + (data.outputTokens ?? 0));
            }

            msgs[msgs.length - 1] = { role: "assistant", parts };
            return msgs;
          });
        }
      }
    } catch (err) {
      setMessages((prev) => {
        const msgs = [...prev];
        const last = msgs[msgs.length - 1];
        if (last.role === "assistant") {
          msgs[msgs.length - 1] = {
            role: "assistant",
            parts: [{ type: "error", message: String(err) }],
          };
        }
        return msgs;
      });
    } finally {
      setStreaming(false);
    }
  };

  if (!hasApiKey) {
    return (
      <div className="glass-card flex flex-col items-center justify-center py-20 gap-4">
        <AlertCircle className="w-8 h-8 text-[var(--accent)]" />
        <div className="text-center">
          <p className="text-sm font-medium text-[var(--text)]">Anthropic API key required</p>
          <p className="text-xs text-[var(--text-3)] mt-1">
            Add <code className="bg-[var(--glass-strong)] px-1 rounded">ANTHROPIC_API_KEY</code> to your{" "}
            <code className="bg-[var(--glass-strong)] px-1 rounded">.env.local</code> and restart the server
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-20rem)] lg:h-[calc(100vh-12rem)]">
      {/* Usage strip */}
      {sessionTokens > 0 && (
        <div className="flex justify-end mb-2">
          <span className="text-[10px] font-mono text-[var(--text-3)] px-2 py-0.5 rounded-full bg-[var(--glass-strong)]">
            ~{sessionTokens.toLocaleString()} tokens this session
          </span>
        </div>
      )}
      {/* Messages */}
      <div ref={listRef} className="flex-1 overflow-y-auto flex flex-col gap-4 pb-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center flex-1 gap-6 py-12">
            <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-[var(--glass-strong)] border border-[var(--glass-border)]">
              <Sparkles className="w-6 h-6 text-[var(--accent)]" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-[var(--text)]">Your AI chief of staff</p>
              <p className="text-xs text-[var(--text-3)] mt-1">Ask about tasks, projects, ideas, or your schedule</p>
            </div>
            <div className="grid grid-cols-2 gap-2 w-full max-w-md">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="glass-card p-3 text-xs text-[var(--text-2)] hover:text-[var(--text)] text-left transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={spring}
              className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 bg-[var(--glass-strong)] border border-[var(--glass-border)]">
                  <Bot className="w-4 h-4 text-[var(--accent)]" />
                </div>
              )}
              <div className={`max-w-[75%] ${msg.role === "user" ? "items-end" : "items-start"} flex flex-col gap-1`}>
                {msg.role === "user" ? (
                  <div className="px-4 py-2.5 rounded-2xl rounded-tr-sm bg-[var(--accent)] text-[var(--navy)] text-sm font-medium">
                    {msg.content}
                  </div>
                ) : (
                  msg.parts.map((part, j) =>
                    part.type === "text" ? (
                      <div key={j} className="glass-card px-4 py-3 text-sm text-[var(--text)] leading-relaxed whitespace-pre-wrap">
                        {part.text}
                      </div>
                    ) : part.type === "tool" ? (
                      <div key={j} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--glass-strong)] border border-[var(--glass-border)]">
                        <Wrench className="w-3 h-3 text-[var(--teal)]" />
                        <span className="text-xs text-[var(--text-3)] font-mono">{part.name}</span>
                      </div>
                    ) : (
                      <div key={j} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20">
                        <AlertCircle className="w-3 h-3 text-red-400" />
                        <span className="text-xs text-red-400">{part.message}</span>
                      </div>
                    )
                  )
                )}
              </div>
              {msg.role === "user" && (
                <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 bg-[var(--glass-strong)] border border-[var(--glass-border)]">
                  <User className="w-4 h-4 text-[var(--text-2)]" />
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {streaming && messages[messages.length - 1]?.role === "assistant" &&
          (messages[messages.length - 1] as { role: "assistant"; parts: Part[] }).parts.length === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
            <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 bg-[var(--glass-strong)] border border-[var(--glass-border)]">
              <Bot className="w-4 h-4 text-[var(--accent)]" />
            </div>
            <div className="glass-card px-4 py-3 flex gap-1">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                />
              ))}
            </div>
          </motion.div>
        )}

      </div>

      {/* Input */}
      <div className="glass-card p-3 flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            e.target.style.height = "auto";
            e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Ask anything about your tasks, projects, or schedule…"
          rows={1}
          disabled={streaming}
          className="flex-1 bg-transparent text-sm text-[var(--text)] placeholder:text-[var(--text-3)] outline-none resize-none leading-relaxed"
        />
        <button
          onClick={toggleVoice}
          disabled={streaming}
          className="flex-shrink-0 p-2 rounded-xl transition-colors"
          style={{
            color: listening ? "var(--accent)" : "var(--text-3)",
            background: listening ? "color-mix(in srgb, var(--accent) 15%, transparent)" : "transparent",
          }}
          title={listening ? "Stop listening" : "Voice input"}
        >
          {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>
        <GlassButton
          variant="primary"
          size="sm"
          onClick={() => send()}
          disabled={!input.trim() || streaming}
          className="flex-shrink-0"
        >
          <Send className="w-4 h-4" />
        </GlassButton>
      </div>
    </div>
  );
}
