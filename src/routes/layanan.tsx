import { Link, createFileRoute } from "@tanstack/react-router";
import { Building2, CalendarDays, CalendarRange, PlaneTakeoff, UserRound } from "lucide-react";

import { PageHeader, PublicShell } from "@/components/site/PublicShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/layanan")({
  head: () => ({
    meta: [
      { title: "Layanan Rental Mobil — Okta Car Rent" },
      {
        name: "description",
        content:
          "Sewa harian, mingguan, bulanan, lepas kunci maupun dengan sopir, antar-jemput bandara, dan kerja sama korporat bersama Okta Car Rent.",
      },
      { property: "og:title", content: "Layanan Rental Mobil — Okta Car Rent" },
      {
        property: "og:description",
        content: "Pilihan layanan sewa mobil untuk kebutuhan pribadi, keluarga, dan perusahaan.",
      },
    ],
  }),
  component: HalamanLayanan,
});

const layanan = [
  {
    icon: CalendarDays,
    judul: "Sewa Harian",
    teks: "Cocok untuk perjalanan singkat, acara keluarga, atau kebutuhan mendadak. Minimal sewa 1 hari (24 jam).",
  },
  {
    icon: CalendarRange,
    judul: "Sewa Mingguan & Bulanan",
    teks: "Tarif lebih hemat untuk pemakaian jangka panjang. Cocok untuk pekerja proyek dan pendatang baru di kota.",
  },
  {
    icon: UserRound,
    judul: "Lepas Kunci atau Dengan Sopir",
    teks: "Bawa sendiri mobilnya, atau gunakan sopir berpengalaman kami dengan biaya tambahan harian.",
  },
  {
    icon: PlaneTakeoff,
    judul: "Antar-Jemput Bandara",
    teks: "Layanan pengantaran unit ke bandara, stasiun, hotel, atau alamat Anda di area Jabodetabek.",
  },
  {
    icon: Building2,
    judul: "Kerja Sama Perusahaan",
    teks: "Kontrak operasional kendaraan untuk perusahaan dengan penagihan bulanan dan laporan pemakaian.",
  },
];

const biayaTambahan = [
  ["Sopir (dalam kota)", "Rp 200.000 / hari (belum termasuk makan & penginapan)"],
  ["Antar / jemput unit Jabodetabek", "Rp 100.000 – Rp 250.000 sekali jalan"],
  ["Denda keterlambatan", "10% dari tarif harian per jam, maksimal 1 tarif harian per hari"],
  ["Overtime luar kota", "Menyesuaikan jarak dan durasi, disepakati di awal kontrak"],
  ["Pembersihan khusus", "Rp 150.000 jika unit dikembalikan dalam kondisi sangat kotor"],
];

function HalamanLayanan() {
  return (
    <PublicShell>
      <PageHeader
        judul="Layanan Kami"
        deskripsi="Pilih layanan yang paling sesuai dengan kebutuhan perjalanan Anda. Semua ketentuan dituangkan dalam kontrak tertulis."
      />

      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {layanan.map((item) => (
            <Card key={item.judul} className="h-full">
              <CardHeader>
                <span className="flex size-11 items-center justify-center rounded-md bg-secondary text-primary">
                  <item.icon className="size-6" />
                </span>
                <CardTitle className="mt-3 font-heading text-xl">{item.judul}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-base text-muted-foreground">{item.teks}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <section className="mt-12">
          <h2 className="font-heading text-2xl font-bold">Biaya Tambahan</h2>
          <p className="mt-2 text-lg text-muted-foreground">
            Biaya berikut hanya dikenakan bila layanannya digunakan.
          </p>
          <div className="mt-4 overflow-hidden rounded-lg border border-border">
            <table className="w-full border-collapse bg-card text-base">
              <tbody>
                {biayaTambahan.map(([nama, harga]) => (
                  <tr key={nama} className="border-b border-border last:border-0">
                    <th scope="row" className="w-1/2 p-4 text-left font-semibold">{nama}</th>
                    <td className="p-4 text-muted-foreground">{harga}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="mt-10 flex flex-wrap gap-3">
          <Button asChild size="lg" className="text-base">
            <Link to="/armada">Lihat Armada</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="text-base">
            <Link to="/kontak">Tanya Ketersediaan</Link>
          </Button>
        </div>
      </div>
    </PublicShell>
  );
}