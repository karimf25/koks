"use client";

import { GlassPanel, GlassButton } from "@/components/glass";
import { Settings, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--cream)]">Settings</h1>
        <p className="text-sm text-[var(--text-3)] mt-1">Configure your LifeOS</p>
      </div>

      <GlassPanel className="max-w-lg">
        <div className="flex items-center gap-2 mb-6">
          <Settings className="w-4 h-4 text-[var(--accent)]" />
          <h2 className="text-sm font-semibold text-[var(--text-2)]">General</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm text-[var(--text-2)] font-medium block mb-1">Timezone</label>
            <p className="text-sm text-[var(--text-3)]">Africa/Cairo (default)</p>
          </div>

          <div className="pt-4 border-t border-[var(--glass-border)]">
            <GlassButton
              variant="danger"
              size="sm"
              onClick={handleLogout}
              className="flex items-center gap-2"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign out
            </GlassButton>
          </div>
        </div>
      </GlassPanel>
    </div>
  );
}
