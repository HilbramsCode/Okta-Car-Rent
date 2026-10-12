import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";

export type ArmadaPublik = {
  id: string;
  brand: string;
  model: string;
  variant: string | null;
  year: number;
  color: string | null;
  transmission: string;
  fuel_type: string;
  seat_capacity: number;
  category: string | null;
  daily_rate: number;
  weekly_rate: number | null;
  monthly_rate: number | null;
  deposit_amount: number;
  status: string;
};

function publicClient() {
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  return createClient<Database>(process.env.SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

export const daftarArmadaPublik = createServerFn({ method: "GET" }).handler(
  async (): Promise<ArmadaPublik[]> => {
    const supabase = publicClient();
    const { data, error } = await supabase
      .from("vehicles")
      .select(
        "id, brand, model, variant, year, color, transmission, fuel_type, seat_capacity, category, daily_rate, weekly_rate, monthly_rate, deposit_amount, status",
      )
      .neq("status", "tidak_aktif")
      .order("daily_rate", { ascending: true });

    if (error) {
      console.error("Gagal memuat armada publik:", error.message);
      return [];
    }
    return (data ?? []) as ArmadaPublik[];
  },
);