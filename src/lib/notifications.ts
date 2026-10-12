import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { pesanGalat } from "@/lib/vehicles";

export type Notifikasi = Database["public"]["Tables"]["notifications"]["Row"];

/** Jenis notifikasi yang saat ini dihasilkan oleh trigger database. */
export const JENIS_NOTIFIKASI = {
  pembayaranMenungguVerifikasi: "pembayaran_menunggu_verifikasi",
  pembayaranDiverifikasi: "pembayaran_diverifikasi",
  pembayaranDitolak: "pembayaran_ditolak",
  depositDiterima: "deposit_diterima",
  depositDipotong: "deposit_dipotong",
  depositDikembalikan: "deposit_dikembalikan",
  depositDisita: "deposit_disita",
} as const;

const KOLOM = "id, user_id, type, title, message, link_url, priority, is_read, read_at, created_at";

/**
 * Semua query di bawah mengandalkan RLS `user_id = auth.uid()` pada tabel
 * `notifications`, jadi setiap pengguna hanya menerima barisnya sendiri.
 */

/** Daftar notifikasi milik pengguna yang sedang masuk. */
export async function ambilNotifikasiSaya(opsi?: {
  hanyaBelumDibaca?: boolean;
  batas?: number;
}): Promise<Notifikasi[]> {
  let q = supabase
    .from("notifications")
    .select(KOLOM)
    .order("created_at", { ascending: false });

  if (opsi?.hanyaBelumDibaca) q = q.eq("is_read", false);
  if (opsi?.batas) q = q.limit(opsi.batas);

  const { data, error } = await q;
  if (error) throw new Error(pesanGalat(error.message));
  return (data ?? []) as Notifikasi[];
}

/** Beberapa notifikasi terbaru, untuk ringkasan singkat. */
export async function ambilNotifikasiTerbaru(batas = 5): Promise<Notifikasi[]> {
  return ambilNotifikasiSaya({ batas });
}

/** Jumlah notifikasi yang belum dibaca. */
export async function hitungNotifikasiBelumDibaca(): Promise<number> {
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("is_read", false);

  if (error) throw new Error(pesanGalat(error.message));
  return count ?? 0;
}

/** Tandai satu notifikasi sebagai sudah dibaca. */
export async function tandaiNotifikasiDibaca(id: string): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw new Error(pesanGalat(error.message));
}

/** Tandai semua notifikasi milik pengguna sebagai sudah dibaca. */
export async function tandaiSemuaNotifikasiDibaca(): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("is_read", false);

  if (error) throw new Error(pesanGalat(error.message));
}
