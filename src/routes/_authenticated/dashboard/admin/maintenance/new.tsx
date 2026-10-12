import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { RoleGate } from "@/components/dashboard/RoleGate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ambilDaftarKendaraan, filterAwal } from "@/lib/vehicles";
import {
  ambilDaftarBengkel,
  buatPerawatan,
  OPSI_JENIS_KOREKTIF,
  OPSI_JENIS_PREVENTIF,
  OPSI_KATEGORI_PERAWATAN,
} from "@/lib/maintenance";

type Pencarian = { vehicle?: string };

export const Route = createFileRoute("/_authenticated/dashboard/admin/maintenance/new")({
  validateSearch: (search: Record<string, unknown>): Pencarian => ({
    vehicle: typeof search.vehicle === "string" ? search.vehicle : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Jadwalkan Perawatan | Okta Car Rent" },
      {
        name: "description",
        content:
          "Buat jadwal servis berkala atau perbaikan kendaraan rental lengkap dengan bengkel dan estimasi kilometer.",
      },
      { property: "og:title", content: "Jadwalkan Perawatan | Okta Car Rent" },
      {
        property: "og:description",
        content: "Formulir penjadwalan perawatan armada Okta Car Rent.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RoleGate allow={["owner", "admin"]}>
      <DashboardShell peran="Perawatan Armada" judul="Jadwalkan Perawatan">
        <FormPerawatan />
      </DashboardShell>
    </RoleGate>
  ),
});

function FormPerawatan() {
  const navigate = useNavigate();
  const { vehicle } = Route.useSearch();

  const [vehicleId, setVehicleId] = useState(vehicle ?? "");
  const [kategori, setKategori] = useState("preventif");
  const [jenis, setJenis] = useState("");
  const [tanggal, setTanggal] = useState(new Date().toISOString().slice(0, 10));
  const [bengkelId, setBengkelId] = useState("");
  const [odometer, setOdometer] = useState("");
  const [deskripsi, setDeskripsi] = useState("");
  const [catatan, setCatatan] = useState("");

  const kendaraan = useQuery({
    queryKey: ["perawatan-pilihan-kendaraan"],
    queryFn: () => ambilDaftarKendaraan({ ...filterAwal, perHalaman: 200 }),
  });
  const bengkel = useQuery({ queryKey: ["bengkel-aktif"], queryFn: () => ambilDaftarBengkel() });

  const opsiJenis = kategori === "preventif" ? OPSI_JENIS_PREVENTIF : OPSI_JENIS_KOREKTIF;

  const simpan = useMutation({
    mutationFn: () =>
      buatPerawatan({
        vehicle_id: vehicleId,
        category: kategori,
        maintenance_type: jenis,
        subtype: jenis,
        scheduled_date: tanggal,
        workshop_id: bengkelId || null,
        description: deskripsi.trim() || null,
        notes: catatan.trim() || null,
        odometer: odometer ? Number(odometer) : null,
      }),
    onSuccess: (id) => {
      toast.success("Perawatan berhasil dijadwalkan.");
      navigate({ to: "/dashboard/admin/maintenance/$id", params: { id } });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Gagal menyimpan perawatan."),
  });

  return (
    <form
      className="max-w-2xl space-y-5 rounded-lg border border-border bg-card p-5"
      onSubmit={(e) => {
        e.preventDefault();
        simpan.mutate();
      }}
    >
      <div className="space-y-2">
        <Label className="text-base">Kendaraan</Label>
        <Select value={vehicleId} onValueChange={setVehicleId}>
          <SelectTrigger className="h-11 text-base">
            <SelectValue placeholder="Pilih kendaraan" />
          </SelectTrigger>
          <SelectContent>
            {(kendaraan.data?.baris ?? []).map((k) => (
              <SelectItem key={k.id} value={k.id} className="text-base">
                {k.brand} {k.model} • {k.plate_number}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-base">Kategori Perawatan</Label>
        <Select
          value={kategori}
          onValueChange={(v) => {
            setKategori(v);
            setJenis("");
          }}
        >
          <SelectTrigger className="h-11 text-base">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {OPSI_KATEGORI_PERAWATAN.map((o) => (
              <SelectItem key={o.value} value={o.value} className="text-base">
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-base">Jenis Pekerjaan</Label>
        <Select value={jenis} onValueChange={setJenis}>
          <SelectTrigger className="h-11 text-base">
            <SelectValue placeholder="Pilih jenis pekerjaan" />
          </SelectTrigger>
          <SelectContent>
            {opsiJenis.map((o) => (
              <SelectItem key={o.value} value={o.value} className="text-base">
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="tanggal-rencana" className="text-base">
            Tanggal Rencana
          </Label>
          <Input
            id="tanggal-rencana"
            type="date"
            className="h-11 text-base"
            value={tanggal}
            onChange={(e) => setTanggal(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="odometer-rencana" className="text-base">
            Kilometer Saat Ini (opsional)
          </Label>
          <Input
            id="odometer-rencana"
            type="number"
            min={0}
            className="h-11 text-base"
            value={odometer}
            onChange={(e) => setOdometer(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-base">Bengkel</Label>
        <Select value={bengkelId} onValueChange={setBengkelId}>
          <SelectTrigger className="h-11 text-base">
            <SelectValue placeholder="Pilih bengkel (opsional)" />
          </SelectTrigger>
          <SelectContent>
            {(bengkel.data ?? []).map((b) => (
              <SelectItem key={b.id} value={b.id} className="text-base">
                {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">
          Belum ada bengkel?{" "}
          <Link
            to="/dashboard/admin/maintenance/workshops"
            className="font-medium text-primary underline"
          >
            Tambah data bengkel
          </Link>
          .
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="deskripsi-perawatan" className="text-base">
          Keluhan / Pekerjaan
        </Label>
        <Textarea
          id="deskripsi-perawatan"
          className="min-h-24 text-base"
          value={deskripsi}
          onChange={(e) => setDeskripsi(e.target.value)}
          placeholder="Contoh: bunyi kasar pada kaki-kaki depan"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="catatan-perawatan" className="text-base">
          Catatan Internal
        </Label>
        <Textarea
          id="catatan-perawatan"
          className="min-h-20 text-base"
          value={catatan}
          onChange={(e) => setCatatan(e.target.value)}
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <Button type="submit" size="lg" className="text-base" disabled={simpan.isPending}>
          {simpan.isPending ? "Menyimpan…" : "Simpan Jadwal"}
        </Button>
        <Button asChild size="lg" variant="outline" className="text-base">
          <Link to="/dashboard/admin/maintenance">Batal</Link>
        </Button>
      </div>
    </form>
  );
}