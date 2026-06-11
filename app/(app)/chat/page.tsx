import { Metadata } from "next";
import { GlassPanel } from "@/components/glass";
import { MessageSquare } from "lucide-react";

export const metadata: Metadata = { title: "Claude Chat — LifeOS" };

export default function ChatPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--cream)]">Claude Chat</h1>
        <p className="text-sm text-[var(--text-3)] mt-1">Chat with your AI chief of staff</p>
      </div>
      <GlassPanel className="flex flex-col items-center justify-center py-20 gap-3">
        <MessageSquare className="w-8 h-8 text-[var(--text-3)]" />
        <p className="text-[var(--text-3)] text-sm">Built-in Claude chat coming in Phase 2</p>
      </GlassPanel>
    </div>
  );
}
