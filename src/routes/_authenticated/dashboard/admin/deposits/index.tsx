import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

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
import { formatAngka, formatRupiah, formatTanggalSingkat } from "@/lib/format";
import { statusDeposit } from "@/lib/labels";
import {
  ambilDaftarDeposit,
  ambilRingkasanDeposit,
  filterDepositAwal,
  OPSI_STATUS_DEPOSIT,
  type FilterDeposit,
} from "@/lib/deposits";

export const Route = createFileRoute("/_authenticated/dashboard/admin/deposits/")({
  head: () => ({
    meta: [
      { title: "Manajemen Deposit | Okta Car Rent" },
      {
        name: "description",
        content:
          "Kelola uang jaminan Rp500.000 per kontrak: penerimaan, potongan tunggakan dan kerusakan, serta pengembalian ke penyewa.",
      },
      { property: "og:title", content: "Manajemen Deposit | Okta Car Rent" },
      {
        property: "og:description",
        content: "Daftar deposit rental mobil beserta status penerimaan dan pengembaliannya.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RoleGate allow={["owner", "admin"]}>
      <DashboardShell peran="Manajemen Deposit" judul="Manajemen Deposit">
        <HalamanDeposit />
      </DashboardShell>
    </RoleGate>
  ),
});

function Kartu({ judul, nilai, catatan }: { judul: string; nilai: string; catatan: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-base font-medium text-muted-foreground">{judul}</p>
      <p className="mt-2 font-heading text-2xl font-bold break-words text-foreground">{nilai}</p>
      <p className="mt-1 text-sm text-muted-foreground">{catatan}</p>
    </div>
  );
}

function HalamanDeposit() {
  const [filter, setFilter] = useState<FilterDeposit>(filterDepositAwal);

  const ringkasan = useQuery({
    queryKey: ["deposit-ringkasan"],
    queryFn: ambilRingkasanDeposit,
  });

  const daftar = useQuery({
    queryKey: ["deposit-daftar", filter],
    queryFn: () => ambilDaftarDeposit(filter),
  });

  return (
    <div className="space-y-6">
      <p className="text-base text-muted-foreground">
        Deposit adalah uang jaminan Rp 500.000 per kontrak, bukan pendapatan perusahaan.
      </p>

      {ringkasan.isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-lg" />
          ))}
        </div>
      ) : ringkasan.data ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Kartu
            judul="Deposit Ditahan"
            nilai={formatRupiah(ringkasan.data.ditahanNominal)}
            catatan={`${formatAngka(ringkasan.data.ditahanJumlah)} deposit sedang ditahan`}
          />
          <Kartu
            judul="Menunggu Penerimaan"
            nilai={formatAngka(ringkasan.data.menungguJumlah)}
            catatan="Deposit belum diterima dari penyewa"
          />
          <Kartu
            judul="Dikembalikan Bulan Ini"
            nilai={formatRupiah(ringkasan.data.dikembalikanBulanIni)}
            catatan="Total pengembalian sejak awal bulan"
          />
          <Kartu
            judul="Deposit Disita"
            nilai={formatAngka(ringkasan.data.disitaJumlah)}
            catatan="Habis terpakai untuk potongan"
          />
        </div>
      ) : null}

      <div className="grid gap-4 rounded-lg border border-border bg-card p-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="cari-deposit" className="text-base">
            Cari Penyewa / Nomor Kontrak
          </Label>
          <Input
            id="cari-deposit"
            className="h-11 text-base"
            placeholder="Nama penyewa, nomor kontrak, atau telepon"
            value={filter.cari}
            onChange={(e) => setFilter((f) => ({ ...f, cari: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-base">Status Deposit</Label>
          <Select
            value={filter.status}
            onValueChange={(v) =>
              setFilter((f) => ({ ...f, status: v as FilterDeposit["status"] }))
            }
          >
            <SelectTrigger className="h-11 text-base">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="semua" className="text-base">
                Semua Status
              </SelectItem>
              {OPSI_STATUS_DEPOSIT.map((o) => (
                <SelectItem key={o.value} value={o.value} className="text-base">
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {daftar.isPending ? (
        <Skeleton className="h-64 w-full rounded-lg" />
      ) : daftar.isError ? (
        <p role="alert" className="text-base text-destructive">
          {(daftar.error as Error).message}
        </p>
      ) : (daftar.data ?? []).length === 0 ? (
        <p className="rounded-md border border-border bg-card p-4 text-base text-muted-foreground">
          Belum ada deposit yang sesuai filter.
        </p>
      ) : (
        <ul className="space-y-3">
          {(daftar.data ?? []).map((d) => (
            <li key={d.id} className="rounded-lg border border-border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-foreground">
                    {d.renters?.full_name ?? "-"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {d.contracts?.contract_number ?? "-"} •{" "}
                    {d.contracts
                      ? `${formatTanggalSingkat(d.contracts.start_date)} – ${formatTanggalSingkat(d.contracts.end_date)}`
                      : "-"}
                  </p>
                </div>
                <StatusBadge map={statusDeposit} value={d.status} />
              </div>
              <div className="mt-3 grid gap-2 text-base sm:grid-cols-3">
                <p>
                  Deposit:{" "}
                  <span className="font-semibold text-foreground">{formatRupiah(d.amount)}</span>
                </p>
                <p>
                  Potongan:{" "}
                  <span className="font-semibold text-foreground">
                    {formatRupiah(d.total_potongan)}
                  </span>
                </p>
                <p>
                  Sisa:{" "}
                  <span className="font-semibold text-foreground">
                    {formatRupiah(Math.max(0, Number(d.amount) - d.total_potongan))}
                  </span>
                </p>
              </div>
              <div className="mt-3">
                <Button asChild size="lg" variant="outline" className="text-base">
                  <Link to="/dashboard/admin/deposits/$id" params={{ id: d.id }}>
                    Buka Detail Deposit
                  </Link>
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}