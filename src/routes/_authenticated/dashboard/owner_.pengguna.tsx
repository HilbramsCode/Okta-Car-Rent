import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { RoleGate } from "@/components/dashboard/RoleGate";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { promoteToAdmin } from "@/lib/users.functions";

export const Route = createFileRoute("/_authenticated/dashboard/owner_/pengguna")({
  head: () => ({
    meta: [
      { title: "Kelola Pengguna | Okta Car Rent" },
      { name: "description", content: "Pemilik menjadikan penyewa yang memenuhi syarat sebagai Admin." },
      { property: "og:title", content: "Kelola Pengguna | Okta Car Rent" },
      { property: "og:description", content: "Kelola peran Admin untuk tim Okta Car Rent." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RoleGate allow="owner">
      <DashboardShell peran="Pemilik" judul="Kelola Pengguna">
        <DaftarPengguna />
      </DashboardShell>
    </RoleGate>
  ),
});

type Baris = {
  userId: string;
  nama: string;
  peran: string[];
  renterId: string | null;
  riwayat: string[];
};

const LABEL_PERAN: Record<string, string> = { owner: "Pemilik", admin: "Admin", renter: "Penyewa" };

async function muatPengguna(): Promise<Baris[]> {
  const [roles, profiles, renters, kontrak, deposit, tunggakan, catatan] = await Promise.all([
    supabase.from("user_roles").select("user_id, role"),
    supabase.from("profiles").select("id, full_name"),
    supabase.from("renters").select("id, user_id, full_name"),
    supabase.from("contracts").select("renter_id"),
    supabase.from("deposits").select("renter_id"),
    supabase.from("outstanding_payments").select("renter_id"),
    supabase.from("renter_notes").select("renter_id"),
  ]);
  const err = [roles, profiles, renters, kontrak, deposit, tunggakan, catatan].find((r) => r.error);
  if (err?.error) throw err.error;

  const ada = (rows: { renter_id: string }[] | null) => new Set((rows ?? []).map((r) => r.renter_id));
  const sK = ada(kontrak.data), sD = ada(deposit.data), sT = ada(tunggakan.data), sC = ada(catatan.data);

  const map = new Map<string, Baris>();
  for (const r of roles.data ?? []) {
    const b = map.get(r.user_id) ?? { userId: r.user_id, nama: "", peran: [], renterId: null, riwayat: [] };
    b.peran.push(r.role);
    map.set(r.user_id, b);
  }
  for (const p of profiles.data ?? []) {
    const b = map.get(p.id);
    if (b) b.nama = p.full_name;
  }
  for (const rt of renters.data ?? []) {
    if (!rt.user_id) continue;
    const b = map.get(rt.user_id);
    if (!b) continue;
    b.renterId = rt.id;
    if (!b.nama) b.nama = rt.full_name;
    if (sK.has(rt.id)) b.riwayat.push("kontrak");
    if (sD.has(rt.id)) b.riwayat.push("deposit");
    if (sT.has(rt.id)) b.riwayat.push("tunggakan");
    if (sC.has(rt.id)) b.riwayat.push("catatan");
  }
  return [...map.values()].sort((a, b) => a.nama.localeCompare(b.nama));
}

function DaftarPengguna() {
  const qc = useQueryClient();
  const promote = useServerFn(promoteToAdmin);
  const { data, isLoading, error } = useQuery({ queryKey: ["kelola-pengguna"], queryFn: muatPengguna });
  const [target, setTarget] = useState<Baris | null>(null);
  const [proses, setProses] = useState(false);

  async function konfirmasi() {
    if (!target) return;
    setProses(true);
    const res = await promote({ data: { userId: target.userId } });
    setProses(false);
    setTarget(null);
    if (res.ok) toast.success(`${target.nama || "Akun"} sekarang Admin.`);
    else toast.error(res.message);
    qc.invalidateQueries({ queryKey: ["kelola-pengguna"] });
  }

  return (
    <div className="space-y-4">
      <Link to="/dashboard/owner" className="text-base font-medium text-primary hover:underline">
        ← Kembali ke dashboard
      </Link>
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="font-heading text-xl font-bold text-foreground">Jadikan Admin</h2>
        <p className="mt-1 text-base text-muted-foreground">
          Calon Admin mendaftar dulu lewat halaman Daftar dan mengonfirmasi email. Penyewa tanpa riwayat
          kontrak, deposit, tunggakan, atau catatan dapat dijadikan Admin. Data penyewanya akan dinonaktifkan,
          tidak dihapus.
        </p>
      </div>

      {isLoading && <p className="text-base text-muted-foreground">Memuat pengguna…</p>}
      {error && <p className="text-base text-destructive">Gagal memuat daftar pengguna.</p>}

      {data && (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <table className="w-full text-left text-base">
            <thead className="bg-secondary text-sm text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Nama</th>
                <th className="px-4 py-3">Peran</th>
                <th className="px-4 py-3">Tindakan</th>
              </tr>
            </thead>
            <tbody>
              {data.map((b) => {
                const penyewaMurni = b.peran.length === 1 && b.peran[0] === "renter";
                const layak = penyewaMurni && b.renterId && b.riwayat.length === 0;
                return (
                  <tr key={b.userId} className="border-t border-border">
                    <td className="px-4 py-3 text-foreground">{b.nama || "(tanpa nama)"}</td>
                    <td className="px-4 py-3">{b.peran.map((p) => LABEL_PERAN[p] ?? p).join(", ")}</td>
                    <td className="px-4 py-3">
                      {layak ? (
                        <Button size="sm" onClick={() => setTarget(b)}>
                          Jadikan Admin
                        </Button>
                      ) : penyewaMurni ? (
                        <span className="text-sm text-muted-foreground">
                          {b.renterId ? `Punya riwayat: ${b.riwayat.join(", ")}` : "Data penyewa tidak ada"}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <AlertDialog open={!!target} onOpenChange={(o) => !o && setTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Jadikan {target?.nama || "akun ini"} sebagai Admin?</AlertDialogTitle>
            <AlertDialogDescription>
              Peran Penyewa diganti menjadi Admin dan data penyewanya dinonaktifkan. Admin dapat mengelola
              armada, penyewa, kontrak, dan pembayaran.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={proses}>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={konfirmasi} disabled={proses}>
              {proses ? "Memproses…" : "Ya, jadikan Admin"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
