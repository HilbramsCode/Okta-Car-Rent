import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { RoleGate } from "@/components/dashboard/RoleGate";
import { KartuKPI } from "@/components/bi/KartuKPI";
import { NavAnalitik } from "@/components/bi/NavAnalitik";
import { PemilihPeriode } from "@/components/bi/PemilihPeriode";
import { GalatMuat, MemuatKartu } from "@/components/bi/StatusMuat";
import { gunakanPeriode } from "@/components/bi/gunakanPeriode";
import { formatAngka, formatRupiah } from "@/lib/format";
import { OPSI_CACHE, ambilAnalitikPelanggan } from "@/lib/analytics";

export const Route = createFileRoute("/_authenticated/dashboard/analitik/pelanggan")({
  head: () => ({
    meta: [
      { title: "Analitik Pelanggan | Okta Car Rent" },
      {
        name: "description",
        content:
          "Jumlah penyewa aktif, penyewa baru, penyewa berulang, pelanggan teratas, dan kontrak terpanjang.",
      },
      { property: "og:title", content: "Analitik Pelanggan | Okta Car Rent" },
      {
        property: "og:description",
        content: "Kenali pelanggan paling bernilai dan pelanggan yang masih memiliki tunggakan.",
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
    queryKey: ["bi-pelanggan", p.periode.dari, p.periode.sampai],
    queryFn: () => ambilAnalitikPelanggan(p.periode),
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
            <KartuKPI judul="Total Penyewa" nilai={formatAngka(q.data.total)} catatan="Seluruh data penyewa" />
            <KartuKPI
              judul="Penyewa Aktif"
              nilai={formatAngka(q.data.aktif)}
              catatan="Punya kontrak pada periode ini"
            />
            <KartuKPI judul="Penyewa Baru" nilai={formatAngka(q.data.baru)} catatan={p.periode.label} />
            <KartuKPI
              judul="Penyewa Berulang"
              nilai={formatAngka(q.data.berulang)}
              catatan="Menyewa lebih dari satu kali"
            />
            <KartuKPI
              judul="Rata-rata Durasi Kontrak"
              nilai={`${q.data.rata_durasi_kontrak ?? 0} hari`}
              catatan="Rata-rata lama sewa"
            />
          </div>

          <section className="rounded-lg border border-border bg-card p-4">
            <h2 className="font-heading text-xl font-bold text-foreground">Pelanggan Teratas</h2>
            {(q.data.teratas ?? []).length === 0 ? (
              <p className="mt-3 text-base text-muted-foreground">Tidak ada data pada periode ini.</p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[680px] border-collapse text-base">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="py-2 pr-3 font-medium text-muted-foreground">Nama</th>
                      <th className="py-2 pr-3 font-medium text-muted-foreground">Telepon</th>
                      <th className="py-2 pr-3 text-right font-medium text-muted-foreground">
                        Kontrak
                        <span className="block text-sm font-normal">seluruh waktu</span>
                      </th>
                      <th className="py-2 pr-3 text-right font-medium text-muted-foreground">
                        Pembayaran Diterima
                        <span className="block text-sm font-normal">{p.periode.label}</span>
                      </th>
                      <th className="py-2 text-right font-medium text-muted-foreground">
                        Tunggakan (Total)
                        <span className="block text-sm font-normal">seluruh waktu</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {q.data.teratas.map((t) => (
                      <tr key={t.renter_id} className="border-b border-border last:border-0">
                        <td className="py-2 pr-3 text-foreground">{t.nama}</td>
                        <td className="py-2 pr-3 text-muted-foreground">{t.telepon}</td>
                        <td className="py-2 pr-3 text-right text-foreground">
                          {formatAngka(t.jumlah_kontrak)}
                        </td>
                        <td className="py-2 pr-3 text-right text-foreground">{formatRupiah(t.nilai)}</td>
                        <td
                          className={`py-2 text-right ${
                            t.tunggakan > 0 ? "font-semibold text-destructive" : "text-foreground"
                          }`}
                        >
                          {formatRupiah(t.tunggakan)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {(q.data.teratas ?? []).length > 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                Catatan: kolom Pembayaran Diterima hanya menghitung pembayaran lunas pada periode
                yang dipilih ({p.periode.label}), bukan nilai kontrak. Jumlah kontrak dan tunggakan
                dihitung menyeluruh tanpa batas periode.
              </p>
            ) : null}
          </section>

          <section className="rounded-lg border border-border bg-card p-4">
            <h2 className="font-heading text-xl font-bold text-foreground">Kontrak Terpanjang</h2>
            {(q.data.kontrak_terpanjang ?? []).length === 0 ? (
              <p className="mt-3 text-base text-muted-foreground">Tidak ada data pada periode ini.</p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[560px] border-collapse text-base">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="py-2 pr-3 font-medium text-muted-foreground">Nomor</th>
                      <th className="py-2 pr-3 font-medium text-muted-foreground">Penyewa</th>
                      <th className="py-2 pr-3 text-right font-medium text-muted-foreground">Durasi</th>
                      <th className="py-2 text-right font-medium text-muted-foreground">Nilai</th>
                    </tr>
                  </thead>
                  <tbody>
                    {q.data.kontrak_terpanjang.map((k) => (
                      <tr key={k.nomor} className="border-b border-border last:border-0">
                        <td className="py-2 pr-3 text-foreground">{k.nomor}</td>
                        <td className="py-2 pr-3 text-foreground">{k.penyewa}</td>
                        <td className="py-2 pr-3 text-right text-foreground">
                          {formatAngka(k.durasi)} hari
                        </td>
                        <td className="py-2 text-right text-foreground">{formatRupiah(k.nilai)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function Halaman() {
  return (
    <RoleGate allow="owner">
      <DashboardShell peran="Pemilik" judul="Analitik Pelanggan">
        <Isi />
      </DashboardShell>
    </RoleGate>
  );
}
