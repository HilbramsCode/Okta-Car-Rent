import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";

export type AppRole = "owner" | "admin" | "renter";

export const dashboardPathForRole = (role: AppRole | null): string => {
  switch (role) {
    case "owner":
      return "/dashboard/owner";
    case "admin":
      return "/dashboard/admin";
    default:
      return "/dashboard/renter";
  }
};

const rolePriority: Record<AppRole, number> = { owner: 1, admin: 2, renter: 3 };

export async function fetchUserRole(userId: string): Promise<AppRole | null> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);

  if (error || !data || data.length === 0) return null;
  const roles = data.map((r) => r.role as AppRole);
  roles.sort((a, b) => rolePriority[a] - rolePriority[b]);
  return roles[0];
}

export function useAuthSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  return { session, loading };
}

export function useUserRole(userId: string | undefined) {
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    if (!userId) {
      setRole(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchUserRole(userId).then((r) => {
      if (!active) return;
      setRole(r);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [userId]);

  return { role, loading };
}