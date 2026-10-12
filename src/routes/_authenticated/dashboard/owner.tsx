import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  BadgeCheck,
  Banknote,
  CalendarClock,
  CarFront,
  FileText,
  Percent,
  RefreshCw,
  ShieldCheck,
  Users,
  Wrench,
} from "lucide-react";

import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { PemicuPemeriksaanHarian } from "@/components/dashboard/PemicuPemeriksaanHarian";
import { RoleGate } from "@/components/dashboard/RoleGate";
import { GrafikBatang } from "@/components/bi/GrafikBatang";
import { KartuKPI } from "@/components/bi/KartuKPI";
import { NavAnalitik } from "@/components/bi/NavAnalitik";
import { PanelSorotan } from "@/components/bi/PanelSorotan";
import { GalatMuat, MemuatKartu } from "@/components/bi/StatusMuat";
import { Button } from "@/components/ui/button";
import { formatAngka, formatRupiah, formatTanggalSingkat } from "@/lib/format";
import { OPSI_CACHE, ambilRingkasanEksekutif, ambilSorotan, bandingkan } from "@/lib/analytics";

export const Route = createFileRoute("/_authenticated/dashboard/owner")({
  head: () => ({
    meta: [
      { title: "Dashboard Pemilik | Okta Car Rent" },
      {
        name: "description",
        content:
          "Ringkasan pendapatan, kontrak aktif, ketersediaan kendaraan, tunggakan, dan deposit rental mobil Okta Car Rent.",
      },
      { property: "og:title", content: "Dashboard Pemilik | Okta Car Rent" },
      {
        property: "og:description",
        content: "Pantau pendapatan harian, kontrak aktif, dan kondisi armada dalam satu halaman.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HalamanOwner,
});

const NAMA_BULAN = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

function labelBulan(bulan: string): string {
  const [tahun, bln] = bulan.split("-");
  const idx = Number(bln) - 1;
  if (!Number.isFinite(idx) || idx < 0 || idx > 11) return bulan;
  return `${NAMA_BULAN[idx]} ${tahun.slice(2)}`;
}

function IsiDashboard() {
  const ringkasan = useQuery({
    queryKey: ["bi-ringkasan-eksekutif"],
    queryFn: ambilRingkasanEksekutif,
    ...OPSI_CACHE,
  });
  const sorotan = useQuery({
    queryKey: ["bi-sorotan"],
    queryFn: ambilSorotan,
    ...OPSI_CACHE,
  });

  function muatUlang() {
    void ringkasan.refetch();
    void sorotan.refetch();
  }

  const diperbarui = ringkasan.dataUpdatedAt ? new Date(ringkasan.dataUpdatedAt) : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button size="lg" variant="outline" className="text-base" onClick={muatUlang}>
          <RefreshCw className="mr-2 size-4" aria-hidden /> Muat Ulang Data
        </Button>
        {diperbarui ? (
          <p className="text-sm text-muted-foreground">
            Terakhir diperbarui{" "}
            {diperbarui.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
          </p>
        ) : null}
      </div>

      {sorotan.data ? <PanelSorotan sorotan={sorotan.data} /> : null}

      {ringkasan.isPending ? (
        <MemuatKartu jumlah={8} />
      ) : ringkasan.error || !ringkasan.data ? (
        <GalatMuat pesan={ringkasan.error instanceof Error ? ringkasan.error.message : undefined} />
      ) : (
        <IsiAngka data={ringkasan.data} />
      )}
    </div>
  );
}

function IsiAngka({ data }: { data: Awaited<ReturnType<typeof ambilRingkasanEksekutif>> }) {
  const tren = (data.tren_12_bulan ?? []).map((b) => ({
    label: labelBulan(b.bulan),
    nilai: Number(b.pendapatan ?? 0),
  }));
  const tindakan = data.perlu_tindakan ?? {
    kontrak_jatuh_tempo: [],
    tunggakan_terlama: [],
    perawatan_terlambat: [],
  };
  const adaTindakan =
    tindakan.kontrak_jatuh_tempo.length > 0 ||
    tindakan.tunggakan_terlama.length > 0 ||
    tindakan.perawatan_terlambat.length > 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KartuKPI
          ikon={Banknote}
          judul="Pendapatan Hari Ini"
          nilai={formatRupiah(data.pendapatan_hari_ini)}
          catatan="Pembayaran lunas yang tercatat hari ini"
        />
        <KartuKPI
          ikon={CalendarClock}
          judul="Pendapatan Bulan Ini"
          nilai={formatRupiah(data.pendapatan_bulan_ini)}
          pembanding={bandingkan(data.pendapatan_bulan_ini, data.pendapatan_bulan_lalu)}
          catatan={`Bulan lalu ${formatRupiah(data.pendapatan_bulan_lalu)}`}
        />
        <KartuKPI
          ikon={Banknote}
          judul="Pendapatan Tahun Ini"
          nilai={formatRupiah(data.pendapatan_tahun_ini)}
          catatan="Akumulasi sejak awal tahun"
        />
        <KartuKPI
          ikon={FileText}
          judul="Kontrak Aktif"
          nilai={formatAngka(data.kontrak_aktif)}
          pembanding={bandingkan(data.kontrak_aktif, data.kontrak_aktif_bulan_lalu)}
          catatan={`${formatAngka(data.kontrak_terlambat)} kontrak terlambat dikembalikan`}
        />
        <KartuKPI
          ikon={CarFront}
          judul="Kendaraan Tersedia"
          nilai={formatAngka(data.kendaraan_tersedia)}
          catatan={`${formatAngka(data.kendaraan_disewa)} disewa dari total ${formatAngka(data.kendaraan_total)}`}
        />
        <KartuKPI
          ikon={Percent}
          judul="Tingkat Keterisian"
          nilai={`${data.keterisian_bulan_ini ?? 0}%`}
          pembanding={bandingkan(data.keterisian_bulan_ini, data.keterisian_bulan_lalu)}
          catatan={`Bulan lalu ${data.keterisian_bulan_lalu ?? 0}%`}
        />
        <KartuKPI
          ikon={Wrench}
          judul="Kendaraan Dalam Perawatan"
          nilai={formatAngka(data.kendaraan_perawatan)}
          catatan={`Biaya perawatan bulan ini ${formatRupiah(data.biaya_perawatan_bulan_ini)}`}
        />
        <KartuKPI
          ikon={AlertCircle}
          judul="Tunggakan Pembayaran"
          nilai={formatRupiah(data.tunggakan_nominal)}
          catatan={`${formatAngka(data.tunggakan_jumlah)} tagihan belum lunas`}
          aksen="bahaya"
        />
        <KartuKPI
          ikon={ShieldCheck}
          judul="Deposit Ditahan"
          nilai={formatRupiah(data.deposit_ditahan_nominal)}
          catatan={`${formatAngka(data.deposit_ditahan_jumlah)} deposit belum dikembalikan`}
        />
        <KartuKPI
          ikon={BadgeCheck}
          judul="Pembayaran Perlu Verifikasi"
          nilai={formatAngka(data.verifikasi_menunggu)}
          catatan="Bukti bayar dari penyewa menunggu diperiksa"
          aksen={data.verifikasi_menunggu > 0 ? "peringatan" : undefined}
        />
      </div>

      <GrafikBatang judul="Pendapatan 12 Bulan Terakhir" data={tren} />

      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="font-heading text-xl font-bold text-foreground">Perlu Tindakan</h2>
        {!adaTindakan ? (
          <p className="mt-3 text-base text-muted-foreground">
            Tidak ada hal yang perlu ditindak hari ini.
          </p>
        ) : (
          <div className="mt-4 space-y-6">
            {tindakan.kontrak_jatuh_tempo.length > 0 ? (
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  Kontrak jatuh tempo / terlambat
                </h3>
                <ul className="mt-2 space-y-2">
                  {tindakan.kontrak_jatuh_tempo.map((k) => (
                    <li key={k.id} className="flex flex-wrap justify-between gap-2 border-b border-border pb-2 last:border-0">
                      <span className="text-base text-foreground">
                        {k.nomor} — {k.penyewa} ({k.kendaraan})
                      </span>
                      <Link
                        to="/dashboard/admin/contracts/$id"
                        params={{ id: k.id }}
                        className="text-base font-medium text-primary underline"
                      >
                        Selesai {formatTanggalSingkat(k.end_date)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {tindakan.tunggakan_terlama.length > 0 ? (
              <div>
                <h3 className="text-base font-semibold text-foreground">Tunggakan terlama</h3>
                <ul className="mt-2 space-y-2">
                  {tindakan.tunggakan_terlama.map((t) => (
                    <li key={t.id} className="flex flex-wrap justify-between gap-2 border-b border-border pb-2 last:border-0">
                      <span className="text-base text-foreground">
                        {t.penyewa} — {t.keterangan}
                      </span>
                      <span className="text-base font-medium text-destructive">
                        {formatRupiah(t.sisa)} · {formatAngka(t.umur_hari)} hari
                      </span>
                    </li>
                  ))}
                </ul>
                <Button asChild size="lg" variant="outline" className="mt-3 text-base">
                  <Link to="/dashboard/admin/outstanding">Buka Daftar Tunggakan</Link>
                </Button>
              </div>
            ) : null}

            {tindakan.perawatan_terlambat.length > 0 ? (
              <div>
                <h3 className="text-base font-semibold text-foreground">Perawatan terlambat</h3>
                <ul className="mt-2 space-y-2">
                  {tindakan.perawatan_terlambat.map((m) => (
                    <li key={m.id} className="flex flex-wrap justify-between gap-2 border-b border-border pb-2 last:border-0">
                      <span className="text-base text-foreground">
                        {m.kendaraan} — {m.jenis}
                      </span>
                      <span className="text-base font-medium text-destructive">
                        Jadwal {formatTanggalSingkat(m.scheduled_date)}
                      </span>
                    </li>
                  ))}
                </ul>
                <Button asChild size="lg" variant="outline" className="mt-3 text-base">
                  <Link to="/dashboard/admin/maintenance">Buka Perawatan Armada</Link>
                </Button>
              </div>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}

function HalamanOwner() {
  return (
    <RoleGate allow="owner">
      <DashboardShell peran="Pemilik" judul="Dashboard Pemilik">
        <PemicuPemeriksaanHarian />
        <div className="space-y-6">
          <NavAnalitik />
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg" className="text-base">
              <Link to="/dashboard/admin/vehicles">
                <CarFront className="mr-2 size-4" aria-hidden /> Kelola Kendaraan
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="text-base">
              <Link to="/dashboard/admin/renters">
                <Users className="mr-2 size-4" aria-hidden /> Kelola Penyewa
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="text-base">
              <Link to="/dashboard/admin/contracts">
                <FileText className="mr-2 size-4" aria-hidden /> Kelola Kontrak
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="text-base">
              <Link to="/dashboard/admin/payments">Kelola Pembayaran</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="text-base">
              <Link to="/dashboard/admin/outstanding">Tunggakan</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="text-base">
              <Link to="/dashboard/admin/deposits">Deposit</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="text-base">
              <Link to="/dashboard/admin/maintenance">Perawatan Armada</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="text-base">
              <Link to="/dashboard/owner/pengguna">Kelola Pengguna</Link>
            </Button>
          </div>
          <IsiDashboard />
        </div>
      </DashboardShell>
    </RoleGate>
  );
}
