import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { RoleGate } from "@/components/dashboard/RoleGate";
import { PratinjauBukti } from "@/components/payments/PratinjauBukti";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { GalatMuat } from "@/components/bi/StatusMuat";
import { formatRupiah, formatTanggalSingkat } from "@/lib/format";
import { labelMetodeBayar } from "@/lib/labels";
import { ambilAntreanVerifikasi, setujuiPembayaran, tolakPembayaran } from "@/lib/payments";

export const Route = createFileRoute("/_authenticated/dashboard/admin/payments/verifikasi")({
  head: () => ({
    meta: [
      { title: "Verifikasi Pembayaran | Okta Car Rent" },
      {
        name: "description",
        content:
          "Antrean verifikasi bukti pembayaran penyewa: setujui atau tolak dengan alasan yang tercatat pada log audit.",
      },
      { property: "og:title", content: "Verifikasi Pembayaran | Okta Car Rent" },
      {
        property: "og:description",
        content: "Periksa bukti transfer penyewa dan terbitkan kuitansi secara otomatis.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RoleGate allow={["owner", "admin"]}>
      <DashboardShell peran="Manajemen Keuangan" judul="Antrean Verifikasi Pembayaran">
        <HalamanVerifikasi />
      </DashboardShell>
    </RoleGate>
  ),
});

function HalamanVerifikasi() {
  const qc = useQueryClient();
  const [alasan, setAlasan] = useState<Record<string, string>>({});

  const antrean = useQuery({
    queryKey: ["pembayaran-antrean"],
    queryFn: ambilAntreanVerifikasi,
  });

  function segarkan() {
    qc.invalidateQueries({ queryKey: ["pembayaran-antrean"] });
    qc.invalidateQueries({ queryKey: ["pembayaran-daftar"] });
    qc.invalidateQueries({ queryKey: ["tunggakan-daftar"] });
  }

  const setujui = useMutation({
    mutationFn: (id: string) => setujuiPembayaran(id),
    onSuccess: () => {
      toast.success("Pembayaran diverifikasi. Nomor kuitansi diterbitkan.");
      segarkan();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const tolak = useMutation({
    mutationFn: (v: { id: string; alasan: string }) => tolakPembayaran(v.id, v.alasan),
    onSuccess: () => {
      toast.success("Pembayaran ditolak dan penyewa telah diberi tahu.");
      segarkan();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (antrean.isPending) return <Skeleton className="h-64 w-full rounded-lg" />;
  if (antrean.isError) return <GalatMuat pesan="Data pembayaran belum dapat dimuat." />;

  const baris = antrean.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-base text-muted-foreground">
          {baris.length} pembayaran menunggu diperiksa. Urut dari pengajuan paling lama.
        </p>
        <Button variant="outline" size="lg" className="text-base" asChild>
          <Link to="/dashboard/admin/payments">Kembali ke Daftar</Link>
        </Button>
      </div>

      {baris.length === 0 && (
        <p className="rounded-lg border border-border bg-card p-6 text-base text-muted-foreground">
          Tidak ada pembayaran yang menunggu verifikasi.
        </p>
      )}

      {baris.map((p) => (
        <div key={p.id} className="grid gap-5 rounded-lg border border-border bg-card p-5 lg:grid-cols-2">
          <div className="space-y-3">
            <div>
              <p className="font-heading text-xl font-bold text-foreground">{p.invoice_number}</p>
              <p className="text-base text-muted-foreground">
                {p.contracts?.contract_number ?? "-"} • {p.contracts?.renters?.full_name ?? "-"}
              </p>
            </div>
            <dl className="grid gap-2 sm:grid-cols-2">
              <Baris label="Nominal" nilai={formatRupiah(Number(p.amount))} />
              <Baris label="Tanggal Bayar" nilai={formatTanggalSingkat(p.payment_date)} />
              <Baris label="Metode" nilai={labelMetodeBayar[p.method] ?? p.method} />
              <Baris label="No. Referensi" nilai={p.reference_number ?? "-"} />
            </dl>
            <div className="space-y-2">
              <Label htmlFor={`alasan-${p.id}`} className="text-base">
                Alasan penolakan (wajib bila ditolak)
              </Label>
              <Textarea
                id={`alasan-${p.id}`}
                rows={2}
                className="text-base"
                value={alasan[p.id] ?? ""}
                onChange={(e) => setAlasan((s) => ({ ...s, [p.id]: e.target.value }))}
                placeholder="Contoh: Nominal transfer tidak sesuai bukti."
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                size="lg"
                className="text-base"
                disabled={setujui.isPending}
                onClick={() => setujui.mutate(p.id)}
              >
                Setujui
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="text-base"
                disabled={tolak.isPending}
                onClick={() => tolak.mutate({ id: p.id, alasan: alasan[p.id] ?? "" })}
              >
                Tolak
              </Button>
              <Button size="lg" variant="outline" className="text-base" asChild>
                <Link to="/dashboard/admin/payments/$id" params={{ id: p.id }}>
                  Detail
                </Link>
              </Button>
            </div>
          </div>
          <PratinjauBukti path={p.proof_url} tinggi="h-80" />
        </div>
      ))}
    </div>
  );
}

function Baris({ label, nilai }: { label: string; nilai: string }) {
  return (
    <div className="rounded-md border border-border p-3">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-base font-semibold text-foreground">{nilai}</dd>
    </div>
  );
}
