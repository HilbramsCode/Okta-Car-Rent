import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { RoleGate } from "@/components/dashboard/RoleGate";
import { GrafikBatang } from "@/components/bi/GrafikBatang";
import { KartuKPI } from "@/components/bi/KartuKPI";
import { NavAnalitik } from "@/components/bi/NavAnalitik";
import { PemilihPeriode } from "@/components/bi/PemilihPeriode";
import { TabelAngka } from "@/components/bi/TabelAngka";
import { TabelKinerjaBengkel } from "@/components/bi/TabelKinerjaBengkel";
import { TabelKesiapan } from "@/components/bi/TabelKesiapan";
import { GalatMuat, MemuatKartu } from "@/components/bi/StatusMuat";
import { gunakanPeriode } from "@/components/bi/gunakanPeriode";
import { formatAngka, formatRupiah } from "@/lib/format";
import { OPSI_CACHE, ambilAnalitikPerawatan } from "@/lib/analytics";

export const Route = createFileRoute("/_authenticated/dashboard/analitik/perawatan")({
  head: () => ({
    meta: [
      { title: "Analitik Perawatan | Okta Car Rent" },
      {
        name: "description",
        content:
          "Biaya perawatan, jadwal servis jatuh tempo, lama perbaikan, dan kinerja bengkel mitra armada rental.",
      },
      { property: "og:title", content: "Analitik Perawatan | Okta Car Rent" },
      {
        property: "og:description",
        content: "Kendalikan biaya perawatan armada dan pantau kinerja bengkel mitra.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Halaman,
});

const NAMA_BULAN = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];

function labelBulan(b: string) {
  const [tahun, bln] = b.split("-");
  const i = Number(bln) - 1;
  return i >= 0 && i < 12 ? `${NAMA_BULAN[i]} ${tahun.slice(2)}` : b;
}

function Isi() {
  const p = gunakanPeriode();
  const q = useQuery({
    queryKey: ["bi-perawatan", p.periode.dari, p.periode.sampai],
    queryFn: () => ambilAnalitikPerawatan(p.periode),
    ...OPSI_CACHE,
  });

  return (
    <div className="space-y-6">
      <NavAnalitik />
      <PemilihPeriode
        kunci={p.kunci}
        dari={p.dari}
        sampai={p.sampai}
        onKunci={p.setKunci}
        onDari={p.setDari}
        onSampai={p.setSampai}
        onMuatUlang={() => void q.refetch()}
        diperbaruiPada={q.dataUpdatedAt ? new Date(q.dataUpdatedAt) : null}
      />

      {q.isPending ? (
        <MemuatKartu jumlah={5} />
      ) : q.error || !q.data ? (
        <GalatMuat pesan={q.error instanceof Error ? q.error.message : undefined} />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <KartuKPI
              judul="Total Biaya Perawatan"
              nilai={formatRupiah(q.data.total_biaya)}
              catatan={p.periode.label}
            />
            <KartuKPI
              judul="Rata-rata Lama Perbaikan"
              nilai={`${q.data.rata_hari_perbaikan ?? 0} hari`}
              catatan="Dari mulai dikerjakan sampai selesai"
            />
            <KartuKPI
              judul="Servis Terlambat Jadwal"
              nilai={formatAngka(q.data.terlambat_jadwal)}
              catatan="Perawatan belum dikerjakan melewati tanggal"
              aksen={q.data.terlambat_jadwal > 0 ? "bahaya" : undefined}
            />
            <KartuKPI
              judul="Ganti Oli Segera"
              nilai={formatAngka(q.data.oli_segera)}
              catatan="Kendaraan mendekati / melewati interval oli"
              aksen={q.data.oli_segera > 0 ? "peringatan" : undefined}
            />
            <KartuKPI
              judul="Ganti Ban Segera"
              nilai={formatAngka(q.data.ban_segera)}
              catatan="Kendaraan mendekati / melewati interval ban"
              aksen={q.data.ban_segera > 0 ? "peringatan" : undefined}
            />
          </div>

          <GrafikBatang
            judul="Biaya Perawatan per Bulan"
            data={(q.data.per_bulan ?? []).map((b) => ({
              label: labelBulan(b.bulan),
              nilai: Number(b.total ?? 0),
            }))}
          />

          <TabelAngka
            judul="Biaya per Kategori Pekerjaan"
            kolomLabel="Kategori"
            kolomNilai="Biaya"
            baris={(q.data.per_kategori ?? []).map((k) => ({
              label: k.kategori,
              nilai: k.total,
              catatan: `${formatAngka(k.jumlah)} pekerjaan`,
            }))}
          />

          <TabelKinerjaBengkel baris={q.data.bengkel ?? []} />

          <TabelKesiapan judul="Jadwal Servis Jatuh Tempo" baris={q.data.jatuh_tempo ?? []} />
        </div>
      )}
    </div>
  );
}

function Halaman() {
  return (
    <RoleGate allow="owner">
      <DashboardShell peran="Pemilik" judul="Analitik Perawatan">
        <Isi />
      </DashboardShell>
    </RoleGate>
  );
}
