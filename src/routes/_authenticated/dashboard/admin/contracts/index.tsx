import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { FileText, Plus, Search } from "lucide-react";

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
import { statusKontrak, labelTipeSewa } from "@/lib/labels";
import {
  ambilDaftarKontrak,
  filterKontrakAwal,
  OPSI_STATUS_KONTRAK,
  OPSI_TIPE_SEWA,
  type FilterKontrak,
  type UrutanKontrak,
} from "@/lib/contracts";

export const Route = createFileRoute("/_authenticated/dashboard/admin/contracts/")({
  head: () => ({
    meta: [
      { title: "Daftar Kontrak Sewa | Okta Car Rent" },
      {
        name: "description",
        content:
          "Kelola kontrak sewa Okta Car Rent: pantau kontrak aktif, terlambat, jatuh tempo, dan nilai sewa berjalan.",
      },
      { property: "og:title", content: "Daftar Kontrak Sewa | Okta Car Rent" },
      {
        property: "og:description",
        content: "Manajemen kontrak rental mobil: pembuatan, serah terima, perpanjangan, pengembalian.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RoleGate allow={["owner", "admin"]}>
      <DashboardShell peran="Manajemen Kontrak" judul="Daftar Kontrak Sewa">
        <HalamanDaftarKontrak />
      </DashboardShell>
    </RoleGate>
  ),
});

const OPSI_URUTAN: { value: UrutanKontrak; label: string }[] = [
  { value: "terbaru", label: "Mulai terbaru" },
  { value: "terlama", label: "Mulai terlama" },
  { value: "jatuh_tempo", label: "Jatuh tempo terdekat" },
  { value: "nilai", label: "Nilai terbesar" },
];

function HalamanDaftarKontrak() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<FilterKontrak>(filterKontrakAwal);
  const [kataCari, setKataCari] = useState("");

  const daftar = useQuery({
    queryKey: ["kontrak-daftar", filter],
    queryFn: () => ambilDaftarKontrak(filter),
    placeholderData: keepPreviousData,
  });

  const totalHalaman = useMemo(
    () => Math.max(1, Math.ceil((daftar.data?.total ?? 0) / filter.perHalaman)),
    [daftar.data?.total, filter.perHalaman],
  );

  function ubah(sebagian: Partial<FilterKontrak>) {
    setFilter((p) => ({ ...p, ...sebagian, halaman: sebagian.halaman ?? 1 }));
  }

  const r = daftar.data?.ringkasan;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-base text-muted-foreground">
          Kelola seluruh kontrak sewa, dari draft sampai pengembalian unit.
        </p>
        <Button size="lg" className="text-base" asChild>
          <Link to="/dashboard/admin/contracts/new">
            <Plus className="mr-2 size-4" /> Buat Kontrak
          </Link>
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Kartu label="Total Kontrak" nilai={String(r?.total ?? 0)} />
        <Kartu label="Aktif" nilai={String(r?.aktif ?? 0)} />
        <Kartu label="Terlambat" nilai={String(r?.terlambat ?? 0)} bahaya />
        <Kartu label="Jatuh Tempo 7 Hari" nilai={String(r?.jatuhTempoMingguIni ?? 0)} />
        <Kartu label="Nilai Sewa Berjalan" nilai={formatRupiah(r?.nilaiAktif ?? 0)} />
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
              Cari Kontrak
            </Label>
            <div className="flex gap-2">
              <Input
                id="cari"
                value={kataCari}
                onChange={(e) => setKataCari(e.target.value)}
                placeholder="Nomor kontrak, nama penyewa, atau nomor polisi"
                className="h-11 text-base"
              />
              <Button type="submit" size="lg" variant="outline" className="text-base">
                <Search className="size-4" />
                <span className="sr-only">Cari</span>
              </Button>
            </div>
          </div>

          <Saring label="Status" value={filter.status} onChange={(v) => ubah({ status: v })}>
            <SelectItem value="semua" className="text-base">
              Semua status
            </SelectItem>
            {OPSI_STATUS_KONTRAK.map((o) => (
              <SelectItem key={o.value} value={o.value} className="text-base">
                {o.label}
              </SelectItem>
            ))}
          </Saring>

          <Saring label="Jenis Sewa" value={filter.tipe} onChange={(v) => ubah({ tipe: v })}>
            <SelectItem value="semua" className="text-base">
              Semua jenis
            </SelectItem>
            {OPSI_TIPE_SEWA.map((o) => (
              <SelectItem key={o.value} value={o.value} className="text-base">
                {o.label}
              </SelectItem>
            ))}
          </Saring>

          <div className="space-y-2">
            <Label htmlFor="dari" className="text-base">
              Periode Dari
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
              Periode Sampai
            </Label>
            <Input
              id="sampai"
              type="date"
              className="h-11 text-base"
              value={filter.sampaiTanggal}
              onChange={(e) => ubah({ sampaiTanggal: e.target.value })}
            />
          </div>

          <Saring
            label="Urutkan"
            value={filter.urutan}
            onChange={(v) => ubah({ urutan: v as UrutanKontrak })}
          >
            {OPSI_URUTAN.map((o) => (
              <SelectItem key={o.value} value={o.value} className="text-base">
                {o.label}
              </SelectItem>
            ))}
          </Saring>
        </form>
      </div>

      <div className="rounded-lg border border-border bg-card">
        {daftar.isLoading ? (
          <div className="space-y-3 p-5">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : daftar.isError ? (
          <p role="alert" className="p-5 text-base text-destructive">
            {(daftar.error as Error).message}
          </p>
        ) : (daftar.data?.baris.length ?? 0) === 0 ? (
          <div className="p-8 text-center">
            <FileText className="mx-auto size-8 text-muted-foreground" />
            <p className="mt-3 text-base text-muted-foreground">
              Belum ada kontrak yang cocok dengan pencarian.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-base">Nomor Kontrak</TableHead>
                  <TableHead className="text-base">Penyewa</TableHead>
                  <TableHead className="text-base">Unit</TableHead>
                  <TableHead className="text-base">Periode</TableHead>
                  <TableHead className="text-base">Total</TableHead>
                  <TableHead className="text-base">Sisa</TableHead>
                  <TableHead className="text-base">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {daftar.data!.baris.map((k) => (
                  <TableRow
                    key={k.id}
                    className="cursor-pointer"
                    onClick={() =>
                      navigate({
                        to: "/dashboard/admin/contracts/$id",
                        params: { id: k.id },
                      })
                    }
                  >
                    <TableCell className="text-base font-semibold">
                      {k.contract_number}
                      <span className="block text-sm font-normal text-muted-foreground">
                        {labelTipeSewa[k.rental_type] ?? k.rental_type}
                      </span>
                    </TableCell>
                    <TableCell className="text-base">{k.renters?.full_name ?? "-"}</TableCell>
                    <TableCell className="text-base">
                      {k.vehicles ? `${k.vehicles.brand} ${k.vehicles.model}` : "-"}
                      <span className="block text-sm text-muted-foreground">
                        {k.vehicles?.plate_number ?? ""}
                      </span>
                    </TableCell>
                    <TableCell className="text-base">
                      {formatTanggalSingkat(k.start_date)}
                      <span className="block text-sm text-muted-foreground">
                        s/d {formatTanggalSingkat(k.end_date)}
                      </span>
                    </TableCell>
                    <TableCell className="text-base">{formatRupiah(k.total_amount)}</TableCell>
                    <TableCell className="text-base">
                      {formatRupiah(Math.max(0, Number(k.total_amount) - k.dibayar))}
                    </TableCell>
                    <TableCell>
                      <StatusBadge map={statusKontrak} value={k.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {totalHalaman > 1 && (
        <div className="flex items-center justify-between gap-3">
          <Button
            size="lg"
            variant="outline"
            className="text-base"
            disabled={filter.halaman <= 1}
            onClick={() => setFilter((p) => ({ ...p, halaman: p.halaman - 1 }))}
          >
            Sebelumnya
          </Button>
          <p className="text-base text-muted-foreground">
            Halaman {filter.halaman} dari {totalHalaman}
          </p>
          <Button
            size="lg"
            variant="outline"
            className="text-base"
            disabled={filter.halaman >= totalHalaman}
            onClick={() => setFilter((p) => ({ ...p, halaman: p.halaman + 1 }))}
          >
            Berikutnya
          </Button>
        </div>
      )}
    </div>
  );
}

function Kartu({ label, nilai, bahaya }: { label: string; nilai: string; bahaya?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-base text-muted-foreground">{label}</p>
      <p
        className={`mt-1 font-heading text-2xl font-bold ${bahaya ? "text-destructive" : "text-foreground"}`}
      >
        {nilai}
      </p>
    </div>
  );
}

function Saring({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-base">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-11 text-base">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>{children}</SelectContent>
      </Select>
    </div>
  );
}