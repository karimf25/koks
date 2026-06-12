import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Sidebar } from "@/components/layout/Sidebar";
import { BottomNav } from "@/components/layout/BottomNav";
import { AmbientBackground } from "@/components/layout/AmbientBackground";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="min-h-dvh relative">
      <AmbientBackground />
      <Sidebar />
      {/* Main content — offset for sidebar on lg */}
      <main className="lg:pl-64 min-h-dvh pb-24 lg:pb-0">
        <div className="max-w-[1400px] mx-auto px-4 lg:px-6 py-6">
          {children}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
