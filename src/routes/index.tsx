import { Link, createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { BadgeCheck, CalendarCheck, ClipboardList, Headset, ShieldCheck, Wallet } from "lucide-react";

import heroFleet from "@/assets/hero-fleet.jpg";
import { KartuArmada } from "@/components/site/KartuArmada";
import { PublicShell } from "@/components/site/PublicShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { daftarArmadaPublik } from "@/lib/public.functions";

const armadaQuery = queryOptions({
  queryKey: ["armada-publik"],
  queryFn: () => daftarArmadaPublik(),
});

export const Route = createFileRoute("/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(armadaQuery),
  head: () => ({
    meta: [
      { title: "Okta Car Rent — Rental Mobil Harian & Bulanan Jakarta" },
      {
        name: "description",
        content:
          "Sewa mobil harian, mingguan, dan bulanan di Jakarta. Armada terawat, harga transparan, proses cepat, dan kontrak jelas bersama Okta Car Rent.",
      },
      { property: "og:title", content: "Okta Car Rent — Rental Mobil Terpercaya" },
      {
        property: "og:description",
        content:
          "Armada terawat, harga transparan, dan proses sewa cepat untuk kebutuhan pribadi maupun perusahaan.",
      },
    ],
  }),
  component: Beranda,
  errorComponent: () => (
    <PublicShell>
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <h1 className="font-heading text-2xl font-bold">Halaman gagal dimuat</h1>
        <p className="mt-2 text-muted-foreground">Silakan muat ulang halaman ini.</p>
      </div>
    </PublicShell>
  ),
});

const keunggulan = [
  { icon: ShieldCheck, judul: "Armada Terawat", teks: "Servis berkala terjadwal dan riwayat perawatan tercatat rapi untuk setiap unit." },
  { icon: Wallet, judul: "Harga Transparan", teks: "Tarif harian, mingguan, dan bulanan tercantum jelas. Tidak ada biaya tersembunyi." },
  { icon: ClipboardList, judul: "Kontrak Jelas", teks: "Setiap sewa memiliki kontrak bernomor lengkap dengan rincian deposit dan denda." },
  { icon: Headset, judul: "Bantuan 24 Jam", teks: "Tim kami siap membantu jika terjadi kendala di jalan selama masa sewa." },
];

const langkah = [
  { no: "1", judul: "Pilih Mobil", teks: "Lihat daftar armada dan tarif, lalu pilih unit yang sesuai kebutuhan Anda." },
  { no: "2", judul: "Kirim Dokumen", teks: "Siapkan KTP dan SIM A yang masih berlaku untuk proses verifikasi." },
  { no: "3", judul: "Bayar & Deposit", teks: "Lakukan pembayaran sewa beserta uang jaminan sesuai kesepakatan." },
  { no: "4", judul: "Ambil Mobil", teks: "Serah terima unit disertai pemeriksaan kondisi bersama petugas kami." },
];

function Beranda() {
  const { data: armada } = useSuspenseQuery(armadaQuery);
  const unggulan = armada.slice(0, 3);
  const tarifTerendah = armada.length
    ? Math.min(...armada.map((m) => m.daily_rate))
    : 0;

  return (
    <PublicShell>
      <section className="border-b border-border bg-card">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-12 lg:grid-cols-2 lg:py-16">
          <div>
            <span className="inline-flex items-center gap-2 rounded-md bg-secondary px-3 py-1.5 text-base font-semibold text-secondary-foreground">
              <BadgeCheck className="size-4" /> Melayani sejak 2015
            </span>
            <h1 className="mt-4 font-heading text-4xl font-bold leading-tight text-foreground sm:text-5xl">
              Sewa Mobil Mudah, <span className="text-primary">Aman</span>, dan Harga Jelas
            </h1>
            <p className="mt-4 max-w-xl text-lg text-muted-foreground">
              Okta Car Rent melayani penyewaan mobil harian, mingguan, dan bulanan di Jakarta dan
              sekitarnya. Semua proses dicatat rapi mulai dari kontrak, pembayaran, hingga
              pengembalian uang jaminan.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild size="lg" className="text-base">
                <Link to="/armada">Lihat Armada &amp; Tarif</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="text-base">
                <Link to="/kontak">Hubungi Kami</Link>
              </Button>
            </div>
            {tarifTerendah > 0 ? (
              <p className="mt-4 text-base text-muted-foreground">
                Mulai dari{" "}
                <strong className="text-foreground">
                  Rp {new Intl.NumberFormat("id-ID").format(tarifTerendah)}
                </strong>{" "}
                per hari.
              </p>
            ) : null}
          </div>

          <img
            src={heroFleet}
            alt="Mobil MPV putih siap disewa dari armada Okta Car Rent"
            width={1600}
            height={900}
            className="w-full rounded-lg border border-border object-cover"
          />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="font-heading text-2xl font-bold sm:text-3xl">Kenapa Memilih Kami</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {keunggulan.map((item) => (
            <Card key={item.judul} className="h-full">
              <CardContent className="pt-6">
                <span className="flex size-11 items-center justify-center rounded-md bg-secondary text-primary">
                  <item.icon className="size-6" />
                </span>
                <h3 className="mt-4 font-heading text-lg font-bold">{item.judul}</h3>
                <p className="mt-1.5 text-base text-muted-foreground">{item.teks}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-secondary/50">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <h2 className="font-heading text-2xl font-bold sm:text-3xl">Cara Menyewa</h2>
          <p className="mt-2 text-lg text-muted-foreground">Empat langkah sederhana, selesai di hari yang sama.</p>
          <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {langkah.map((item) => (
              <li key={item.no} className="rounded-lg border border-border bg-card p-5">
                <span className="flex size-10 items-center justify-center rounded-md bg-primary font-heading text-lg font-bold text-primary-foreground">
                  {item.no}
                </span>
                <h3 className="mt-3 font-heading text-lg font-bold">{item.judul}</h3>
                <p className="mt-1.5 text-base text-muted-foreground">{item.teks}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {unggulan.length ? (
        <section className="mx-auto max-w-6xl px-4 py-12">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-heading text-2xl font-bold sm:text-3xl">Armada Pilihan</h2>
              <p className="mt-2 text-lg text-muted-foreground">Beberapa unit yang paling sering disewa.</p>
            </div>
            <Button asChild variant="outline" size="lg" className="text-base">
              <Link to="/armada">Lihat semua armada</Link>
            </Button>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {unggulan.map((mobil) => (
              <KartuArmada key={mobil.id} mobil={mobil} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="mx-auto max-w-6xl px-4 pb-12">
        <div className="flex flex-col items-start gap-4 rounded-lg border border-border bg-primary p-8 text-primary-foreground sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-heading text-2xl font-bold">Siap menyewa hari ini?</h2>
            <p className="mt-1.5 text-lg opacity-90">
              Hubungi kami atau masuk ke akun Anda untuk melihat status sewa dan tagihan.
            </p>
          </div>
          <div className="flex gap-3">
            <Button asChild size="lg" variant="secondary" className="text-base">
              <Link to="/auth">Masuk Akun</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-primary-foreground/40 bg-transparent text-base text-primary-foreground hover:bg-primary-foreground/10">
              <Link to="/kontak">
                <CalendarCheck className="mr-1 size-4" /> Pesan Sekarang
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
