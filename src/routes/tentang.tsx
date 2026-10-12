import { createFileRoute } from "@tanstack/react-router";

import { PageHeader, PublicShell } from "@/components/site/PublicShell";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/tentang")({
  head: () => ({
    meta: [
      { title: "Tentang Okta Car Rent — Rental Mobil Sejak 2015" },
      {
        name: "description",
        content:
          "Okta Car Rent adalah penyedia jasa rental mobil di Jakarta sejak 2015 dengan armada terawat dan administrasi sewa yang rapi.",
      },
      { property: "og:title", content: "Tentang Okta Car Rent" },
      {
        property: "og:description",
        content: "Kenali perjalanan, nilai kerja, dan komitmen layanan kami.",
      },
    ],
  }),
  component: HalamanTentang,
});

const angka = [
  { nilai: "10+", label: "Tahun melayani" },
  { nilai: "8", label: "Unit armada aktif" },
  { nilai: "1.200+", label: "Kontrak sewa selesai" },
  { nilai: "24 jam", label: "Bantuan darurat" },
];

const nilai = [
  { judul: "Jujur soal harga", teks: "Semua biaya dijelaskan di awal, termasuk deposit dan potensi denda." },
  { judul: "Rapi soal catatan", teks: "Setiap kontrak, pembayaran, dan perawatan tercatat dan bisa ditelusuri." },
  { judul: "Cepat saat dibutuhkan", teks: "Proses verifikasi dan serah terima unit dirancang selesai di hari yang sama." },
];

function HalamanTentang() {
  return (
    <PublicShell>
      <PageHeader
        judul="Tentang Okta Car Rent"
        deskripsi="Kami membantu keluarga, pekerja, dan perusahaan mendapatkan kendaraan yang layak dengan proses yang jelas."
      />

      <div className="mx-auto max-w-4xl px-4 py-10">
        <section className="space-y-4 text-lg leading-relaxed text-muted-foreground">
          <p>
            Okta Car Rent berdiri pada tahun 2015 di Jakarta Selatan, berawal dari tiga unit mobil
            keluarga yang disewakan kepada tetangga dan rekan kerja. Yang membuat pelanggan kembali
            bukan armada yang mewah, melainkan kepastian: mobil siap pakai, harga tidak berubah di
            tengah jalan, dan uang jaminan kembali tepat waktu.
          </p>
          <p>
            Hari ini kami mengelola armada MPV, SUV, city car, dan kendaraan premium dengan sistem
            administrasi yang tercatat rapi. Setiap kendaraan memiliki riwayat perawatan, setiap
            kontrak memiliki nomor, dan setiap rupiah pembayaran maupun potongan deposit tercatat
            beserta alasannya.
          </p>
        </section>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {angka.map((a) => (
            <Card key={a.label}>
              <CardContent className="pt-6 text-center">
                <p className="font-heading text-3xl font-bold text-primary">{a.nilai}</p>
                <p className="mt-1 text-base text-muted-foreground">{a.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <section className="mt-12">
          <h2 className="font-heading text-2xl font-bold">Nilai Kerja Kami</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {nilai.map((n) => (
              <Card key={n.judul} className="h-full border-l-4 border-l-primary">
                <CardContent className="pt-6">
                  <h3 className="font-heading text-lg font-bold">{n.judul}</h3>
                  <p className="mt-1.5 text-base text-muted-foreground">{n.teks}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="mt-12 rounded-lg border border-border bg-card p-6">
          <h2 className="font-heading text-2xl font-bold">Jam Operasional</h2>
          <dl className="mt-4 space-y-2 text-base">
            <div className="flex justify-between border-b border-border pb-2">
              <dt className="text-muted-foreground">Senin – Jumat</dt>
              <dd className="font-semibold">08.00 – 20.00 WIB</dd>
            </div>
            <div className="flex justify-between border-b border-border pb-2">
              <dt className="text-muted-foreground">Sabtu – Minggu</dt>
              <dd className="font-semibold">08.00 – 17.00 WIB</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Bantuan darurat</dt>
              <dd className="font-semibold">24 jam melalui telepon</dd>
            </div>
          </dl>
        </section>
      </div>
    </PublicShell>
  );
}