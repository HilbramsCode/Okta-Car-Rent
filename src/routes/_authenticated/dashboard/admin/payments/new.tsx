import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { RoleGate } from "@/components/dashboard/RoleGate";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { GalatMuat } from "@/components/bi/StatusMuat";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatRupiah } from "@/lib/format";
import { useUserRole } from "@/lib/auth";
import { Route as AuthRoute } from "@/routes/_authenticated/route";
import {
  ambilKontrakUntukPembayaran,
  ambilTagihanKontrak,
  catatPembayaranStaf,
  deteksiDuplikat,
  OPSI_KATEGORI,
  OPSI_METODE,
} from "@/lib/payments";

export const Route = createFileRoute("/_authenticated/dashboard/admin/payments/new")({
  head: () => ({
    meta: [
      { title: "Catat Pembayaran | Okta Car Rent" },
      {
        name: "description",
        content:
          "Catat pembayaran sewa mobil secara manual: pilih kontrak, nominal, metode, dan terbitkan kuitansi otomatis.",
      },
      { property: "og:title", content: "Catat Pembayaran | Okta Car Rent" },
      {
        property: "og:description",
        content: "Form pencatatan pembayaran tunai maupun transfer untuk staf Okta Car Rent.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RoleGate allow={["owner", "admin"]}>
      <DashboardShell peran="Manajemen Keuangan" judul="Catat Pembayaran">
        <FormCatatPembayaran />
      </DashboardShell>
    </RoleGate>
  ),
});

function FormCatatPembayaran() {
  const navigate = useNavigate();
  const { user } = AuthRoute.useRouteContext();
  const { role } = useUserRole(user?.id);

  const hariIni = new Date().toISOString().slice(0, 10);
  const [kontrakId, setKontrakId] = useState("");
  const [nominal, setNominal] = useState("");
  const [tanggal, setTanggal] = useState(hariIni);
  const [metode, setMetode] = useState("transfer");
  const [kategori, setKategori] = useState("sewa");
  const [referensi, setReferensi] = useState("");
  const [catatan, setCatatan] = useState("");
  const [izinkanLebih, setIzinkanLebih] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);

  const kontrak = useQuery({
    queryKey: ["pembayaran-pilihan-kontrak"],
    queryFn: ambilKontrakUntukPembayaran,
  });

  const tagihan = useQuery({
    queryKey: ["pembayaran-tagihan", kontrakId],
    queryFn: () => ambilTagihanKontrak(kontrakId),
    enabled: kontrakId !== "",
  });

  const angka = useMemo(() => Number(nominal.replace(/[^\d]/g, "")) || 0, [nominal]);

  const simpan = useMutation({
    mutationFn: async () => {
      if (!kontrakId) throw new Error("Pilih kontrak terlebih dahulu.");
      const duplikat = await deteksiDuplikat(kontrakId, referensi, angka, tanggal);
      if (duplikat && !izinkanLebih) throw new Error(duplikat);
      return catatPembayaranStaf({
        contract_id: kontrakId,
        amount: angka,
        payment_date: tanggal,
        method: metode,
        reference_number: referensi.trim() || null,
        notes: catatan.trim() || null,
        proof_url: null,
        payment_category: kategori,
        payment_source: role === "owner" ? "owner_manual" : "admin_manual",
        izinkanLebih,
      });
    },
    onSuccess: (id) => {
      toast.success("Pembayaran tercatat dan kuitansi diterbitkan.");
      navigate({ to: "/dashboard/admin/payments/$id", params: { id } });
    },
    onError: (e: Error) => setGalat(e.message),
  });

  return (
    <div className="space-y-6">
      {galat && (
        <p
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-base font-medium text-destructive"
        >
          {galat}
        </p>
      )}

      <div className="grid gap-4 rounded-lg border border-border bg-card p-5 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label className="text-base">
            Kontrak <span className="text-destructive">*</span>
          </Label>
          {kontrak.isPending ? (
            <Skeleton className="h-11 w-full rounded-md" />
          ) : kontrak.isError ? (
            <GalatMuat pesan="Daftar kontrak belum dapat dimuat." />
          ) : (
            <Select value={kontrakId} onValueChange={setKontrakId}>
              <SelectTrigger className="h-11 text-base">
                <SelectValue placeholder="Pilih kontrak" />
              </SelectTrigger>
              <SelectContent>
                {(kontrak.data ?? []).map((k) => (
                  <SelectItem key={k.id} value={k.id} className="text-base">
                    {k.contract_number} — {k.renters?.full_name ?? "-"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {kontrakId !== "" && tagihan.isPending && (
            <Skeleton className="h-6 w-64 rounded-md" />
          )}
          {kontrakId !== "" && tagihan.isError && (
            <GalatMuat pesan="Sisa tagihan kontrak ini belum dapat dimuat." />
          )}
          {tagihan.data && !tagihan.isError && (
            <p className="text-base text-muted-foreground">
              Total {formatRupiah(tagihan.data.total)} • sudah dibayar{" "}
              {formatRupiah(tagihan.data.dibayar)} • sisa{" "}
              <span className="font-semibold text-foreground">
                {formatRupiah(tagihan.data.sisa)}
              </span>
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="nominal" className="text-base">
            Nominal <span className="text-destructive">*</span>
          </Label>
          <Input
            id="nominal"
            type="number"
            min={0}
            step={1000}
            className="h-11 text-base"
            value={nominal}
            onChange={(e) => setNominal(e.target.value)}
          />
          <p className="text-sm text-muted-foreground">{formatRupiah(angka)}</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="tanggal" className="text-base">
            Tanggal Bayar <span className="text-destructive">*</span>
          </Label>
          <Input
            id="tanggal"
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
              {OPSI_METODE.map((o) => (
                <SelectItem key={o.value} value={o.value} className="text-base">
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-base">Kategori</Label>
          <Select value={kategori} onValueChange={setKategori}>
            <SelectTrigger className="h-11 text-base">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {OPSI_KATEGORI.map((o) => (
                <SelectItem key={o.value} value={o.value} className="text-base">
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="referensi" className="text-base">
            Nomor Referensi (opsional)
          </Label>
          <Input
            id="referensi"
            className="h-11 text-base"
            value={referensi}
            onChange={(e) => setReferensi(e.target.value)}
            placeholder="Nomor transaksi transfer / QRIS"
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="catatan" className="text-base">
            Catatan
          </Label>
          <Textarea
            id="catatan"
            rows={3}
            className="text-base"
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
          />
        </div>

        <label className="flex items-start gap-3 sm:col-span-2">
          <Checkbox
            checked={izinkanLebih}
            onCheckedChange={(v) => setIzinkanLebih(v === true)}
            className="mt-1"
          />
          <span className="text-base text-muted-foreground">
            Izinkan nominal melebihi sisa tagihan / lewati peringatan duplikat. Gunakan hanya bila
            kelebihan bayar memang disengaja dan akan dikembalikan.
          </span>
        </label>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          size="lg"
          className="text-base"
          disabled={simpan.isPending}
          onClick={() => {
            setGalat(null);
            simpan.mutate();
          }}
        >
          {simpan.isPending ? "Menyimpan…" : "Simpan Pembayaran"}
        </Button>
        <Button size="lg" variant="outline" className="text-base" asChild>
          <Link to="/dashboard/admin/payments">Batal</Link>
        </Button>
      </div>
    </div>
  );
}
