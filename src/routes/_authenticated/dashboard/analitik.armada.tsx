import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { RoleGate } from "@/components/dashboard/RoleGate";
import { KartuKPI } from "@/components/bi/KartuKPI";
import { NavAnalitik } from "@/components/bi/NavAnalitik";
import { PemilihPeriode } from "@/components/bi/PemilihPeriode";
import { TabelAngka } from "@/components/bi/TabelAngka";
import { TabelKesiapan } from "@/components/bi/TabelKesiapan";
import { GalatMuat, MemuatKartu } from "@/components/bi/StatusMuat";
import { gunakanPeriode } from "@/components/bi/gunakanPeriode";
import { formatAngka, formatRupiah } from "@/lib/format";
import { OPSI_CACHE, ambilAnalitikArmada } from "@/lib/analytics";

export const Route = createFileRoute("/_authenticated/dashboard/analitik/armada")({
  head: () => ({
    meta: [
      { title: "Analitik Armada | Okta Car Rent" },
      {
        name: "description",
        content:
          "Tingkat keterisian, hari pakai, pendapatan per unit, biaya perawatan, dan kesiapan armada rental mobil.",
      },
      { property: "og:title", content: "Analitik Armada | Okta Car Rent" },
      {
        property: "og:description",
        content: "Ketahui unit paling produktif dan unit yang paling banyak menyerap biaya.",
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
    queryKey: ["bi-armada", p.periode.dari, p.periode.sampai],
    queryFn: () => ambilAnalitikArmada(p.periode),
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
            <KartuKPI
              judul="Tingkat Keterisian"
              nilai={`${q.data.keterisian ?? 0}%`}
              catatan={`Periode ${p.periode.label}`}
            />
            <KartuKPI
              judul="Rata-rata Durasi Sewa"
              nilai={`${q.data.rata_durasi_sewa ?? 0} hari`}
              catatan="Dihitung dari kontrak pada periode ini"
            />
            <KartuKPI
              judul="Kendaraan Tersedia"
              nilai={formatAngka(q.data.ketersediaan?.tersedia ?? 0)}
              catatan={`${formatAngka(q.data.ketersediaan?.disewa ?? 0)} disewa · ${formatAngka(
                q.data.ketersediaan?.perawatan ?? 0,
              )} perawatan · ${formatAngka(q.data.ketersediaan?.tidak_aktif ?? 0)} tidak aktif`}
            />
          </div>

          <section className="rounded-lg border border-border bg-card p-4">
            <h2 className="font-heading text-xl font-bold text-foreground">
              Kinerja per Kendaraan
            </h2>
            {(q.data.per_kendaraan ?? []).length === 0 ? (
              <p className="mt-3 text-base text-muted-foreground">
                Tidak ada data pada periode ini.
              </p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[860px] border-collapse text-base">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="py-2 pr-3 font-medium text-muted-foreground">Kendaraan</th>
                      <th className="py-2 pr-3 font-medium text-muted-foreground">Kategori</th>
                      <th className="py-2 pr-3 text-right font-medium text-muted-foreground">Sewa</th>
                      <th className="py-2 pr-3 text-right font-medium text-muted-foreground">
                        Hari Pakai
                      </th>
                      <th className="py-2 pr-3 text-right font-medium text-muted-foreground">
                        Pendapatan
                      </th>
                      <th className="py-2 pr-3 text-right font-medium text-muted-foreground">
                        Biaya Perawatan
                      </th>
                      <th className="py-2 pr-3 text-right font-medium text-muted-foreground">
                        Hari Perawatan
                      </th>
                      <th className="py-2 text-right font-medium text-muted-foreground">Km Periode</th>
                    </tr>
                  </thead>
                  <tbody>
                    {q.data.per_kendaraan.map((b) => (
                      <tr key={b.vehicle_id} className="border-b border-border last:border-0">
                        <td className="py-2 pr-3 text-foreground">{b.label}</td>
                        <td className="py-2 pr-3 text-muted-foreground">{b.kategori}</td>
                        <td className="py-2 pr-3 text-right text-foreground">
                          {formatAngka(b.jumlah_sewa)}
                        </td>
                        <td className="py-2 pr-3 text-right text-foreground">
                          {formatAngka(b.hari_pakai)}
                        </td>
                        <td className="py-2 pr-3 text-right text-foreground">
                          {formatRupiah(b.pendapatan)}
                        </td>
                        <td className="py-2 pr-3 text-right text-foreground">
                          {formatRupiah(b.biaya_perawatan)}
                        </td>
                        <td className="py-2 pr-3 text-right text-foreground">
                          {formatAngka(b.downtime)}
                        </td>
                        <td className="py-2 text-right text-foreground">
                          {formatAngka(b.delta_km)} km
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <TabelAngka
              judul="Pendapatan Tertinggi per Unit"
              kolomLabel="Kendaraan"
              kolomNilai="Pendapatan"
              baris={[...(q.data.per_kendaraan ?? [])]
                .sort((a, b) => b.pendapatan - a.pendapatan)
                .slice(0, 10)
                .map((b) => ({ label: b.label, nilai: b.pendapatan }))}
            />
            <TabelAngka
              judul="Biaya Perawatan Tertinggi per Unit"
              kolomLabel="Kendaraan"
              kolomNilai="Biaya"
              baris={[...(q.data.per_kendaraan ?? [])]
                .sort((a, b) => b.biaya_perawatan - a.biaya_perawatan)
                .slice(0, 10)
                .map((b) => ({ label: b.label, nilai: b.biaya_perawatan }))}
            />
          </div>

          <TabelKesiapan judul="Kesiapan Servis Armada" baris={q.data.kesiapan ?? []} />
        </div>
      )}
    </div>
  );
}

function Halaman() {
  return (
    <RoleGate allow="owner">
      <DashboardShell peran="Pemilik" judul="Analitik Armada">
        <Isi />
      </DashboardShell>
    </RoleGate>
  );
}
