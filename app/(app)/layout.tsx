import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Sidebar } from "@/components/layout/Sidebar";
import { BottomNav } from "@/components/layout/BottomNav";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { AmbientBackground } from "@/components/layout/AmbientBackground";
import { CommandPaletteProvider } from "@/components/CommandPaletteProvider";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <CommandPaletteProvider>
      <div className="min-h-dvh relative">
        <AmbientBackground />
        <Sidebar />
        <MobileHeader />
        {/* Main content — offset for sidebar on lg, clear of bottom nav on mobile */}
        <main className="lg:pl-64 min-h-dvh pb-28 lg:pb-0">
          <div className="max-w-[1400px] mx-auto px-4 lg:px-6 py-4 lg:py-6">
            {children}
          </div>
        </main>
        <BottomNav />
      </div>
    </CommandPaletteProvider>
  );
}
