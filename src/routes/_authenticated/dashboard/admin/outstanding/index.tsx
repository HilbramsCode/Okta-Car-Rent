import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Bell, Search } from "lucide-react";

import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { RoleGate } from "@/components/dashboard/RoleGate";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { GalatMuat } from "@/components/bi/StatusMuat";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatRupiah, formatTanggalSingkat } from "@/lib/format";
import { statusTunggakan } from "@/lib/labels";
import {
  ambilDaftarTunggakan,
  filterTunggakanAwal,
  kirimPengingatTunggakan,
  lunasiTunggakan,
  OPSI_METODE,
  type BarisTunggakan,
  type FilterTunggakan,
} from "@/lib/payments";

export const Route = createFileRoute("/_authenticated/dashboard/admin/outstanding/")({
  head: () => ({
    meta: [
      { title: "Tunggakan Pembayaran | Okta Car Rent" },
      {
        name: "description",
        content:
          "Pantau tunggakan penyewa Okta Car Rent, umur piutang, pelunasan, dan pengingat jatuh tempo.",
      },
      { property: "og:title", content: "Tunggakan Pembayaran | Okta Car Rent" },
      {
        property: "og:description",
        content: "Daftar piutang penyewa beserta aksi pelunasan dan pengingat otomatis.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RoleGate allow={["owner", "admin"]}>
      <DashboardShell peran="Manajemen Keuangan" judul="Tunggakan Pembayaran">
        <HalamanTunggakan />
      </DashboardShell>
    </RoleGate>
  ),
});

function HalamanTunggakan() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<FilterTunggakan>(filterTunggakanAwal);
  const [kataCari, setKataCari] = useState("");
  const [pilih, setPilih] = useState<BarisTunggakan | null>(null);

  const daftar = useQuery({
    queryKey: ["tunggakan-daftar", filter],
    queryFn: () => ambilDaftarTunggakan(filter),
  });

  const pengingat = useMutation({
    mutationFn: (id: string) => kirimPengingatTunggakan(id),
    onSuccess: () => {
      toast.success("Pengingat terkirim ke penyewa.");
      qc.invalidateQueries({ queryKey: ["tunggakan-daftar"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (daftar.isPending) return <Skeleton className="h-72 w-full rounded-lg" />;
  if (daftar.isError) return <GalatMuat pesan="Data tunggakan belum dapat dimuat." />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-base text-muted-foreground">
          Total piutang berjalan {formatRupiah(daftar.data?.totalSisa ?? 0)} •{" "}
          {daftar.data?.jumlahJatuhTempo ?? 0} sudah lewat jatuh tempo.
        </p>
        <Button variant="outline" size="lg" className="text-base" asChild>
          <Link to="/dashboard/admin/payments">Daftar Pembayaran</Link>
        </Button>
      </div>

      <form
        className="grid gap-4 rounded-lg border border-border bg-card p-5 sm:grid-cols-3"
        onSubmit={(e) => {
          e.preventDefault();
          setFilter((f) => ({ ...f, cari: kataCari }));
        }}
      >
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="cari-tunggakan" className="text-base">
            Cari
          </Label>
          <div className="flex gap-2">
            <Input
              id="cari-tunggakan"
              className="h-11 text-base"
              placeholder="Nama penyewa, kontrak, atau keterangan"
              value={kataCari}
              onChange={(e) => setKataCari(e.target.value)}
            />
            <Button type="submit" size="lg" variant="outline" className="text-base">
              <Search className="size-4" />
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-base">Status</Label>
          <Select
            value={filter.status}
            onValueChange={(v) => setFilter((f) => ({ ...f, status: v }))}
          >
            <SelectTrigger className="h-11 text-base">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="belum" className="text-base">
                Belum lunas semua
              </SelectItem>
              <SelectItem value="belum_lunas" className="text-base">
                Belum dibayar
              </SelectItem>
              <SelectItem value="sebagian" className="text-base">
                Dibayar sebagian
              </SelectItem>
              <SelectItem value="lunas" className="text-base">
                Lunas
              </SelectItem>
              <SelectItem value="semua" className="text-base">
                Semua
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </form>

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-base">Penyewa</TableHead>
              <TableHead className="text-base">Keterangan</TableHead>
              <TableHead className="text-base">Jatuh Tempo</TableHead>
              <TableHead className="text-base">Tagihan</TableHead>
              <TableHead className="text-base">Sisa</TableHead>
              <TableHead className="text-base">Status</TableHead>
              <TableHead className="text-base">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(daftar.data?.baris ?? []).length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-base text-muted-foreground">
                  Tidak ada tunggakan pada saringan ini.
                </TableCell>
              </TableRow>
            )}
            {(daftar.data?.baris ?? []).map((t) => (
              <TableRow key={t.id}>
                <TableCell className="text-base font-semibold">
                  {t.renters?.full_name ?? "-"}
                  <span className="block text-sm font-normal text-muted-foreground">
                    {t.contracts?.contract_number ?? "Tanpa kontrak"}
                  </span>
                </TableCell>
                <TableCell className="text-base">{t.description}</TableCell>
                <TableCell className="text-base">
                  {formatTanggalSingkat(t.due_date)}
                  {t.status !== "lunas" && t.umurHari > 0 && (
                    <span className="block text-sm text-destructive">
                      Lewat {t.umurHari} hari
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-base">{formatRupiah(Number(t.amount_due))}</TableCell>
                <TableCell className="text-base font-semibold">{formatRupiah(t.sisa)}</TableCell>
                <TableCell>
                  <StatusBadge map={statusTunggakan} value={t.status} />
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      className="text-base"
                      disabled={t.status === "lunas"}
                      onClick={() => setPilih(t)}
                    >
                      Lunasi
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-base"
                      disabled={t.status === "lunas" || pengingat.isPending}
                      onClick={() => pengingat.mutate(t.id)}
                    >
                      <Bell className="mr-1 size-4" /> Ingatkan
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <DialogPelunasan tunggakan={pilih} onTutup={() => setPilih(null)} />
    </div>
  );
}

function DialogPelunasan({
  tunggakan,
  onTutup,
}: {
  tunggakan: BarisTunggakan | null;
  onTutup: () => void;
}) {
  const qc = useQueryClient();
  const hariIni = new Date().toISOString().slice(0, 10);
  const [nominal, setNominal] = useState("");
  const [metode, setMetode] = useState("transfer");
  const [referensi, setReferensi] = useState("");

  const simpan = useMutation({
    mutationFn: () => {
      if (!tunggakan) throw new Error("Tunggakan tidak dipilih.");
      return lunasiTunggakan(tunggakan.id, {
        amount: Number(nominal.replace(/[^\d]/g, "")) || 0,
        payment_date: hariIni,
        method: metode,
        reference_number: referensi.trim() || null,
        notes: `Pelunasan tunggakan: ${tunggakan.description}`,
      });
    },
    onSuccess: () => {
      toast.success("Pelunasan tercatat dan dialokasikan ke tunggakan.");
      setNominal("");
      setReferensi("");
      qc.invalidateQueries({ queryKey: ["tunggakan-daftar"] });
      qc.invalidateQueries({ queryKey: ["pembayaran-daftar"] });
      onTutup();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={tunggakan !== null} onOpenChange={(o) => !o && onTutup()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">Pelunasan Tunggakan</DialogTitle>
          <DialogDescription className="text-base">
            {tunggakan?.description} • sisa {formatRupiah(tunggakan?.sisa ?? 0)}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nominal-lunas" className="text-base">
              Nominal Dibayar
            </Label>
            <Input
              id="nominal-lunas"
              type="number"
              min={0}
              step={1000}
              className="h-11 text-base"
              value={nominal}
              onChange={(e) => setNominal(e.target.value)}
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
            <Label htmlFor="ref-lunas" className="text-base">
              Nomor Referensi
            </Label>
            <Input
              id="ref-lunas"
              className="h-11 text-base"
              value={referensi}
              onChange={(e) => setReferensi(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            size="lg"
            className="text-base"
            disabled={simpan.isPending}
            onClick={() => simpan.mutate()}
          >
            {simpan.isPending ? "Menyimpan…" : "Simpan Pelunasan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
