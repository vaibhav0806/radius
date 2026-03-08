import { Sidebar, MobileSidebar } from "@/components/sidebar";
import { AuthGuard } from "@/components/auth-guard";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex min-h-screen flex-col md:flex-row">
        <div className="flex h-14 items-center border-b px-4 md:hidden">
          <MobileSidebar />
          <div className="flex flex-1 items-center justify-center">
            <span className="text-lg font-extrabold tracking-[-0.02em] font-logo">radius</span>
          </div>
        </div>
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-6xl p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}
