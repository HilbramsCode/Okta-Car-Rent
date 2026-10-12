import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Plus, Search, UserRound } from "lucide-react";

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
import { statusVerifikasi } from "@/lib/labels";
import {
  ambilDaftarPenyewa,
  filterPenyewaAwal,
  OPSI_VERIFIKASI,
  type FilterPenyewa,
  type UrutanPenyewa,
} from "@/lib/renters";

export const Route = createFileRoute("/_authenticated/dashboard/admin/renters/")({
  head: () => ({
    meta: [
      { title: "Daftar Penyewa | Okta Car Rent" },
      {
        name: "description",
        content:
          "Kelola data penyewa Okta Car Rent: cari, saring status verifikasi, pantau kontrak aktif dan tunggakan.",
      },
      { property: "og:title", content: "Daftar Penyewa | Okta Car Rent" },
      {
        property: "og:description",
        content: "Manajemen penyewa rental mobil: verifikasi dokumen, riwayat sewa, dan tunggakan.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RoleGate allow={["owner", "admin"]}>
      <DashboardShell peran="Manajemen Penyewa" judul="Daftar Penyewa">
        <HalamanDaftarPenyewa />
      </DashboardShell>
    </RoleGate>
  ),
});

const OPSI_URUTAN: { value: UrutanPenyewa; label: string }[] = [
  { value: "terbaru", label: "Terbaru didaftarkan" },
  { value: "terlama", label: "Terlama didaftarkan" },
  { value: "abjad", label: "Nama A–Z" },
  { value: "tunggakan", label: "Tunggakan terbesar" },
];

function HalamanDaftarPenyewa() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<FilterPenyewa>(filterPenyewaAwal);
  const [kataCari, setKataCari] = useState("");

  const daftar = useQuery({
    queryKey: ["penyewa-daftar", filter],
    queryFn: () => ambilDaftarPenyewa(filter),
    placeholderData: keepPreviousData,
  });

  const totalHalaman = useMemo(
    () => Math.max(1, Math.ceil((daftar.data?.total ?? 0) / filter.perHalaman)),
    [daftar.data?.total, filter.perHalaman],
  );

  function ubah(sebagian: Partial<FilterPenyewa>) {
    setFilter((p) => ({ ...p, ...sebagian, halaman: sebagian.halaman ?? 1 }));
  }

  const ringkasan = daftar.data?.ringkasan;
  const adaFilterAktif =
    filter.cari !== "" ||
    filter.verifikasi !== "semua" ||
    filter.kontrakAktif !== "semua" ||
    filter.tunggakan !== "semua" ||
    filter.kota !== "semua" ||
    filter.sertakanNonaktif;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-base text-muted-foreground">
          Total {formatAngka(ringkasan?.total ?? 0)} penyewa aktif terdaftar.
        </p>
        <Button asChild size="lg" className="text-base">
          <Link to="/dashboard/admin/renters/new">
            <Plus className="mr-2 size-4" /> Tambah Penyewa
          </Link>
        </Button>
      </div>

      <section aria-label="Ringkasan penyewa" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label: "Total Penyewa", nilai: ringkasan?.total },
          { label: "Terverifikasi", nilai: ringkasan?.terverifikasi },
          { label: "Belum Terverifikasi", nilai: ringkasan?.belumTerverifikasi },
          { label: "Punya Kontrak Aktif", nilai: ringkasan?.kontrakAktif },
          { label: "Punya Tunggakan", nilai: ringkasan?.denganTunggakan },
        ].map((k) => (
          <div key={k.label} className="rounded-lg border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">{k.label}</p>
            {daftar.isLoading ? (
              <Skeleton className="mt-2 h-7 w-16" />
            ) : (
              <p className="mt-1 font-heading text-2xl font-bold text-foreground">
                {formatAngka(k.nilai ?? 0)}
              </p>
            )}
          </div>
        ))}
      </section>

      <section aria-label="Pencarian dan saringan" className="rounded-lg border border-border bg-card p-5">
        <form
          className="flex flex-col gap-3 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            ubah({ cari: kataCari });
          }}
        >
          <div className="flex-1 space-y-2">
            <Label htmlFor="cari-penyewa" className="text-base">
              Cari penyewa
            </Label>
            <Input
              id="cari-penyewa"
              value={kataCari}
              onChange={(e) => setKataCari(e.target.value)}
              placeholder="Nama, nomor HP, KTP, SIM, atau email"
              className="h-11 text-base"
            />
          </div>
          <div className="flex items-end gap-2">
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
                  setFilter(filterPenyewaAwal);
                }}
              >
                Atur Ulang
              </Button>
            )}
          </div>
        </form>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Saring
            id="s-verifikasi"
            label="Status Verifikasi"
            nilai={filter.verifikasi}
            opsi={OPSI_VERIFIKASI}
            onUbah={(v) => ubah({ verifikasi: v })}
          />
          <Saring
            id="s-kontrak"
            label="Kontrak Aktif"
            nilai={filter.kontrakAktif}
            opsi={[
              { value: "ada", label: "Punya kontrak aktif" },
              { value: "tidak", label: "Tanpa kontrak aktif" },
            ]}
            onUbah={(v) => ubah({ kontrakAktif: v })}
          />
          <Saring
            id="s-tunggakan"
            label="Tunggakan"
            nilai={filter.tunggakan}
            opsi={[
              { value: "ada", label: "Ada tunggakan" },
              { value: "tidak", label: "Tanpa tunggakan" },
            ]}
            onUbah={(v) => ubah({ tunggakan: v })}
          />
          <Saring
            id="s-kota"
            label="Kota"
            nilai={filter.kota}
            opsi={(daftar.data?.kotaTersedia ?? []).map((k) => ({ value: k, label: k }))}
            onUbah={(v) => ubah({ kota: v })}
          />
          <div className="space-y-2">
            <Label htmlFor="s-urutan" className="text-base">
              Urutkan
            </Label>
            <Select
              value={filter.urutan}
              onValueChange={(v) => ubah({ urutan: v as UrutanPenyewa })}
            >
              <SelectTrigger id="s-urutan" className="h-11 text-base">
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
            className="size-4"
            checked={filter.sertakanNonaktif}
            onChange={(e) => ubah({ sertakanNonaktif: e.target.checked })}
          />
          Tampilkan juga penyewa nonaktif
        </label>
      </section>

      {daftar.isError ? (
        <p role="alert" className="rounded-lg border border-destructive bg-card p-5 text-base text-destructive">
          {(daftar.error as Error).message}
        </p>
      ) : daftar.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : daftar.data!.baris.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-10 text-center">
          <UserRound className="mx-auto size-8 text-muted-foreground" aria-hidden />
          <p className="mt-3 font-heading text-xl font-bold text-foreground">
            Belum ada penyewa yang cocok
          </p>
          <p className="mt-1 text-base text-muted-foreground">
            {adaFilterAktif
              ? "Ubah kata kunci atau atur ulang saringan."
              : "Tambahkan penyewa pertama untuk mulai mengelola data pelanggan."}
          </p>
          <Button asChild size="lg" className="mt-5 text-base">
            <Link to="/dashboard/admin/renters/new">
              <Plus className="mr-2 size-4" /> Tambah Penyewa
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
                  <TableHead className="text-base">Nama</TableHead>
                  <TableHead className="text-base">Nomor HP</TableHead>
                  <TableHead className="text-base">Kota</TableHead>
                  <TableHead className="text-base">Verifikasi</TableHead>
                  <TableHead className="text-base">Kontrak Aktif</TableHead>
                  <TableHead className="text-base">Tunggakan</TableHead>
                  <TableHead className="text-base">Terdaftar</TableHead>
                  <TableHead className="text-base">Tindakan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {daftar.data!.baris.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      {p.fotoUrl ? (
                        <img
                          src={p.fotoUrl}
                          alt={p.full_name}
                          loading="lazy"
                          className="size-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                          <UserRound className="size-5 text-muted-foreground" aria-hidden />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-base font-semibold">
                      {p.full_name}
                      {!p.is_active && (
                        <span className="ml-2 text-sm font-normal text-muted-foreground">
                          (nonaktif)
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-base">{p.phone}</TableCell>
                    <TableCell className="text-base">{p.city ?? "-"}</TableCell>
                    <TableCell>
                      <StatusBadge map={statusVerifikasi} value={p.verification_status} />
                    </TableCell>
                    <TableCell className="text-base">
                      {p.kontrakAktif ? p.kontrakAktif.contract_number : "-"}
                    </TableCell>
                    <TableCell className="text-base">
                      {p.tunggakanNominal > 0 ? (
                        <span className="font-semibold text-destructive">
                          {formatRupiah(p.tunggakanNominal)}
                        </span>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="text-base">{formatTanggalSingkat(p.created_at)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button asChild size="sm" variant="outline" className="text-sm">
                          <Link to="/dashboard/admin/renters/$id" params={{ id: p.id }}>
                            Detail
                          </Link>
                        </Button>
                        <Button asChild size="sm" variant="outline" className="text-sm">
                          <Link to="/dashboard/admin/renters/$id/edit" params={{ id: p.id }}>
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
              {formatAngka(daftar.data!.total)} penyewa
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