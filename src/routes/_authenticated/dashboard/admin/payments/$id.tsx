import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Printer } from "lucide-react";

import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { RoleGate } from "@/components/dashboard/RoleGate";
import { PratinjauBukti } from "@/components/payments/PratinjauBukti";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { formatRupiah, formatTanggal, formatTanggalSingkat } from "@/lib/format";
import { labelMetodeBayar, statusPembayaran, statusTunggakan } from "@/lib/labels";
import { useUserRole } from "@/lib/auth";
import { Route as AuthRoute } from "@/routes/_authenticated/route";
import {
  ambilDetailPembayaran,
  balikkanPembayaran,
  labelKategori,
  labelSumber,
} from "@/lib/payments";

export const Route = createFileRoute("/_authenticated/dashboard/admin/payments/$id")({
  head: () => ({
    meta: [
      { title: "Detail Pembayaran | Okta Car Rent" },
      {
        name: "description",
        content:
          "Rincian invoice dan kuitansi pembayaran sewa, alokasi ke tunggakan, jejak audit, serta pembalikan pembayaran.",
      },
      { property: "og:title", content: "Detail Pembayaran | Okta Car Rent" },
      {
        property: "og:description",
        content: "Lihat riwayat lengkap satu transaksi pembayaran rental mobil.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RoleGate allow={["owner", "admin"]}>
      <DashboardShell peran="Manajemen Keuangan" judul="Detail Pembayaran">
        <DetailPembayaranHalaman />
      </DashboardShell>
    </RoleGate>
  ),
});

function DetailPembayaranHalaman() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const { user } = AuthRoute.useRouteContext();
  const { role } = useUserRole(user?.id);
  const [alasan, setAlasan] = useState("");

  const detail = useQuery({
    queryKey: ["pembayaran-detail", id],
    queryFn: () => ambilDetailPembayaran(id),
  });

  const balik = useMutation({
    mutationFn: () => balikkanPembayaran(id, alasan),
    onSuccess: () => {
      toast.success("Pembayaran dibalik. Alokasi tunggakan ikut dikembalikan.");
      setAlasan("");
      qc.invalidateQueries({ queryKey: ["pembayaran-detail", id] });
      qc.invalidateQueries({ queryKey: ["pembayaran-daftar"] });
      qc.invalidateQueries({ queryKey: ["tunggakan-daftar"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (detail.isPending) return <Skeleton className="h-96 w-full rounded-lg" />;
  if (detail.error || !detail.data) {
    return (
      <p className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-base text-destructive">
        {(detail.error as Error)?.message ?? "Pembayaran tidak ditemukan."}
      </p>
    );
  }

  const d = detail.data;
  const p = d.pembayaran;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-heading text-2xl font-bold text-foreground">{p.invoice_number}</p>
          <p className="text-base text-muted-foreground">
            Kuitansi: {p.receipt_number ?? "belum diterbitkan"}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <StatusBadge map={statusPembayaran} value={p.status} className="self-center" />
          <Button variant="outline" size="lg" className="text-base" onClick={() => window.print()}>
            <Printer className="mr-2 size-4" /> Cetak Kuitansi
          </Button>
          <Button variant="outline" size="lg" className="text-base" asChild>
            <Link to="/dashboard/admin/payments">Kembali</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Baris label="Nominal" nilai={formatRupiah(Number(p.amount))} />
        <Baris label="Tanggal Bayar" nilai={formatTanggal(p.payment_date)} />
        <Baris label="Metode" nilai={labelMetodeBayar[p.method] ?? p.method} />
        <Baris label="Nomor Referensi" nilai={p.reference_number ?? "-"} />
        <Baris label="Kategori" nilai={labelKategori(p.payment_category)} />
        <Baris label="Sumber" nilai={labelSumber(p.payment_source)} />
        <Baris
          label="Kontrak"
          nilai={d.kontrak?.contract_number ?? "-"}
        />
        <Baris label="Penyewa" nilai={d.penyewa?.full_name ?? "-"} />
        <Baris label="Diverifikasi" nilai={p.verified_at ? formatTanggal(p.verified_at) : "-"} />
      </div>

      <div className="grid gap-4 rounded-lg border border-primary/30 bg-primary/10 p-5 sm:grid-cols-4">
        <Ringkas label="Total Kontrak" nilai={formatRupiah(d.tagihan.total)} />
        <Ringkas label="Sudah Dibayar" nilai={formatRupiah(d.tagihan.dibayar)} />
        <Ringkas label="Menunggu Verifikasi" nilai={formatRupiah(d.tagihan.menunggu)} />
        <Ringkas label="Sisa Tagihan" nilai={formatRupiah(d.tagihan.sisa)} />
      </div>

      {p.rejection_reason && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-base text-destructive">
          {p.rejection_reason}
        </p>
      )}

      <section className="space-y-3">
        <h2 className="font-heading text-xl font-bold text-foreground">Bukti Pembayaran</h2>
        <PratinjauBukti path={p.proof_url} tinggi="h-80" />
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-xl font-bold text-foreground">Alokasi ke Tunggakan</h2>
        {d.alokasi.length === 0 ? (
          <p className="rounded-md border border-border bg-card p-4 text-base text-muted-foreground">
            Pembayaran ini belum dialokasikan ke tunggakan mana pun.
          </p>
        ) : (
          <ul className="space-y-2">
            {d.alokasi.map((a) => (
              <li
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-card p-3"
              >
                <div>
                  <p className="text-base font-semibold text-foreground">
                    {a.tunggakan?.description ?? "Tunggakan"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatTanggalSingkat(a.allocation_date)}
                    {a.reversal_of ? " • pembalikan" : ""} {a.note ? `• ${a.note}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {a.tunggakan && (
                    <StatusBadge map={statusTunggakan} value={a.tunggakan.status} />
                  )}
                  <span
                    className={`text-base font-semibold ${
                      Number(a.allocated_amount) < 0 ? "text-destructive" : "text-foreground"
                    }`}
                  >
                    {formatRupiah(Number(a.allocated_amount))}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {role === "owner" && p.status === "lunas" && (
        <section className="space-y-3 rounded-lg border border-warning/40 bg-warning/10 p-5">
          <h2 className="font-heading text-xl font-bold text-foreground">Pembalikan Pembayaran</h2>
          <p className="text-base text-muted-foreground">
            Pembayaran terverifikasi tidak dapat diubah. Untuk koreksi, balikkan pembayaran ini
            lalu catat pembayaran baru yang benar. Riwayat lama tetap tersimpan.
          </p>
          <div className="space-y-2">
            <Label htmlFor="alasan-balik" className="text-base">
              Alasan pembalikan <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="alasan-balik"
              rows={3}
              className="text-base"
              value={alasan}
              onChange={(e) => setAlasan(e.target.value)}
              placeholder="Contoh: Nominal salah input, seharusnya Rp 1.500.000."
            />
          </div>
          <Button
            size="lg"
            variant="destructive"
            className="text-base"
            disabled={balik.isPending}
            onClick={() => balik.mutate()}
          >
            {balik.isPending ? "Memproses…" : "Balikkan Pembayaran"}
          </Button>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="font-heading text-xl font-bold text-foreground">Jejak Audit</h2>
        {d.audit.length === 0 ? (
          <p className="rounded-md border border-border bg-card p-4 text-base text-muted-foreground">
            Belum ada catatan audit.
          </p>
        ) : (
          <ul className="space-y-2">
            {d.audit.map((a) => (
              <li key={a.id} className="rounded-md border border-border bg-card p-3">
                <p className="text-base font-semibold text-foreground">
                  {a.action === "create"
                    ? "Pembayaran dibuat"
                    : a.action === "update"
                      ? "Pembayaran diperbarui"
                      : "Pembayaran dihapus"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {formatTanggal(a.created_at)} • {a.actor_role ?? "sistem"}
                </p>
                <pre className="mt-2 overflow-x-auto rounded bg-muted/50 p-2 text-sm text-muted-foreground">
                  {JSON.stringify(a.changed_fields, null, 2)}
                </pre>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Baris({ label, nilai }: { label: string; nilai: string }) {
  return (
    <div className="rounded-md border border-border bg-card p-3">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-base font-semibold break-words text-foreground">{nilai}</p>
    </div>
  );
}

function Ringkas({ label, nilai }: { label: string; nilai: string }) {
  return (
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="font-heading text-lg font-bold text-foreground">{nilai}</p>
    </div>
  );
}
