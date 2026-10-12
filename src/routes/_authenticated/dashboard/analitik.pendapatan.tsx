import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { RoleGate } from "@/components/dashboard/RoleGate";
import { GrafikBatang } from "@/components/bi/GrafikBatang";
import { KartuKPI } from "@/components/bi/KartuKPI";
import { NavAnalitik } from "@/components/bi/NavAnalitik";
import { PemilihPeriode } from "@/components/bi/PemilihPeriode";
import { TabelAngka } from "@/components/bi/TabelAngka";
import { GalatMuat, MemuatKartu } from "@/components/bi/StatusMuat";
import { gunakanPeriode } from "@/components/bi/gunakanPeriode";
import { formatAngka, formatRupiah } from "@/lib/format";
import { OPSI_CACHE, ambilAnalitikPendapatan } from "@/lib/analytics";

export const Route = createFileRoute("/_authenticated/dashboard/analitik/pendapatan")({
  head: () => ({
    meta: [
      { title: "Analitik Pendapatan | Okta Car Rent" },
      {
        name: "description",
        content:
          "Rincian pendapatan rental mobil per hari, minggu, bulan, kendaraan, kategori, tipe sewa, dan metode pembayaran.",
      },
      { property: "og:title", content: "Analitik Pendapatan | Okta Car Rent" },
      {
        property: "og:description",
        content: "Lihat sumber pendapatan rental mobil secara rinci pada periode pilihan Anda.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Halaman,
});

function Isi() {
  const p = gunakanPeriode();
  const q = useQuery({
    queryKey: ["bi-pendapatan", p.periode.dari, p.periode.sampai],
    queryFn: () => ambilAnalitikPendapatan(p.periode),
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
        <MemuatKartu jumlah={3} />
      ) : q.error || !q.data ? (
        <GalatMuat pesan={q.error instanceof Error ? q.error.message : undefined} />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <KartuKPI
              judul="Total Pendapatan"
              nilai={formatRupiah(q.data.total)}
              catatan={p.periode.label}
            />
            <KartuKPI
              judul="Jumlah Transaksi"
              nilai={formatAngka(q.data.jumlah_transaksi)}
              catatan="Pembayaran lunas pada periode ini"
            />
            <KartuKPI
              judul="Menunggu Verifikasi"
              nilai={formatAngka(q.data.verifikasi_menunggu)}
              catatan="Bukti bayar belum diperiksa"
              aksen={q.data.verifikasi_menunggu > 0 ? "peringatan" : undefined}
            />
          </div>

          <GrafikBatang
            judul="Pendapatan Harian"
            data={(q.data.harian ?? []).map((b) => ({ label: b.label, nilai: b.total }))}
          />

          <div className="grid gap-4 lg:grid-cols-2">
            <TabelAngka
              judul="Pendapatan Mingguan"
              kolomLabel="Minggu"
              kolomNilai="Pendapatan"
              baris={(q.data.mingguan ?? []).map((b) => ({
                label: b.label,
                nilai: b.total,
                catatan: `${formatAngka(b.jumlah)} transaksi`,
              }))}
            />
            <TabelAngka
              judul="Pendapatan Bulanan"
              kolomLabel="Bulan"
              kolomNilai="Pendapatan"
              baris={(q.data.bulanan ?? []).map((b) => ({
                label: b.label,
                nilai: b.total,
                catatan: `${formatAngka(b.jumlah)} transaksi`,
              }))}
            />
            <TabelAngka
              judul="Pendapatan Tahunan"
              kolomLabel="Tahun"
              kolomNilai="Pendapatan"
              baris={(q.data.tahunan ?? []).map((b) => ({ label: b.label, nilai: b.total }))}
            />
            <TabelAngka
              judul="Pendapatan per Kendaraan"
              kolomLabel="Kendaraan"
              kolomNilai="Pendapatan"
              baris={(q.data.per_kendaraan ?? []).map((b) => ({
                label: b.label,
                nilai: b.total,
                catatan: `${formatAngka(b.jumlah)} transaksi`,
              }))}
            />
            <TabelAngka
              judul="Pendapatan per Kategori Kendaraan"
              kolomLabel="Kategori"
              kolomNilai="Pendapatan"
              baris={(q.data.per_kategori ?? []).map((b) => ({ label: b.label, nilai: b.total }))}
            />
            <TabelAngka
              judul="Pendapatan per Tipe Sewa"
              kolomLabel="Tipe Sewa"
              kolomNilai="Pendapatan"
              baris={(q.data.per_tipe_sewa ?? []).map((b) => ({ label: b.label, nilai: b.total }))}
            />
            <TabelAngka
              judul="Pendapatan per Metode Pembayaran"
              kolomLabel="Metode"
              kolomNilai="Pendapatan"
              baris={(q.data.per_metode ?? []).map((b) => ({
                label: b.label,
                nilai: b.total,
                catatan: `${formatAngka(b.jumlah)} transaksi`,
              }))}
            />
            <TabelAngka
              judul="Penagihan Tunggakan"
              kolomLabel="Bulan"
              kolomNilai="Tertagih"
              baris={(q.data.penagihan_tunggakan ?? []).map((b) => ({
                label: b.label,
                nilai: b.total,
              }))}
            />
          </div>

          <TabelAngka
            judul="Kecepatan Verifikasi Pembayaran"
            kolomLabel="Kelompok"
            kolomNilai="Jumlah"
            uang={false}
            baris={(q.data.verifikasi ?? []).map((v) => ({
              label: v.label,
              nilai: v.jumlah,
              catatan: `Rata-rata ${v.rata_jam} jam`,
            }))}
          />
        </div>
      )}
    </div>
  );
}

function Halaman() {
  return (
    <RoleGate allow="owner">
      <DashboardShell peran="Pemilik" judul="Analitik Pendapatan">
        <Isi />
      </DashboardShell>
    </RoleGate>
  );
}
