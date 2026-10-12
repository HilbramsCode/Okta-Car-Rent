import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { KartuArmada } from "@/components/site/KartuArmada";
import { PageHeader, PublicShell } from "@/components/site/PublicShell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { daftarArmadaPublik } from "@/lib/public.functions";

const armadaQuery = queryOptions({
  queryKey: ["armada-publik"],
  queryFn: () => daftarArmadaPublik(),
});

export const Route = createFileRoute("/armada")({
  loader: ({ context }) => context.queryClient.ensureQueryData(armadaQuery),
  head: () => ({
    meta: [
      { title: "Armada & Tarif Sewa Mobil — Okta Car Rent" },
      {
        name: "description",
        content:
          "Daftar lengkap armada Okta Car Rent beserta tarif harian, mingguan, bulanan, dan besaran uang jaminan setiap unit.",
      },
      { property: "og:title", content: "Armada & Tarif Sewa Mobil — Okta Car Rent" },
      {
        property: "og:description",
        content: "Lihat pilihan mobil MPV, SUV, city car, dan premium beserta tarif sewanya.",
      },
    ],
  }),
  component: HalamanArmada,
  errorComponent: () => (
    <PublicShell>
      <PageHeader judul="Armada" deskripsi="Data armada gagal dimuat. Silakan muat ulang halaman." />
    </PublicShell>
  ),
});

function HalamanArmada() {
  const { data } = useSuspenseQuery(armadaQuery);
  const [cari, setCari] = useState("");
  const [bahanBakar, setBahanBakar] = useState("semua");
  const [transmisi, setTransmisi] = useState("semua");

  const bahanBakarTersedia = useMemo(
    () =>
      Array.from(
        new Set(
          data
            .map((m) => m.fuel_type)
            .filter(Boolean)
            .map((b) => b.trim()),
        ),
      ).sort(),
    [data],
  );

  const hasil = useMemo(
    () =>
      data.filter((m) => {
        const teks = `${m.brand} ${m.model} ${m.variant ?? ""}`.toLowerCase();
        if (cari && !teks.includes(cari.toLowerCase().trim())) return false;
        if (
          bahanBakar !== "semua" &&
          m.fuel_type?.trim().toLowerCase() !== bahanBakar.trim().toLowerCase()
        ) {
          return false;
        }
        if (transmisi !== "semua") {
          const tMobil = m.transmission?.trim().toLowerCase();
          if (transmisi === "manual" && tMobil !== "manual") {
            return false;
          }
          if (
            transmisi === "otomatis" &&
            tMobil !== "otomatis" &&
            tMobil !== "automatic"
          ) {
            return false;
          }
        }
        return true;
      }),
    [data, cari, bahanBakar, transmisi],
  );

  return (
    <PublicShell>
      <PageHeader
        judul="Armada & Tarif"
        deskripsi="Semua tarif sudah termasuk pajak. Uang jaminan dikembalikan setelah mobil dikembalikan dalam kondisi baik."
      />

      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="grid gap-4 rounded-lg border border-border bg-card p-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="cari" className="text-base">Cari mobil</Label>
            <Input
              id="cari"
              placeholder="Contoh: Avanza"
              value={cari}
              onChange={(e) => setCari(e.target.value)}
              className="h-11 text-base"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-base">Bahan Bakar</Label>
            <Select value={bahanBakar} onValueChange={setBahanBakar}>
              <SelectTrigger className="h-11 text-base"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="semua">Semua bahan bakar</SelectItem>
                {bahanBakarTersedia.map((b) => (
                  <SelectItem key={b} value={b} className="capitalize">
                    {b}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-base">Transmisi</Label>
            <Select value={transmisi} onValueChange={setTransmisi}>
              <SelectTrigger className="h-11 text-base"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="semua">Semua transmisi</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
                <SelectItem value="otomatis">Otomatis</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <p className="mt-4 text-base text-muted-foreground">
          Menampilkan {hasil.length} dari {data.length} unit.
        </p>

        {hasil.length === 0 ? (
          <p className="mt-8 rounded-lg border border-dashed border-border p-10 text-center text-lg text-muted-foreground">
            Tidak ada mobil yang cocok dengan pencarian Anda.
          </p>
        ) : (
          <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {hasil.map((mobil) => (
              <KartuArmada key={mobil.id} mobil={mobil} />
            ))}
          </div>
        )}
      </div>
    </PublicShell>
  );
}
