import { createFileRoute, Link } from "@tanstack/react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { BadgeCheck, Plus, Search, Wallet } from "lucide-react";

import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { RoleGate } from "@/components/dashboard/RoleGate";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
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
import { statusPembayaran, labelMetodeBayar } from "@/lib/labels";
import {
  ambilDaftarPembayaran,
  filterPembayaranAwal,
  labelSumber,
  OPSI_METODE,
  OPSI_STATUS_PEMBAYARAN,
  OPSI_SUMBER,
  type FilterPembayaran,
} from "@/lib/payments";

export const Route = createFileRoute("/_authenticated/dashboard/admin/payments/")({
  head: () => ({
    meta: [
      { title: "Manajemen Pembayaran | Okta Car Rent" },
      {
        name: "description",
        content:
          "Catat, verifikasi, dan pantau seluruh pembayaran sewa mobil Okta Car Rent lengkap dengan kuitansi dan tunggakan.",
      },
      { property: "og:title", content: "Manajemen Pembayaran | Okta Car Rent" },
      {
        property: "og:description",
        content: "Daftar pembayaran, antrean verifikasi, dan ringkasan pemasukan rental mobil.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RoleGate allow={["owner", "admin"]}>
      <DashboardShell peran="Manajemen Keuangan" judul="Daftar Pembayaran">
        <HalamanPembayaran />
      </DashboardShell>
    </RoleGate>
  ),
});

function Kartu({ label, nilai, bahaya }: { label: string; nilai: string; bahaya?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p
        className={`mt-1 font-heading text-xl font-bold break-words ${
          bahaya ? "text-destructive" : "text-foreground"
        }`}
      >
        {nilai}
      </p>
    </div>
  );
}

function HalamanPembayaran() {
  const [filter, setFilter] = useState<FilterPembayaran>(filterPembayaranAwal);
  const [kataCari, setKataCari] = useState("");

  const daftar = useQuery({
    queryKey: ["pembayaran-daftar", filter],
    queryFn: () => ambilDaftarPembayaran(filter),
    placeholderData: keepPreviousData,
  });

  const totalHalaman = useMemo(
    () => Math.max(1, Math.ceil((daftar.data?.total ?? 0) / filter.perHalaman)),
    [daftar.data?.total, filter.perHalaman],
  );

  function ubah(sebagian: Partial<FilterPembayaran>) {
    setFilter((p) => ({ ...p, ...sebagian, halaman: sebagian.halaman ?? 1 }));
  }

  const r = daftar.data?.ringkasan;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-base text-muted-foreground">
          Seluruh transaksi pembayaran sewa, lengkap dengan nomor invoice dan kuitansi.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button size="lg" variant="outline" className="text-base" asChild>
            <Link to="/dashboard/admin/payments/verifikasi">
              <BadgeCheck className="mr-2 size-4" /> Antrean Verifikasi
            </Link>
          </Button>
          <Button size="lg" variant="outline" className="text-base" asChild>
            <Link to="/dashboard/admin/outstanding">
              <Wallet className="mr-2 size-4" /> Tunggakan
            </Link>
          </Button>
          <Button size="lg" className="text-base" asChild>
            <Link to="/dashboard/admin/payments/new">
              <Plus className="mr-2 size-4" /> Catat Pembayaran
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kartu label="Masuk Hari Ini" nilai={formatRupiah(r?.hariIni ?? 0)} />
        <Kartu label="Masuk Bulan Ini" nilai={formatRupiah(r?.bulanIni ?? 0)} />
        <Kartu
          label="Menunggu Verifikasi"
          nilai={`${r?.menungguJumlah ?? 0} • ${formatRupiah(r?.menungguNominal ?? 0)}`}
          bahaya={(r?.menungguJumlah ?? 0) > 0}
        />
        <Kartu label="Total Diterima" nilai={formatRupiah(r?.totalLunas ?? 0)} />
      </div>

      <div className="rounded-lg border border-border bg-card p-5">
        <form
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          onSubmit={(e) => {
            e.preventDefault();
            ubah({ cari: kataCari });
          }}
        >
          <div className="space-y-2 lg:col-span-2">
            <Label htmlFor="cari" className="text-base">
              Cari
            </Label>
            <div className="flex gap-2">
              <Input
                id="cari"
                className="h-11 text-base"
                placeholder="Invoice, kuitansi, kontrak, atau nama penyewa"
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
            <Select value={filter.status} onValueChange={(v) => ubah({ status: v })}>
              <SelectTrigger className="h-11 text-base">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="semua" className="text-base">
                  Semua status
                </SelectItem>
                {OPSI_STATUS_PEMBAYARAN.map((o) => (
                  <SelectItem key={o.value} value={o.value} className="text-base">
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-base">Metode</Label>
            <Select value={filter.metode} onValueChange={(v) => ubah({ metode: v })}>
              <SelectTrigger className="h-11 text-base">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="semua" className="text-base">
                  Semua metode
                </SelectItem>
                {OPSI_METODE.map((o) => (
                  <SelectItem key={o.value} value={o.value} className="text-base">
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-base">Sumber</Label>
            <Select value={filter.sumber} onValueChange={(v) => ubah({ sumber: v })}>
              <SelectTrigger className="h-11 text-base">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="semua" className="text-base">
                  Semua sumber
                </SelectItem>
                {OPSI_SUMBER.map((o) => (
                  <SelectItem key={o.value} value={o.value} className="text-base">
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="dari" className="text-base">
              Dari Tanggal
            </Label>
            <Input
              id="dari"
              type="date"
              className="h-11 text-base"
              value={filter.dariTanggal}
              onChange={(e) => ubah({ dariTanggal: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sampai" className="text-base">
              Sampai Tanggal
            </Label>
            <Input
              id="sampai"
              type="date"
              className="h-11 text-base"
              value={filter.sampaiTanggal}
              onChange={(e) => ubah({ sampaiTanggal: e.target.value })}
            />
          </div>
        </form>
      </div>

      {daftar.isPending ? (
        <Skeleton className="h-64 w-full rounded-lg" />
      ) : daftar.error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-base text-destructive">
          Data gagal dimuat. {(daftar.error as Error).message}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-base">Invoice / Kuitansi</TableHead>
                <TableHead className="text-base">Kontrak & Penyewa</TableHead>
                <TableHead className="text-base">Tanggal</TableHead>
                <TableHead className="text-base">Nominal</TableHead>
                <TableHead className="text-base">Metode</TableHead>
                <TableHead className="text-base">Sumber</TableHead>
                <TableHead className="text-base">Status</TableHead>
                <TableHead className="text-base">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(daftar.data?.baris ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-base text-muted-foreground">
                    Belum ada pembayaran yang cocok dengan saringan.
                  </TableCell>
                </TableRow>
              )}
              {(daftar.data?.baris ?? []).map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="text-base font-semibold">
                    {p.invoice_number}
                    <span className="block text-sm font-normal text-muted-foreground">
                      {p.receipt_number ?? "Belum ada kuitansi"}
                    </span>
                  </TableCell>
                  <TableCell className="text-base">
                    {p.contracts?.contract_number ?? "-"}
                    <span className="block text-sm text-muted-foreground">
                      {p.contracts?.renters?.full_name ?? "-"}
                    </span>
                  </TableCell>
                  <TableCell className="text-base">{formatTanggalSingkat(p.payment_date)}</TableCell>
                  <TableCell className="text-base font-semibold">
                    {formatRupiah(Number(p.amount))}
                  </TableCell>
                  <TableCell className="text-base">
                    {labelMetodeBayar[p.method] ?? p.method}
                  </TableCell>
                  <TableCell className="text-base">{labelSumber(p.payment_source)}</TableCell>
                  <TableCell>
                    <StatusBadge map={statusPembayaran} value={p.status} />
                    {p.reversed_at && (
                      <span className="mt-1 block text-sm text-muted-foreground">Dibalik</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" className="text-base" asChild>
                      <Link to="/dashboard/admin/payments/$id" params={{ id: p.id }}>
                        Detail
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-base text-muted-foreground">
          Halaman {filter.halaman} dari {totalHalaman} • {daftar.data?.total ?? 0} transaksi
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="lg"
            className="text-base"
            disabled={filter.halaman <= 1}
            onClick={() => ubah({ halaman: filter.halaman - 1 })}
          >
            Sebelumnya
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="text-base"
            disabled={filter.halaman >= totalHalaman}
            onClick={() => ubah({ halaman: filter.halaman + 1 })}
          >
            Berikutnya
          </Button>
        </div>
      </div>
    </div>
  );
}
