import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { RoleGate } from "@/components/dashboard/RoleGate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { GalatMuat } from "@/components/bi/StatusMuat";
import { formatAngka, formatRupiah } from "@/lib/format";
import {
  ambilDaftarBengkel,
  ambilPerformaBengkel,
  simpanBengkel,
  ubahAktifBengkel,
  type Bengkel,
} from "@/lib/maintenance";

export const Route = createFileRoute("/_authenticated/dashboard/admin/maintenance/workshops")({
  head: () => ({
    meta: [
      { title: "Data Bengkel | Okta Car Rent" },
      {
        name: "description",
        content:
          "Kelola daftar bengkel mitra Okta Car Rent beserta spesialisasi, kontak, dan performa biaya perbaikan.",
      },
      { property: "og:title", content: "Data Bengkel | Okta Car Rent" },
      {
        property: "og:description",
        content: "Daftar bengkel mitra dan rekap biaya perawatan per bengkel.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RoleGate allow={["owner", "admin"]}>
      <DashboardShell peran="Perawatan Armada" judul="Data Bengkel">
        <HalamanBengkel />
      </DashboardShell>
    </RoleGate>
  ),
});

function HalamanBengkel() {
  const qc = useQueryClient();
  const [edit, setEdit] = useState<Bengkel | null>(null);
  const [nama, setNama] = useState("");
  const [telepon, setTelepon] = useState("");
  const [alamat, setAlamat] = useState("");
  const [spesialisasi, setSpesialisasi] = useState("");
  const [catatan, setCatatan] = useState("");

  const daftar = useQuery({
    queryKey: ["bengkel-semua"],
    queryFn: () => ambilDaftarBengkel(true),
  });
  const performa = useQuery({ queryKey: ["bengkel-performa"], queryFn: ambilPerformaBengkel });

  function kosongkan() {
    setEdit(null);
    setNama("");
    setTelepon("");
    setAlamat("");
    setSpesialisasi("");
    setCatatan("");
  }

  function muat(b: Bengkel) {
    setEdit(b);
    setNama(b.name);
    setTelepon(b.phone ?? "");
    setAlamat(b.address ?? "");
    setSpesialisasi(b.specialization ?? "");
    setCatatan(b.notes ?? "");
  }

  const simpan = useMutation({
    mutationFn: () =>
      simpanBengkel(edit?.id ?? null, {
        name: nama,
        phone: telepon.trim() || null,
        address: alamat.trim() || null,
        specialization: spesialisasi.trim() || null,
        notes: catatan.trim() || null,
      }),
    onSuccess: () => {
      toast.success(edit ? "Data bengkel diperbarui." : "Bengkel baru ditambahkan.");
      kosongkan();
      void qc.invalidateQueries({ queryKey: ["bengkel-semua"] });
      void qc.invalidateQueries({ queryKey: ["bengkel-aktif"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Gagal menyimpan bengkel."),
  });

  const ubahAktif = useMutation({
    mutationFn: (v: { id: string; aktif: boolean }) => ubahAktifBengkel(v.id, v.aktif),
    onSuccess: () => {
      toast.success("Status bengkel diperbarui.");
      void qc.invalidateQueries({ queryKey: ["bengkel-semua"] });
      void qc.invalidateQueries({ queryKey: ["bengkel-aktif"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Gagal mengubah status."),
  });

  return (
    <div className="space-y-6">
      <Button asChild size="lg" variant="outline" className="text-base">
        <Link to="/dashboard/admin/maintenance">Kembali ke Perawatan</Link>
      </Button>

      <form
        className="max-w-2xl space-y-4 rounded-lg border border-border bg-card p-5"
        onSubmit={(e) => {
          e.preventDefault();
          simpan.mutate();
        }}
      >
        <h2 className="font-heading text-xl font-bold text-foreground">
          {edit ? `Ubah Bengkel: ${edit.name}` : "Tambah Bengkel"}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="nama-bengkel" className="text-base">
              Nama Bengkel
            </Label>
            <Input
              id="nama-bengkel"
              className="h-11 text-base"
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="telepon-bengkel" className="text-base">
              Telepon
            </Label>
            <Input
              id="telepon-bengkel"
              className="h-11 text-base"
              value={telepon}
              onChange={(e) => setTelepon(e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="alamat-bengkel" className="text-base">
            Alamat
          </Label>
          <Input
            id="alamat-bengkel"
            className="h-11 text-base"
            value={alamat}
            onChange={(e) => setAlamat(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="spesialisasi-bengkel" className="text-base">
            Spesialisasi
          </Label>
          <Input
            id="spesialisasi-bengkel"
            className="h-11 text-base"
            placeholder="Contoh: mesin, bodi & cat, kaki-kaki"
            value={spesialisasi}
            onChange={(e) => setSpesialisasi(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="catatan-bengkel" className="text-base">
            Catatan
          </Label>
          <Textarea
            id="catatan-bengkel"
            className="min-h-20 text-base"
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-3">
          <Button type="submit" size="lg" className="text-base" disabled={simpan.isPending}>
            {simpan.isPending ? "Menyimpan…" : "Simpan Bengkel"}
          </Button>
          {edit && (
            <Button
              type="button"
              size="lg"
              variant="outline"
              className="text-base"
              onClick={kosongkan}
            >
              Batal Ubah
            </Button>
          )}
        </div>
      </form>

      <section className="space-y-3">
        <h2 className="font-heading text-xl font-bold text-foreground">Daftar Bengkel</h2>
        {daftar.isPending ? (
          <Skeleton className="h-40 w-full rounded-lg" />
        ) : daftar.isError ? (
          <GalatMuat pesan="Daftar bengkel belum dapat dimuat." />
        ) : (daftar.data ?? []).length === 0 ? (
          <p className="rounded-md border border-border bg-card p-4 text-base text-muted-foreground">
            Belum ada bengkel terdaftar.
          </p>
        ) : (
          <ul className="space-y-3">
            {(daftar.data ?? []).map((b) => (
              <li key={b.id} className="rounded-lg border border-border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-foreground">{b.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {b.specialization ?? "Umum"} • {b.phone ?? "Tanpa telepon"}
                    </p>
                    {b.address && <p className="text-sm text-muted-foreground">{b.address}</p>}
                  </div>
                  <span className="text-sm font-semibold text-muted-foreground">
                    {b.is_active ? "Aktif" : "Nonaktif"}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-sm"
                    onClick={() => muat(b)}
                  >
                    Ubah
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-sm"
                    disabled={ubahAktif.isPending}
                    onClick={() => ubahAktif.mutate({ id: b.id, aktif: !b.is_active })}
                  >
                    {b.is_active ? "Nonaktifkan" : "Aktifkan"}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-xl font-bold text-foreground">Performa Bengkel</h2>
        {performa.isPending ? (
          <Skeleton className="h-32 w-full rounded-lg" />
        ) : performa.isError ? (
          <GalatMuat pesan="Data performa bengkel belum dapat dimuat." />
        ) : (performa.data ?? []).length === 0 ? (
          <p className="rounded-md border border-border bg-card p-4 text-base text-muted-foreground">
            Belum ada data perawatan selesai untuk dinilai.
          </p>
        ) : (
          <ul className="space-y-3">
            {(performa.data ?? []).map((p) => (
              <li key={p.workshop_id} className="rounded-lg border border-border bg-card p-4">
                <p className="text-base font-semibold text-foreground">{p.name}</p>
                <div className="mt-2 grid gap-2 text-base sm:grid-cols-4">
                  <p>Kunjungan: {formatAngka(Number(p.kunjungan))}</p>
                  <p>Total biaya: {formatRupiah(Number(p.total_biaya))}</p>
                  <p>Rata-rata: {formatRupiah(Number(p.rata_biaya))}</p>
                  <p>Durasi: {Number(p.rata_hari).toFixed(1)} hari</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}