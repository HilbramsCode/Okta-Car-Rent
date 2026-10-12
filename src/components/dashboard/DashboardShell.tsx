import { Link, useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { LayoutDashboard, LogOut } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Logo } from "@/components/site/Logo";
import { BelNotifikasi } from "@/components/notifikasi/BelNotifikasi";
import { supabase } from "@/integrations/supabase/client";
import { dashboardPathForRole, useAuthSession, useUserRole } from "@/lib/auth";

export function DashboardShell({
  judul,
  peran,
  children,
}: {
  judul: string;
  peran: string;
  children?: ReactNode;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { session } = useAuthSession();
  const { role, loading: memuatRole } = useUserRole(session?.user.id);

  async function keluar() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
          <Link to="/">
            <Logo />
          </Link>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="lg"
              className="text-base"
              disabled={memuatRole}
              onClick={() => navigate({ to: dashboardPathForRole(role) })}
            >
              <LayoutDashboard className="size-4 sm:mr-2" />
              <span className="hidden sm:inline">Dasbor</span>
            </Button>
            <BelNotifikasi />
            <Button variant="outline" size="lg" className="text-base" onClick={keluar}>
              <LogOut className="size-4 sm:mr-2" />
              <span className="hidden sm:inline">Keluar</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
        <p className="text-base font-medium text-primary">{peran}</p>
        <h1 className="mt-1 font-heading text-3xl font-bold text-foreground sm:text-4xl">
          {judul}
        </h1>
        {children ? (
          <div className="mt-6">{children}</div>
        ) : (
          <div className="mt-6 rounded-lg border border-border bg-card p-6">
            <p className="text-base text-muted-foreground">
              Fitur dashboard akan ditambahkan pada tahap berikutnya.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}