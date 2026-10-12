import { useNavigate } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import { Route as AuthRoute } from "@/routes/_authenticated/route";
import { dashboardPathForRole, useUserRole, type AppRole } from "@/lib/auth";

export function RoleGate({
  allow,
  children,
}: {
  allow: AppRole | AppRole[];
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const { user } = AuthRoute.useRouteContext();
  const { role, loading } = useUserRole(user?.id);
  const diizinkan = Array.isArray(allow) ? allow : [allow];
  const boleh = role !== null && diizinkan.includes(role);

  useEffect(() => {
    if (loading) return;
    if (!boleh) {
      navigate({ to: dashboardPathForRole(role), replace: true });
    }
  }, [loading, role, boleh, navigate]);

  if (loading || !boleh) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <p className="text-base text-muted-foreground">Memeriksa hak akses…</p>
      </div>
    );
  }

  return <>{children}</>;
}