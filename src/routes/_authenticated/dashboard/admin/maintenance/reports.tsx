import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { RoleGate } from "@/components/dashboard/RoleGate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { formatAngka, formatRupiah } from "@/lib/format";
import { ambilLaporanBiaya, labelJenisPekerjaan } from "@/lib/maintenance";

function awalTahun(): string {
  return `${new Date().getFullYear()}-01-01`;
}

export const Route = createFileRoute("/_authenticated/dashboard/admin/maintenance/reports")({
  head: () => ({
    meta: [
      { title: "Laporan Biaya Perawatan | Okta Car Rent" },
      {
        name: "description",
        content:
          "Rekap biaya perawatan armada per kendaraan, per jenis pekerjaan, dan per bulan untuk pengambilan keputusan pemilik.",
      },
      { property: "og:title", content: "Laporan Biaya Perawatan | Okta Car Rent" },
      {
        property: "og:description",
        content: "Analisis biaya perawatan kendaraan rental Okta Car Rent.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RoleGate allow={["owner", "admin"]}>
      <DashboardShell peran="Perawatan Armada" judul="Laporan Biaya Perawatan">
        <LaporanBiayaHalaman />
      </DashboardShell>
    </RoleGate>
  ),
});

function LaporanBiayaHalaman() {
  const [dari, setDari] = useState(awalTahun());
  const [sampai, setSampai] = useState(new Date().toISOString().slice(0, 10));

  const laporan = useQuery({
    queryKey: ["perawatan-laporan", dari, sampai],
    queryFn: () => ambilLaporanBiaya(dari, sampai),
  });

  return (
    <div className="space-y-6">
      <Button asChild size="lg" variant="outline" className="text-base">
        <Link to="/dashboard/admin/maintenance">Kembali ke Perawatan</Link>
      </Button>

      <div className="grid gap-4 rounded-lg border border-border bg-card p-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="dari-laporan" className="text-base">
            Dari Tanggal
          </Label>
          <Input
            id="dari-laporan"
            type="date"
            className="h-11 text-base"
            value={dari}
            onChange={(e) => setDari(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sampai-laporan" className="text-base">
            Sampai Tanggal
          </Label>
          <Input
            id="sampai-laporan"
            type="date"
            className="h-11 text-base"
            value={sampai}
            onChange={(e) => setSampai(e.target.value)}
          />
        </div>
      </div>

      {laporan.isPending ? (
        <Skeleton className="h-72 w-full rounded-lg" />
      ) : laporan.isError ? (
        <p role="alert" className="text-base text-destructive">
          {(laporan.error as Error).message}
        </p>
      ) : laporan.data ? (
        <div className="space-y-6">
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-base font-medium text-muted-foreground">Total Biaya Perawatan</p>
            <p className="mt-2 font-heading text-3xl font-bold text-foreground">
              {formatRupiah(Number(laporan.data.total))}
            </p>
          </div>

          <section className="rounded-lg border border-border bg-card p-4">
            <h2 className="font-heading text-xl font-bold text-foreground">Biaya per Kendaraan</h2>
            {laporan.data.per_kendaraan.length === 0 ? (
              <p className="mt-3 text-base text-muted-foreground">Tidak ada data pada periode ini.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {laporan.data.per_kendaraan.map((k) => (
                  <li
                    key={k.vehicle_id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-3 text-base"
                  >
                    <span className="text-foreground">{k.label}</span>
                    <span className="text-muted-foreground">
                      {formatAngka(k.jumlah)} pekerjaan • {formatRupiah(Number(k.total))}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-lg border border-border bg-card p-4">
            <h2 className="font-heading text-xl font-bold text-foreground">
              Biaya per Jenis Pekerjaan
            </h2>
            {laporan.data.per_jenis.length === 0 ? (
              <p className="mt-3 text-base text-muted-foreground">Tidak ada data pada periode ini.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {laporan.data.per_jenis.map((j) => (
                  <li
                    key={j.jenis}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-3 text-base"
                  >
                    <span className="text-foreground">{labelJenisPekerjaan(j.jenis)}</span>
                    <span className="text-muted-foreground">
                      {formatAngka(j.jumlah)} pekerjaan • {formatRupiah(Number(j.total))}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-lg border border-border bg-card p-4">
            <h2 className="font-heading text-xl font-bold text-foreground">Biaya per Bulan</h2>
            {laporan.data.per_bulan.length === 0 ? (
              <p className="mt-3 text-base text-muted-foreground">Tidak ada data pada periode ini.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {laporan.data.per_bulan.map((b) => (
                  <li
                    key={b.bulan}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-3 text-base"
                  >
                    <span className="text-foreground">{b.bulan}</span>
                    <span className="text-muted-foreground">
                      {formatAngka(b.jumlah)} pekerjaan • {formatRupiah(Number(b.total))}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}