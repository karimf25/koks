import { Metadata } from "next";
import { ChatInterface } from "./_components/ChatInterface";

export const metadata: Metadata = { title: "Claude Chat — LifeOS" };

export default function ChatPage() {
  const hasApiKey = !!process.env.ANTHROPIC_API_KEY;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--cream)]">Claude Chat</h1>
        <p className="text-sm text-[var(--text-3)] mt-1">Your AI chief of staff with full LifeOS access</p>
      </div>
      <ChatInterface hasApiKey={hasApiKey} />
    </div>
  );
}
