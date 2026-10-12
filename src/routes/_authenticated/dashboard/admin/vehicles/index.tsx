import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { CarFront, Plus, Search } from "lucide-react";

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
import { formatAngka, formatRupiah, formatTanggalSingkat } from "@/lib/format";
import { statusKendaraan } from "@/lib/labels";
import {
  ambilDaftarKendaraan,
  ambilRingkasanArmada,
  filterAwal,
  OPSI_BAHAN_BAKAR,
  OPSI_KATEGORI,
  OPSI_STATUS,
  OPSI_TRANSMISI,
  type FilterKendaraan,
  type UrutanDaftar,
} from "@/lib/vehicles";

export const Route = createFileRoute("/_authenticated/dashboard/admin/vehicles/")({
  head: () => ({
    meta: [
      { title: "Daftar Kendaraan | Okta Car Rent" },
      {
        name: "description",
        content:
          "Kelola seluruh armada Okta Car Rent: cari, saring, urutkan, dan pantau status setiap kendaraan.",
      },
      { property: "og:title", content: "Daftar Kendaraan | Okta Car Rent" },
      {
        property: "og:description",
        content: "Manajemen armada rental mobil: status, tarif, kilometer, dan perawatan terakhir.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RoleGate allow={["owner", "admin"]}>
      <DashboardShell peran="Manajemen Armada" judul="Daftar Kendaraan">
        <HalamanDaftar />
      </DashboardShell>
    </RoleGate>
  ),
});

const OPSI_URUTAN: { value: UrutanDaftar; label: string }[] = [
  { value: "terbaru", label: "Terbaru ditambahkan" },
  { value: "terlama", label: "Terlama ditambahkan" },
  { value: "tarif", label: "Tarif harian terendah" },
  { value: "tahun", label: "Tahun terbaru" },
  { value: "kilometer", label: "Kilometer tertinggi" },
];

function HalamanDaftar() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<FilterKendaraan>(filterAwal);
  const [kataCari, setKataCari] = useState("");

  const ringkasan = useQuery({
    queryKey: ["armada-ringkasan"],
    queryFn: ambilRingkasanArmada,
    staleTime: 30_000,
  });

  const daftar = useQuery({
    queryKey: ["armada-daftar", filter],
    queryFn: () => ambilDaftarKendaraan(filter),
    placeholderData: keepPreviousData,
  });

  const totalHalaman = useMemo(
    () => Math.max(1, Math.ceil((daftar.data?.total ?? 0) / filter.perHalaman)),
    [daftar.data?.total, filter.perHalaman],
  );

  function ubah(sebagian: Partial<FilterKendaraan>) {
    setFilter((p) => ({ ...p, ...sebagian, halaman: sebagian.halaman ?? 1 }));
  }

  const adaFilterAktif =
    filter.cari !== "" ||
    filter.status !== "semua" ||
    filter.kategori !== "semua" ||
    filter.transmisi !== "semua" ||
    filter.bahanBakar !== "semua" ||
    filter.tahun !== "semua";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-base text-muted-foreground">
          Total {formatAngka(ringkasan.data?.total ?? 0)} kendaraan terdaftar.
        </p>
        <Button asChild size="lg" className="text-base">
          <Link to="/dashboard/admin/vehicles/new">
            <Plus className="mr-2 size-4" /> Tambah Kendaraan
          </Link>
        </Button>
      </div>

      <section aria-label="Ringkasan armada" className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {[
          { label: "Total Kendaraan", nilai: ringkasan.data?.total },
          { label: "Tersedia", nilai: ringkasan.data?.tersedia },
          { label: "Sedang Disewa", nilai: ringkasan.data?.disewa },
          { label: "Dalam Perawatan", nilai: ringkasan.data?.perawatan },
          { label: "Tidak Aktif", nilai: ringkasan.data?.tidakAktif },
        ].map((k) => (
          <div key={k.label} className="rounded-lg border border-border bg-card p-4">
            <p className="text-base text-muted-foreground">{k.label}</p>
            {ringkasan.isLoading ? (
              <Skeleton className="mt-2 h-8 w-12" />
            ) : (
              <p className="mt-1 font-heading text-2xl font-bold text-foreground">
                {formatAngka(k.nilai ?? 0)}
              </p>
            )}
          </div>
        ))}
      </section>

      <section className="rounded-lg border border-border bg-card p-4">
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            ubah({ cari: kataCari });
          }}
        >
          <div className="min-w-60 flex-1 space-y-2">
            <Label htmlFor="cari" className="text-base">
              Cari (nomor polisi, merek, model, tahun)
            </Label>
            <Input
              id="cari"
              value={kataCari}
              onChange={(e) => setKataCari(e.target.value)}
              placeholder="Contoh: B 1234 XYZ atau Avanza"
              className="h-11 text-base"
            />
          </div>
          <Button type="submit" size="lg" className="text-base">
            <Search className="mr-2 size-4" /> Cari
          </Button>
          {adaFilterAktif && (
            <Button
              type="button"
              size="lg"
              variant="outline"
              className="text-base"
              onClick={() => {
                setKataCari("");
                setFilter(filterAwal);
              }}
            >
              Atur ulang
            </Button>
          )}
        </form>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <Saring
            id="f-status"
            label="Status"
            nilai={filter.status}
            onUbah={(v) => ubah({ status: v })}
            opsi={OPSI_STATUS.map((o) => ({ value: o.value, label: o.label }))}
          />
          <Saring
            id="f-kategori"
            label="Kategori"
            nilai={filter.kategori}
            onUbah={(v) => ubah({ kategori: v })}
            opsi={OPSI_KATEGORI.map((o) => ({ value: o, label: o }))}
          />
          <Saring
            id="f-transmisi"
            label="Transmisi"
            nilai={filter.transmisi}
            onUbah={(v) => ubah({ transmisi: v })}
            opsi={OPSI_TRANSMISI.map((o) => ({ value: o, label: o }))}
          />
          <Saring
            id="f-bahan-bakar"
            label="Bahan Bakar"
            nilai={filter.bahanBakar}
            onUbah={(v) => ubah({ bahanBakar: v })}
            opsi={OPSI_BAHAN_BAKAR.map((o) => ({ value: o, label: o }))}
          />
          <Saring
            id="f-tahun"
            label="Tahun"
            nilai={filter.tahun}
            onUbah={(v) => ubah({ tahun: v })}
            opsi={(ringkasan.data?.tahunTersedia ?? []).map((t) => ({
              value: String(t),
              label: String(t),
            }))}
          />
          <div className="space-y-2">
            <Label htmlFor="f-urutan" className="text-base">
              Urutkan
            </Label>
            <Select
              value={filter.urutan}
              onValueChange={(v) => ubah({ urutan: v as UrutanDaftar })}
            >
              <SelectTrigger id="f-urutan" className="h-11 text-base">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OPSI_URUTAN.map((o) => (
                  <SelectItem key={o.value} value={o.value} className="text-base">
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <label className="mt-4 flex items-center gap-2 text-base text-foreground">
          <input
            type="checkbox"
            className="size-5 accent-[hsl(var(--primary))]"
            checked={filter.sertakanNonaktif}
            onChange={(e) => ubah({ sertakanNonaktif: e.target.checked })}
          />
          Tampilkan juga kendaraan tidak aktif
        </label>
      </section>

      {daftar.isError ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-6">
          <p className="text-base font-semibold text-destructive">Gagal memuat data kendaraan.</p>
          <p className="mt-1 text-base text-muted-foreground">
            {(daftar.error as Error).message}
          </p>
          <Button size="lg" className="mt-4 text-base" onClick={() => daftar.refetch()}>
            Coba lagi
          </Button>
        </div>
      ) : daftar.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : (daftar.data?.baris.length ?? 0) === 0 ? (
        <div className="rounded-lg border border-border bg-card p-10 text-center">
          <CarFront className="mx-auto size-12 text-muted-foreground" aria-hidden />
          <p className="mt-4 font-heading text-xl font-bold text-foreground">
            {adaFilterAktif ? "Tidak ada kendaraan yang cocok." : "Belum ada kendaraan."}
          </p>
          <p className="mt-1 text-base text-muted-foreground">
            {adaFilterAktif
              ? "Ubah kata kunci atau atur ulang saringan."
              : "Tambahkan kendaraan pertama untuk mulai mengelola armada."}
          </p>
          <Button asChild size="lg" className="mt-5 text-base">
            <Link to="/dashboard/admin/vehicles/new">
              <Plus className="mr-2 size-4" /> Tambah Kendaraan
            </Link>
          </Button>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-base">Foto</TableHead>
                  <TableHead className="text-base">Nomor Polisi</TableHead>
                  <TableHead className="text-base">Merek</TableHead>
                  <TableHead className="text-base">Model</TableHead>
                  <TableHead className="text-base">Tahun</TableHead>
                  <TableHead className="text-base">Transmisi</TableHead>
                  <TableHead className="text-base">Tarif Harian</TableHead>
                  <TableHead className="text-base">Status</TableHead>
                  <TableHead className="text-base">Kilometer</TableHead>
                  <TableHead className="text-base">Perawatan Terakhir</TableHead>
                  <TableHead className="text-base">Tindakan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {daftar.data!.baris.map((k) => (
                  <TableRow key={k.id}>
                    <TableCell>
                      {k.fotoUrl ? (
                        <img
                          src={k.fotoUrl}
                          alt={`${k.brand} ${k.model}`}
                          loading="lazy"
                          className="h-12 w-16 rounded-md object-cover"
                        />
                      ) : (
                        <div className="flex h-12 w-16 items-center justify-center rounded-md bg-muted">
                          <CarFront className="size-5 text-muted-foreground" aria-hidden />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-base font-semibold">{k.plate_number}</TableCell>
                    <TableCell className="text-base">{k.brand}</TableCell>
                    <TableCell className="text-base">
                      {k.model}
                      {k.variant ? ` ${k.variant}` : ""}
                    </TableCell>
                    <TableCell className="text-base">{k.year}</TableCell>
                    <TableCell className="text-base">{k.transmission}</TableCell>
                    <TableCell className="text-base">{formatRupiah(k.daily_rate)}</TableCell>
                    <TableCell>
                      <StatusBadge map={statusKendaraan} value={k.status} />
                    </TableCell>
                    <TableCell className="text-base">{formatAngka(k.current_odometer)} km</TableCell>
                    <TableCell className="text-base">
                      {formatTanggalSingkat(k.perawatanTerakhir)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button asChild size="sm" variant="outline" className="text-sm">
                          <Link to="/dashboard/admin/vehicles/$id" params={{ id: k.id }}>
                            Detail
                          </Link>
                        </Button>
                        <Button asChild size="sm" variant="outline" className="text-sm">
                          <Link to="/dashboard/admin/vehicles/$id/edit" params={{ id: k.id }}>
                            Ubah
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-base text-muted-foreground">
              Menampilkan {(filter.halaman - 1) * filter.perHalaman + 1}–
              {Math.min(filter.halaman * filter.perHalaman, daftar.data!.total)} dari{" "}
              {formatAngka(daftar.data!.total)} kendaraan
            </p>
            <div className="flex items-center gap-3">
              <Select
                value={String(filter.perHalaman)}
                onValueChange={(v) => ubah({ perHalaman: Number(v) })}
              >
                <SelectTrigger className="h-11 w-32 text-base" aria-label="Baris per halaman">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[10, 25, 50].map((n) => (
                    <SelectItem key={n} value={String(n)} className="text-base">
                      {n} / halaman
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="lg"
                variant="outline"
                className="text-base"
                disabled={filter.halaman <= 1}
                onClick={() => setFilter((p) => ({ ...p, halaman: p.halaman - 1 }))}
              >
                Sebelumnya
              </Button>
              <span className="text-base text-foreground">
                Halaman {filter.halaman} dari {totalHalaman}
              </span>
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
          </div>
        </>
      )}

      <Button
        variant="outline"
        size="lg"
        className="text-base"
        onClick={() => navigate({ to: "/dashboard" })}
      >
        ← Kembali ke dashboard
      </Button>
    </div>
  );
}

function Saring({
  id,
  label,
  nilai,
  opsi,
  onUbah,
}: {
  id: string;
  label: string;
  nilai: string;
  opsi: { value: string; label: string }[];
  onUbah: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-base">
        {label}
      </Label>
      <Select value={nilai} onValueChange={onUbah}>
        <SelectTrigger id={id} className="h-11 text-base">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="semua" className="text-base">
            Semua
          </SelectItem>
          {opsi.map((o) => (
            <SelectItem key={o.value} value={o.value} className="text-base">
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}