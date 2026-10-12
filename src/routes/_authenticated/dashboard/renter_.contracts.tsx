import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { RoleGate } from "@/components/dashboard/RoleGate";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRupiah, formatTanggalSingkat } from "@/lib/format";
import { statusKontrak } from "@/lib/labels";
import {
  ambilKontrakSaya,
  dendaKontrakSaya,
  OPSI_SOPIR,
  OPSI_TIPE_SEWA,
  type KontrakSaya,
} from "@/lib/contracts";

export const Route = createFileRoute("/_authenticated/dashboard/renter_/contracts")({
  head: () => ({
    meta: [
      { title: "Kontrak Saya | Okta Car Rent" },
      {
        name: "description",
        content:
          "Lihat kontrak sewa Anda di Okta Car Rent: unit yang disewa, periode sewa, status kontrak, total biaya, dan sisa pembayaran.",
      },
      { property: "og:title", content: "Kontrak Saya | Okta Car Rent" },
      {
        property: "og:description",
        content: "Daftar kontrak sewa penyewa Okta Car Rent beserta periode, status, dan biaya.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RoleGate allow={["renter", "admin", "owner"]}>
      <DashboardShell peran="Penyewa" judul="Kontrak Saya">
        <PortalKontrak />
      </DashboardShell>
    </RoleGate>
  ),
});

function labelTipe(v: string): string {
  return OPSI_TIPE_SEWA.find((o) => o.value === v)?.label ?? v;
}

function labelSopir(v: string): string {
  return OPSI_SOPIR.find((o) => o.value === v)?.label ?? v;
}

function Baris({ label, nilai }: { label: string; nilai: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border py-2 last:border-0">
      <span className="text-base text-muted-foreground">{label}</span>
      <span className="text-base font-semibold text-foreground text-right">{nilai}</span>
    </div>
  );
}

function KartuKontrak({ k }: { k: KontrakSaya }) {
  const denda = dendaKontrakSaya(k);
  const sisa = Math.max(0, Number(k.total_amount) + denda.nominal - Number(k.dibayar));
  const unit = k.vehicles
    ? `${k.vehicles.brand} ${k.vehicles.model} (${k.vehicles.plate_number})`
    : "-";

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-heading text-xl font-bold text-foreground">{k.contract_number}</p>
          <p className="text-base text-muted-foreground">{unit}</p>
        </div>
        <StatusBadge map={statusKontrak} value={k.status} />
      </div>

      <div className="mt-4">
        <Baris
          label="Periode sewa"
          nilai={`${formatTanggalSingkat(k.start_date)} — ${formatTanggalSingkat(k.end_date)}`}
        />
        <Baris
          label="Jenis sewa"
          nilai={`${labelTipe(k.rental_type)} · ${k.duration_qty} × ${formatRupiah(Number(k.base_rate))}`}
        />
        <Baris label="Layanan" nilai={labelSopir(k.driver_option)} />
        {k.pickup_location ? <Baris label="Lokasi ambil" nilai={k.pickup_location} /> : null}
        {k.return_location ? <Baris label="Lokasi kembali" nilai={k.return_location} /> : null}
        {k.actual_return_date ? (
          <Baris label="Tanggal kembali" nilai={formatTanggalSingkat(k.actual_return_date)} />
        ) : null}
        <Baris label="Total biaya sewa" nilai={formatRupiah(Number(k.total_amount))} />
        <Baris label="Deposit" nilai={formatRupiah(Number(k.deposit_amount))} />
        {denda.nominal > 0 ? (
          <Baris
            label={`Denda keterlambatan (${denda.hari} hari)`}
            nilai={formatRupiah(denda.nominal)}
          />
        ) : null}
        <Baris label="Sudah dibayar" nilai={formatRupiah(Number(k.dibayar))} />
        <Baris label="Sisa yang harus dibayar" nilai={formatRupiah(sisa)} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button asChild variant="outline" size="lg" className="text-base">
          <Link to="/dashboard/renter/payments">Lihat Pembayaran</Link>
        </Button>
        <Button asChild variant="outline" size="lg" className="text-base">
          <Link to="/dashboard/renter/deposits">Lihat Deposit</Link>
        </Button>
      </div>
    </div>
  );
}

function PortalKontrak() {
  const daftar = useQuery({ queryKey: ["kontrak-saya"], queryFn: ambilKontrakSaya });

  return (
    <div className="space-y-6">
      <p className="text-base text-muted-foreground">
        Berikut kontrak sewa yang tercatat atas nama Anda. Hubungi admin bila ada data yang tidak
        sesuai.
      </p>

      {daftar.isPending ? (
        <Skeleton className="h-48 w-full rounded-lg" />
      ) : daftar.isError ? (
        <p role="alert" className="text-base text-destructive">
          {(daftar.error as Error).message}
        </p>
      ) : (daftar.data ?? []).length === 0 ? (
        <p className="rounded-md border border-border bg-card p-4 text-base text-muted-foreground">
          Belum ada kontrak tercatat.
        </p>
      ) : (
        <div className="space-y-4">
          {(daftar.data ?? []).map((k) => (
            <KartuKontrak key={k.id} k={k} />
          ))}
        </div>
      )}
    </div>
  );
}
