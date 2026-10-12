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
import { statusPerawatan } from "@/lib/labels";
import {
  ambilDaftarPerawatan,
  ambilKendaraanPerluServis,
  ambilRingkasanPerawatan,
  filterPerawatanAwal,
  labelJenisPekerjaan,
  labelKategori,
  OPSI_KATEGORI_PERAWATAN,
  OPSI_STATUS_PERAWATAN,
  type FilterPerawatan,
} from "@/lib/maintenance";

export const Route = createFileRoute("/_authenticated/dashboard/admin/maintenance/")({
  head: () => ({
    meta: [
      { title: "Perawatan Armada | Okta Car Rent" },
      {
        name: "description",
        content:
          "Pantau jadwal servis berkala, perbaikan kerusakan, biaya bengkel, dan kesiapan armada rental mobil.",
      },
      { property: "og:title", content: "Perawatan Armada | Okta Car Rent" },
      {
        property: "og:description",
        content: "Kelola servis berkala dan perbaikan kendaraan rental dalam satu halaman.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RoleGate allow={["owner", "admin"]}>
      <DashboardShell peran="Perawatan Armada" judul="Perawatan Armada">
        <HalamanPerawatan />
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

function Peringatan({ tingkat }: { tingkat: string }) {
  const map: Record<string, { label: string; kelas: string }> = {
    terlambat: { label: "Terlambat servis", kelas: "text-destructive" },
    segera: { label: "Segera servis", kelas: "text-primary" },
    aman: { label: "Aman", kelas: "text-muted-foreground" },
  };
  const e = map[tingkat] ?? map.aman;
  return <span className={`text-sm font-semibold ${e.kelas}`}>{e.label}</span>;
}

function HalamanPerawatan() {
  const [filter, setFilter] = useState<FilterPerawatan>(filterPerawatanAwal);

  const ringkasan = useQuery({
    queryKey: ["perawatan-ringkasan"],
    queryFn: ambilRingkasanPerawatan,
  });
  const jatuhTempo = useQuery({
    queryKey: ["perawatan-jatuh-tempo"],
    queryFn: ambilKendaraanPerluServis,
  });
  const daftar = useQuery({
    queryKey: ["perawatan-daftar", filter],
    queryFn: () => ambilDaftarPerawatan(filter),
  });

  const perluServis = (jatuhTempo.data ?? []).filter(
    (v) => v.oil_urgency !== "aman" || v.tire_urgency !== "aman",
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        <Button asChild size="lg" className="text-base">
          <Link to="/dashboard/admin/maintenance/new">Jadwalkan Perawatan</Link>
        </Button>
        <Button asChild size="lg" variant="outline" className="text-base">
          <Link to="/dashboard/admin/maintenance/workshops">Data Bengkel</Link>
        </Button>
        <Button asChild size="lg" variant="outline" className="text-base">
          <Link to="/dashboard/admin/maintenance/reports">Laporan Biaya</Link>
        </Button>
        <Button asChild size="lg" variant="outline" className="text-base">
          <Link to="/dashboard/admin/maintenance/settings">Pengaturan Interval</Link>
        </Button>
      </div>

      {ringkasan.isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-lg" />
          ))}
        </div>
      ) : ringkasan.isError ? (
        <p role="alert" className="text-base text-destructive">
          {(ringkasan.error as Error).message}
        </p>
      ) : ringkasan.data ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Kartu
            judul="Unit Dalam Perawatan"
            nilai={formatAngka(ringkasan.data.perawatan)}
            catatan={`${formatAngka(ringkasan.data.tersedia)} unit siap disewa`}
          />
          <Kartu
            judul="Pekerjaan Aktif"
            nilai={formatAngka(ringkasan.data.pekerjaan_aktif)}
            catatan={`${formatAngka(ringkasan.data.terlambat_jadwal)} jadwal terlewat`}
          />
          <Kartu
            judul="Perlu Servis"
            nilai={formatAngka(ringkasan.data.oli_segera + ringkasan.data.ban_segera)}
            catatan={`Oli ${formatAngka(ringkasan.data.oli_segera)} • Ban ${formatAngka(ringkasan.data.ban_segera)}`}
          />
          <Kartu
            judul="Biaya Bulan Ini"
            nilai={formatRupiah(ringkasan.data.biaya_bulan_ini)}
            catatan={`Tahun ini ${formatRupiah(ringkasan.data.biaya_tahun_ini)}`}
          />
        </div>
      ) : null}

      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="font-heading text-xl font-bold text-foreground">
          Kendaraan Perlu Servis Berkala
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Berdasarkan kilometer terakhir dan interval servis yang berlaku.
        </p>
        {jatuhTempo.isPending ? (
          <Skeleton className="mt-4 h-32 w-full rounded-md" />
        ) : perluServis.length === 0 ? (
          <p className="mt-4 text-base text-muted-foreground">
            Semua kendaraan masih dalam batas interval servis.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {perluServis.map((v) => (
              <li
                key={v.vehicle_id}
                className="rounded-md border border-border bg-secondary p-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="text-base font-semibold text-foreground">
                    {v.brand} {v.model} • {v.plate_number}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Kilometer: {formatAngka(v.current_odometer)} KM
                  </p>
                </div>
                <div className="mt-2 grid gap-1 text-base sm:grid-cols-2">
                  <p>
                    Ganti oli: <Peringatan tingkat={v.oil_urgency} /> (target{" "}
                    {formatAngka(v.oil_target)} KM)
                  </p>
                  <p>
                    Ganti ban: <Peringatan tingkat={v.tire_urgency} /> (target{" "}
                    {formatAngka(v.tire_target)} KM)
                  </p>
                </div>
                <div className="mt-3">
                  <Button asChild size="sm" variant="outline" className="text-sm">
                    <Link
                      to="/dashboard/admin/maintenance/new"
                      search={{ vehicle: v.vehicle_id }}
                    >
                      Jadwalkan Servis
                    </Link>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid gap-4 rounded-lg border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-2">
          <Label htmlFor="cari-perawatan" className="text-base">
            Cari
          </Label>
          <Input
            id="cari-perawatan"
            className="h-11 text-base"
            placeholder="Kendaraan, plat, bengkel"
            value={filter.cari}
            onChange={(e) => setFilter((f) => ({ ...f, cari: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-base">Status</Label>
          <Select
            value={filter.status}
            onValueChange={(v) =>
              setFilter((f) => ({ ...f, status: v as FilterPerawatan["status"] }))
            }
          >
            <SelectTrigger className="h-11 text-base">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="semua" className="text-base">
                Semua Status
              </SelectItem>
              {OPSI_STATUS_PERAWATAN.map((o) => (
                <SelectItem key={o.value} value={o.value} className="text-base">
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-base">Kategori</Label>
          <Select
            value={filter.kategori}
            onValueChange={(v) => setFilter((f) => ({ ...f, kategori: v }))}
          >
            <SelectTrigger className="h-11 text-base">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="semua" className="text-base">
                Semua Kategori
              </SelectItem>
              {OPSI_KATEGORI_PERAWATAN.map((o) => (
                <SelectItem key={o.value} value={o.value} className="text-base">
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="dari-perawatan" className="text-base">
            Rencana Mulai Dari
          </Label>
          <Input
            id="dari-perawatan"
            type="date"
            className="h-11 text-base"
            value={filter.dari}
            onChange={(e) => setFilter((f) => ({ ...f, dari: e.target.value }))}
          />
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
          Belum ada catatan perawatan yang sesuai filter.
        </p>
      ) : (
        <ul className="space-y-3">
          {(daftar.data ?? []).map((m) => (
            <li key={m.id} className="rounded-lg border border-border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-foreground">
                    {m.vehicles
                      ? `${m.vehicles.brand} ${m.vehicles.model} • ${m.vehicles.plate_number}`
                      : "-"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {labelKategori(m.category)} • {labelJenisPekerjaan(m.maintenance_type)} •
                    Rencana {formatTanggalSingkat(m.scheduled_date)}
                  </p>
                </div>
                <StatusBadge map={statusPerawatan} value={m.status} />
              </div>
              <div className="mt-3 grid gap-2 text-base sm:grid-cols-3">
                <p>Bengkel: {m.workshops?.name ?? m.workshop_name ?? "-"}</p>
                <p>Biaya: {formatRupiah(Number(m.cost))}</p>
                <p>
                  Selesai: {m.completed_date ? formatTanggalSingkat(m.completed_date) : "Belum"}
                </p>
              </div>
              <div className="mt-3">
                <Button asChild size="lg" variant="outline" className="text-base">
                  <Link to="/dashboard/admin/maintenance/$id" params={{ id: m.id }}>
                    Buka Detail Perawatan
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