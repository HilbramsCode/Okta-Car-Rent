import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Pencil, PowerOff } from "lucide-react";

import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { RoleGate } from "@/components/dashboard/RoleGate";
import { StatusBadge } from "@/components/StatusBadge";
import { PengelolaDokumen } from "@/components/vehicles/PengelolaDokumen";
import { PengelolaFoto } from "@/components/vehicles/PengelolaFoto";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatAngka, formatRupiah, formatTanggalSingkat, formatWaktu } from "@/lib/format";
import { statusKendaraan, statusKontrak, statusPerawatan } from "@/lib/labels";
import {
  ambilDetailKendaraan,
  nonaktifkanKendaraan,
  OPSI_STATUS,
  ubahStatusKendaraan,
  type StatusKendaraan,
} from "@/lib/vehicles";

export const Route = createFileRoute("/_authenticated/dashboard/admin/vehicles/$id/")({
  head: () => ({
    meta: [
      { title: "Detail Kendaraan | Okta Car Rent" },
      {
        name: "description",
        content:
          "Informasi lengkap kendaraan: spesifikasi, foto, dokumen, riwayat sewa, perawatan, dan status.",
      },
      { property: "og:title", content: "Detail Kendaraan | Okta Car Rent" },
      {
        property: "og:description",
        content: "Data armada rental mobil beserta riwayat operasionalnya.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RoleGate allow={["owner", "admin"]}>
      <DashboardShell peran="Manajemen Armada" judul="Detail Kendaraan">
        <HalamanDetail />
      </DashboardShell>
    </RoleGate>
  ),
});

function HalamanDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [statusBaru, setStatusBaru] = useState<StatusKendaraan | "">("");

  const detail = useQuery({
    queryKey: ["kendaraan", id],
    queryFn: () => ambilDetailKendaraan(id),
  });

  function segarkan() {
    queryClient.invalidateQueries({ queryKey: ["kendaraan", id] });
    queryClient.invalidateQueries({ queryKey: ["armada-daftar"] });
    queryClient.invalidateQueries({ queryKey: ["armada-ringkasan"] });
  }

  const ubahStatus = useMutation({
    mutationFn: (status: StatusKendaraan) => ubahStatusKendaraan(id, status),
    onSuccess: () => {
      toast.success("Status kendaraan diperbarui. Riwayat dan log audit tercatat.");
      setStatusBaru("");
      segarkan();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const nonaktifkan = useMutation({
    mutationFn: () => nonaktifkanKendaraan(id),
    onSuccess: () => {
      toast.success("Kendaraan dinonaktifkan. Data historis tetap tersimpan.");
      segarkan();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (detail.isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  if (detail.isError || !detail.data) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-6">
        <p className="text-base font-semibold text-destructive">Data kendaraan tidak dapat dimuat.</p>
        <p className="mt-1 text-base text-muted-foreground">
          {detail.error instanceof Error ? detail.error.message : "Terjadi kesalahan."}
        </p>
        <div className="mt-4 flex gap-3">
          <Button size="lg" className="text-base" onClick={() => detail.refetch()}>
            Coba lagi
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="text-base"
            onClick={() => navigate({ to: "/dashboard/admin/vehicles" })}
          >
            Kembali ke daftar
          </Button>
        </div>
      </div>
    );
  }

  const { kendaraan: k, foto, dokumen, kontrak, kontrakBerjalan, perawatan, riwayatStatus } =
    detail.data;

  const info: [string, string][] = [
    ["Nomor Polisi", k.plate_number],
    ["Merek & Model", `${k.brand} ${k.model}${k.variant ? ` ${k.variant}` : ""}`],
    ["Tahun", String(k.year)],
    ["Warna", k.color],
    ["Transmisi", k.transmission],
    ["Bahan Bakar", k.fuel_type],
    ["Kapasitas", `${k.seat_capacity} kursi`],
    ["Kategori", k.category],
    ["Kilometer", `${formatAngka(k.current_odometer)} km`],
    ["Tarif Harian", formatRupiah(k.daily_rate)],
    ["Tarif Mingguan", k.weekly_rate ? formatRupiah(k.weekly_rate) : "-"],
    ["Tarif Bulanan", k.monthly_rate ? formatRupiah(k.monthly_rate) : "-"],
    ["Deposit", formatRupiah(k.deposit_amount)],
    ["Tanggal Pembelian", formatTanggalSingkat(k.purchase_date)],
    ["Harga Beli", k.purchase_price ? formatRupiah(k.purchase_price) : "-"],
    ["Asuransi", k.insurance_provider ?? "-"],
    ["Nomor Polis", k.insurance_policy_number ?? "-"],
    ["Asuransi Berakhir", formatTanggalSingkat(k.insurance_expiry)],
    ["STNK Berakhir", formatTanggalSingkat(k.stnk_expiry)],
    ["Jatuh Tempo Pajak", formatTanggalSingkat(k.tax_due_date)],
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="font-heading text-2xl font-bold text-foreground">
            {k.brand} {k.model} — {k.plate_number}
          </h2>
          <StatusBadge map={statusKendaraan} value={k.status} />
        </div>
        <div className="flex flex-wrap gap-3">
          <Button asChild size="lg" variant="outline" className="text-base">
            <Link to="/dashboard/admin/vehicles">← Daftar kendaraan</Link>
          </Button>
          <Button asChild size="lg" className="text-base">
            <Link to="/dashboard/admin/vehicles/$id/edit" params={{ id }}>
              <Pencil className="mr-2 size-4" /> Ubah Data
            </Link>
          </Button>
        </div>
      </div>

      <Kartu judul="Status Kendaraan">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-56 space-y-2">
            <label htmlFor="status-baru" className="block text-base text-foreground">
              Ubah status menjadi
            </label>
            <Select value={statusBaru} onValueChange={(v) => setStatusBaru(v as StatusKendaraan)}>
              <SelectTrigger id="status-baru" className="h-11 text-base">
                <SelectValue placeholder="Pilih status baru" />
              </SelectTrigger>
              <SelectContent>
                {OPSI_STATUS.filter((o) => o.value !== k.status).map((o) => (
                  <SelectItem key={o.value} value={o.value} className="text-base">
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            size="lg"
            className="text-base"
            disabled={!statusBaru || ubahStatus.isPending}
            onClick={() => statusBaru && ubahStatus.mutate(statusBaru)}
          >
            {ubahStatus.isPending ? "Menyimpan…" : "Simpan Status"}
          </Button>
          {k.status !== "tidak_aktif" && (
            <Button
              size="lg"
              variant="outline"
              className="text-base text-destructive"
              disabled={nonaktifkan.isPending}
              onClick={() => {
                if (
                  window.confirm(
                    "Nonaktifkan kendaraan ini? Kendaraan disembunyikan dari daftar aktif dan situs publik, tetapi seluruh riwayat tetap tersimpan.",
                  )
                ) {
                  nonaktifkan.mutate();
                }
              }}
            >
              <PowerOff className="mr-2 size-4" /> Nonaktifkan Kendaraan
            </Button>
          )}
        </div>
        {kontrakBerjalan && (
          <p className="mt-3 text-base text-muted-foreground">
            Kendaraan sedang terikat kontrak {kontrakBerjalan.contract_number} sampai{" "}
            {formatTanggalSingkat(kontrakBerjalan.end_date)}. Status perawatan/nonaktif tidak dapat
            diterapkan sebelum kontrak selesai.
          </p>
        )}
      </Kartu>

      <Kartu judul="Informasi Umum">
        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
          {info.map(([label, nilai]) => (
            <div key={label}>
              <dt className="text-base text-muted-foreground">{label}</dt>
              <dd className="text-base font-semibold text-foreground">{nilai}</dd>
            </div>
          ))}
        </dl>
        {k.notes && (
          <div className="mt-4 rounded-md border border-border bg-secondary p-4">
            <p className="text-base font-semibold text-foreground">Catatan</p>
            <p className="mt-1 whitespace-pre-line text-base text-muted-foreground">{k.notes}</p>
          </div>
        )}
      </Kartu>

      <Kartu judul="Foto Kendaraan">
        <PengelolaFoto vehicleId={id} foto={foto} onBerubah={segarkan} />
      </Kartu>

      <Kartu judul="Dokumen Kendaraan">
        <PengelolaDokumen vehicleId={id} dokumen={dokumen} onBerubah={segarkan} />
      </Kartu>

      <Kartu judul="Kontrak Berjalan">
        {kontrakBerjalan ? (
          <p className="text-base text-foreground">
            <span className="font-semibold">{kontrakBerjalan.contract_number}</span> —{" "}
            {kontrakBerjalan.renters?.full_name ?? "Penyewa"} (
            {formatTanggalSingkat(kontrakBerjalan.start_date)} s.d.{" "}
            {formatTanggalSingkat(kontrakBerjalan.end_date)})
          </p>
        ) : (
          <p className="text-base text-muted-foreground">Tidak ada kontrak berjalan.</p>
        )}
      </Kartu>

      <Kartu judul="Riwayat Sewa">
        {kontrak.length === 0 ? (
          <p className="text-base text-muted-foreground">Belum ada riwayat sewa.</p>
        ) : (
          <ul className="space-y-3">
            {kontrak.map((c) => (
              <li
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-4"
              >
                <div>
                  <p className="text-base font-semibold text-foreground">{c.contract_number}</p>
                  <p className="text-base text-muted-foreground">
                    {c.renters?.full_name ?? "Penyewa"} · {formatTanggalSingkat(c.start_date)} –{" "}
                    {formatTanggalSingkat(c.end_date)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-base font-semibold text-foreground">
                    {formatRupiah(c.total_amount)}
                  </span>
                  <StatusBadge map={statusKontrak} value={c.status} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Kartu>

      <Kartu judul="Riwayat Perawatan">
        {perawatan.length === 0 ? (
          <p className="text-base text-muted-foreground">Belum ada catatan perawatan.</p>
        ) : (
          <ul className="space-y-3">
            {perawatan.map((m) => (
              <li
                key={m.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-4"
              >
                <div>
                  <p className="text-base font-semibold text-foreground">{m.maintenance_type}</p>
                  <p className="text-base text-muted-foreground">
                    {formatTanggalSingkat(m.completed_date ?? m.scheduled_date)}
                    {m.workshop_name ? ` · ${m.workshop_name}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-base font-semibold text-foreground">
                    {formatRupiah(m.cost)}
                  </span>
                  <StatusBadge map={statusPerawatan} value={m.status} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Kartu>

      <Kartu judul="Riwayat Perubahan Status">
        {riwayatStatus.length === 0 ? (
          <p className="text-base text-muted-foreground">Belum ada perubahan status.</p>
        ) : (
          <ol className="space-y-3 border-l-2 border-border pl-5">
            {riwayatStatus.map((r) => (
              <li key={r.id} className="relative">
                <span className="absolute -left-[27px] top-2 size-3 rounded-full bg-primary" />
                <p className="text-base font-semibold text-foreground">
                  {r.previous_status ? `${r.previous_status} → ` : ""}
                  {r.new_status}
                </p>
                <p className="text-base text-muted-foreground">{formatWaktu(r.changed_at)}</p>
              </li>
            ))}
          </ol>
        )}
      </Kartu>
    </div>
  );
}

function Kartu({ judul, children }: { judul: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-card p-5">
      <h3 className="font-heading text-xl font-bold text-foreground">{judul}</h3>
      <div className="mt-4">{children}</div>
    </section>
  );
}