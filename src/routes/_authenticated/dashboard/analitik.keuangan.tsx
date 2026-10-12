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
import { OPSI_CACHE, ambilAnalitikKeuangan } from "@/lib/analytics";

export const Route = createFileRoute("/_authenticated/dashboard/analitik/keuangan")({
  head: () => ({
    meta: [
      { title: "Analitik Keuangan | Okta Car Rent" },
      {
        name: "description",
        content:
          "Pendapatan, biaya perawatan, kas operasional, umur piutang, dan posisi deposit rental mobil.",
      },
      { property: "og:title", content: "Analitik Keuangan | Okta Car Rent" },
      {
        property: "og:description",
        content: "Pantau arus kas operasional, piutang, dan deposit pada satu halaman.",
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
    queryKey: ["bi-keuangan", p.periode.dari, p.periode.sampai],
    queryFn: () => ambilAnalitikKeuangan(p.periode),
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
        <MemuatKartu jumlah={6} />
      ) : q.error || !q.data ? (
        <GalatMuat pesan={q.error instanceof Error ? q.error.message : undefined} />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <KartuKPI judul="Pendapatan" nilai={formatRupiah(q.data.pendapatan)} catatan={p.periode.label} />
            <KartuKPI
              judul="Biaya Perawatan"
              nilai={formatRupiah(q.data.biaya_perawatan)}
              catatan="Perawatan selesai pada periode ini"
            />
            <KartuKPI
              judul="Kas Operasional"
              nilai={formatRupiah(q.data.kas_operasional)}
              catatan="Pendapatan dikurangi biaya perawatan"
              aksen={q.data.kas_operasional < 0 ? "bahaya" : undefined}
            />
            <KartuKPI
              judul="Total Tunggakan"
              nilai={formatRupiah(q.data.tunggakan_total)}
              catatan={`${formatAngka(q.data.tunggakan_jumlah)} tagihan belum lunas`}
              aksen={q.data.tunggakan_total > 0 ? "bahaya" : undefined}
            />
            <KartuKPI
              judul="Deposit Ditahan"
              nilai={formatRupiah(q.data.deposit?.ditahan_total ?? 0)}
              catatan={`${formatAngka(q.data.deposit?.ditahan_jumlah ?? 0)} deposit · ${formatAngka(
                q.data.deposit?.menunggu_jumlah ?? 0,
              )} menunggu penerimaan`}
            />
            <KartuKPI
              judul="Pembayaran Menunggu Verifikasi"
              nilai={formatRupiah(q.data.pembayaran_menunggu?.total ?? 0)}
              catatan={`${formatAngka(q.data.pembayaran_menunggu?.jumlah ?? 0)} bukti bayar`}
              aksen={(q.data.pembayaran_menunggu?.jumlah ?? 0) > 0 ? "peringatan" : undefined}
            />
          </div>

          <GrafikBatang
            judul="Pendapatan 12 Bulan"
            data={(q.data.perbandingan_bulanan ?? []).map((b) => ({
              label: labelBulan(b.bulan),
              nilai: Number(b.pendapatan ?? 0),
            }))}
          />
          <GrafikBatang
            judul="Biaya Perawatan 12 Bulan"
            data={(q.data.perbandingan_bulanan ?? []).map((b) => ({
              label: labelBulan(b.bulan),
              nilai: Number(b.biaya ?? 0),
            }))}
          />

          <div className="grid gap-4 lg:grid-cols-2">
            <TabelAngka
              judul="Umur Piutang"
              kolomLabel="Kelompok Umur"
              kolomNilai="Nilai"
              baris={(q.data.umur_piutang ?? []).map((u) => ({
                label: u.kelompok,
                nilai: u.total,
                catatan: `${formatAngka(u.jumlah)} tagihan`,
              }))}
            />
            <TabelAngka
              judul="Posisi Deposit"
              kolomLabel="Keterangan"
              kolomNilai="Nilai"
              baris={[
                { label: "Ditahan", nilai: q.data.deposit?.ditahan_total ?? 0 },
                { label: "Sudah dikembalikan", nilai: q.data.deposit?.dikembalikan_total ?? 0 },
                { label: "Total potongan", nilai: q.data.deposit?.potongan_total ?? 0 },
              ]}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function Halaman() {
  return (
    <RoleGate allow="owner">
      <DashboardShell peran="Pemilik" judul="Analitik Keuangan">
        <Isi />
      </DashboardShell>
    </RoleGate>
  );
}
