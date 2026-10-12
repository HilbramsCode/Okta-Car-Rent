import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

import { Route as AuthRoute } from "@/routes/_authenticated/route";
import { dashboardPathForRole, useUserRole } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/dashboard/")({
  component: DashboardRedirect,
});

function DashboardRedirect() {
  const navigate = useNavigate();
  const { user } = AuthRoute.useRouteContext();
  const { role, loading } = useUserRole(user?.id);

  useEffect(() => {
    if (loading) return;
    navigate({ to: dashboardPathForRole(role), replace: true });
  }, [loading, role, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <p className="text-base text-muted-foreground">Mengarahkan ke dashboard Anda…</p>
    </div>
  );
}