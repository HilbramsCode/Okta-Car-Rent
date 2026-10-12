import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { RoleGate } from "@/components/dashboard/RoleGate";
import { PratinjauBukti } from "@/components/payments/PratinjauBukti";
import { StatusBadge } from "@/components/StatusBadge";
import { GalatMuat } from "@/components/bi/StatusMuat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatRupiah, formatTanggalSingkat } from "@/lib/format";
import { labelMetodeBayar, statusPembayaran } from "@/lib/labels";
import {
  ajukanPembayaranPenyewa,
  ambilDaftarPembayaran,
  ambilKontrakUntukPembayaran,
  ambilTagihanKontrak,
  filterPembayaranAwal,
  OPSI_METODE,
  unggahBukti,
} from "@/lib/payments";

export const Route = createFileRoute("/_authenticated/dashboard/renter_/payments")({
  head: () => ({
    meta: [
      { title: "Pembayaran Saya | Okta Car Rent" },
      {
        name: "description",
        content:
          "Lihat riwayat pembayaran sewa mobil Anda dan unggah bukti transfer untuk diverifikasi tim Okta Car Rent.",
      },
      { property: "og:title", content: "Pembayaran Saya | Okta Car Rent" },
      {
        property: "og:description",
        content: "Portal pembayaran penyewa Okta Car Rent: riwayat, status verifikasi, dan unggah bukti.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RoleGate allow={["renter", "admin", "owner"]}>
      <DashboardShell peran="Penyewa" judul="Pembayaran Saya">
        <PortalPembayaran />
      </DashboardShell>
    </RoleGate>
  ),
});

function PortalPembayaran() {
  const qc = useQueryClient();
  const hariIni = new Date().toISOString().slice(0, 10);
  const [kontrakId, setKontrakId] = useState("");
  const [nominal, setNominal] = useState("");
  const [tanggal, setTanggal] = useState(hariIni);
  const [metode, setMetode] = useState("transfer");
  const [referensi, setReferensi] = useState("");
  const [catatan, setCatatan] = useState("");
  const [berkas, setBerkas] = useState<File | null>(null);

  const kontrak = useQuery({
    queryKey: ["penyewa-kontrak-bayar"],
    queryFn: ambilKontrakUntukPembayaran,
  });

  const riwayat = useQuery({
    queryKey: ["penyewa-pembayaran"],
    queryFn: () => ambilDaftarPembayaran({ ...filterPembayaranAwal, perHalaman: 50 }),
  });

  const tagihan = useQuery({
    queryKey: ["penyewa-tagihan", kontrakId],
    queryFn: () => ambilTagihanKontrak(kontrakId),
    enabled: kontrakId !== "",
  });

  const angka = useMemo(() => Number(nominal.replace(/[^\d]/g, "")) || 0, [nominal]);

  const kirim = useMutation({
    mutationFn: async () => {
      if (!kontrakId) throw new Error("Pilih kontrak terlebih dahulu.");
      if (!berkas) throw new Error("Unggah bukti transfer terlebih dahulu.");
      const path = await unggahBukti(berkas);
      await ajukanPembayaranPenyewa({
        contract_id: kontrakId,
        amount: angka,
        payment_date: tanggal,
        method: metode,
        reference_number: referensi.trim() || null,
        notes: catatan.trim() || null,
        proof_url: path,
      });
    },
    onSuccess: () => {
      toast.success("Bukti pembayaran terkirim. Menunggu verifikasi admin.");
      setNominal("");
      setReferensi("");
      setCatatan("");
      setBerkas(null);
      qc.invalidateQueries({ queryKey: ["penyewa-pembayaran"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-8">
      <section className="space-y-4 rounded-lg border border-border bg-card p-5">
        <h2 className="font-heading text-xl font-bold text-foreground">Kirim Bukti Pembayaran</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label className="text-base">Kontrak</Label>
            <Select value={kontrakId} onValueChange={setKontrakId}>
              <SelectTrigger className="h-11 text-base">
                <SelectValue placeholder="Pilih kontrak sewa Anda" />
              </SelectTrigger>
              <SelectContent>
                {(kontrak.data ?? []).map((k) => (
                  <SelectItem key={k.id} value={k.id} className="text-base">
                    {k.contract_number}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {kontrak.isError && (
              <GalatMuat pesan="Daftar kontrak Anda belum dapat dimuat." />
            )}
            {kontrakId !== "" && tagihan.isError && (
              <GalatMuat pesan="Sisa tagihan belum dapat dimuat." />
            )}
            {tagihan.data && !tagihan.isError && (
              <p className="text-base text-muted-foreground">
                Sisa tagihan:{" "}
                <span className="font-semibold text-foreground">
                  {formatRupiah(tagihan.data.sisa)}
                </span>
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="nominal-penyewa" className="text-base">
              Nominal Transfer
            </Label>
            <Input
              id="nominal-penyewa"
              type="number"
              min={0}
              step={1000}
              className="h-11 text-base"
              value={nominal}
              onChange={(e) => setNominal(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tanggal-penyewa" className="text-base">
              Tanggal Transfer
            </Label>
            <Input
              id="tanggal-penyewa"
              type="date"
              max={hariIni}
              className="h-11 text-base"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-base">Metode</Label>
            <Select value={metode} onValueChange={setMetode}>
              <SelectTrigger className="h-11 text-base">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OPSI_METODE.filter((o) => o.value !== "tunai").map((o) => (
                  <SelectItem key={o.value} value={o.value} className="text-base">
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ref-penyewa" className="text-base">
              Nomor Referensi (opsional)
            </Label>
            <Input
              id="ref-penyewa"
              className="h-11 text-base"
              value={referensi}
              onChange={(e) => setReferensi(e.target.value)}
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="bukti-penyewa" className="text-base">
              Bukti Transfer (gambar atau PDF)
            </Label>
            <Input
              id="bukti-penyewa"
              type="file"
              accept="image/*,application/pdf"
              className="h-11 text-base"
              onChange={(e) => setBerkas(e.target.files?.[0] ?? null)}
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="catatan-penyewa" className="text-base">
              Catatan
            </Label>
            <Textarea
              id="catatan-penyewa"
              rows={3}
              className="text-base"
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
            />
          </div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            size="lg"
            className="text-base"
            disabled={kirim.isPending}
            onClick={() => kirim.mutate()}
          >
            {kirim.isPending ? "Mengirim…" : "Kirim Bukti Pembayaran"}
          </Button>
          <Button size="lg" variant="outline" className="text-base" asChild>
            <Link to="/dashboard/renter">Kembali ke Dasbor</Link>
          </Button>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-xl font-bold text-foreground">Riwayat Pembayaran</h2>
        {riwayat.isPending ? (
          <Skeleton className="h-40 w-full rounded-lg" />
        ) : riwayat.isError ? (
          <GalatMuat pesan="Riwayat pembayaran belum dapat dimuat." />
        ) : (riwayat.data?.baris ?? []).length === 0 ? (
          <p className="rounded-md border border-border bg-card p-4 text-base text-muted-foreground">
            Belum ada pembayaran tercatat.
          </p>
        ) : (
          <ul className="space-y-3">
            {(riwayat.data?.baris ?? []).map((p) => (
              <li key={p.id} className="rounded-lg border border-border bg-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-foreground">
                      {formatRupiah(Number(p.amount))} • {labelMetodeBayar[p.method] ?? p.method}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatTanggalSingkat(p.payment_date)} • {p.invoice_number}
                      {p.receipt_number ? ` • kuitansi ${p.receipt_number}` : ""}
                    </p>
                  </div>
                  <StatusBadge map={statusPembayaran} value={p.status} />
                </div>
                {p.proof_url && (
                  <div className="mt-3">
                    <PratinjauBukti path={p.proof_url} tinggi="h-56" />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
