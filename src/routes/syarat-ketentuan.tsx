import { createFileRoute } from "@tanstack/react-router";

import { PageHeader, PublicShell } from "@/components/site/PublicShell";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const Route = createFileRoute("/syarat-ketentuan")({
  head: () => ({
    meta: [
      { title: "Syarat & Ketentuan Sewa — Okta Car Rent" },
      {
        name: "description",
        content:
          "Persyaratan dokumen, aturan pembayaran, ketentuan uang jaminan, denda keterlambatan, dan tanggung jawab penyewa di Okta Car Rent.",
      },
      { property: "og:title", content: "Syarat & Ketentuan Sewa — Okta Car Rent" },
      {
        property: "og:description",
        content: "Baca ketentuan sewa, deposit, dan denda sebelum menandatangani kontrak.",
      },
    ],
  }),
  component: HalamanSyarat,
});

const bagian = [
  {
    judul: "1. Persyaratan Penyewa",
    isi: [
      "Berusia minimal 21 tahun dan memiliki KTP yang masih berlaku.",
      "Memiliki SIM A yang masih berlaku minimal 3 bulan ke depan (untuk sewa lepas kunci).",
      "Menyerahkan salinan KTP, SIM, dan Kartu Keluarga atau dokumen pendukung lain.",
      "Menandatangani kontrak sewa sebelum unit diserahkan.",
    ],
  },
  {
    judul: "2. Pembayaran",
    isi: [
      "Pembayaran sewa dilakukan di muka, secara tunai maupun transfer bank.",
      "Bukti transfer wajib diunggah atau dikirim ke admin untuk diverifikasi.",
      "Sewa dianggap sah setelah pembayaran diverifikasi oleh admin.",
      "Perpanjangan sewa harus diinformasikan minimal 12 jam sebelum masa sewa berakhir.",
    ],
  },
  {
    judul: "3. Uang Jaminan (Deposit)",
    isi: [
      "Besaran uang jaminan mengikuti kelas kendaraan, mulai Rp 800.000 hingga Rp 5.000.000.",
      "Uang jaminan ditahan selama masa sewa dan tidak dianggap sebagai pembayaran sewa.",
      "Pengembalian dilakukan maksimal 3 hari kerja setelah unit dikembalikan dan diperiksa.",
      "Potongan dapat dikenakan untuk kerusakan, kekurangan BBM, denda tilang, atau kehilangan kelengkapan.",
      "Rincian setiap potongan diberikan tertulis kepada penyewa.",
    ],
  },
  {
    judul: "4. Keterlambatan Pengembalian",
    isi: [
      "Toleransi keterlambatan adalah 1 jam dari waktu pengembalian yang disepakati.",
      "Lewat toleransi, denda dihitung 10% dari tarif harian untuk setiap jam keterlambatan.",
      "Keterlambatan lebih dari 10 jam dihitung sebagai tambahan 1 hari sewa penuh.",
      "Keterlambatan tanpa kabar lebih dari 24 jam dapat dilaporkan sebagai penggelapan kendaraan.",
    ],
  },
  {
    judul: "5. Tanggung Jawab Penyewa",
    isi: [
      "Kendaraan hanya boleh dikemudikan oleh penyewa atau pengemudi yang terdaftar di kontrak.",
      "Dilarang menggadaikan, menyewakan kembali, atau memindahtangankan kendaraan.",
      "Dilarang menggunakan kendaraan untuk kegiatan melanggar hukum, balapan, atau menarik beban berat.",
      "Segala tilang dan pelanggaran lalu lintas selama masa sewa menjadi tanggung jawab penyewa.",
      "Kerusakan akibat kelalaian ditanggung penyewa sesuai biaya perbaikan bengkel resmi.",
    ],
  },
  {
    judul: "6. Kecelakaan & Asuransi",
    isi: [
      "Seluruh unit dilindungi asuransi All Risk dengan biaya own risk yang ditanggung penyewa.",
      "Penyewa wajib melapor ke Okta Car Rent maksimal 1x24 jam setelah kejadian.",
      "Penyewa wajib membuat laporan kepolisian untuk klaim asuransi.",
      "Klaim tidak berlaku bila pengemudi tidak terdaftar atau berada di bawah pengaruh alkohol/obat terlarang.",
    ],
  },
  {
    judul: "7. Pembatalan",
    isi: [
      "Pembatalan lebih dari 24 jam sebelum masa sewa: dana dikembalikan penuh.",
      "Pembatalan kurang dari 24 jam: dikenakan potongan 50% dari tarif 1 hari sewa.",
      "Pembatalan pada hari pengambilan unit: dikenakan potongan 1 hari sewa penuh.",
    ],
  },
];

function HalamanSyarat() {
  return (
    <PublicShell>
      <PageHeader
        judul="Syarat & Ketentuan"
        deskripsi="Ketentuan berikut berlaku untuk seluruh penyewaan di Okta Car Rent dan menjadi bagian tak terpisahkan dari kontrak sewa."
      />

      <div className="mx-auto max-w-3xl px-4 py-10">
        <Accordion type="multiple" defaultValue={["0"]} className="space-y-3">
          {bagian.map((b, i) => (
            <AccordionItem
              key={b.judul}
              value={String(i)}
              className="rounded-lg border border-border bg-card px-4"
            >
              <AccordionTrigger className="text-left font-heading text-lg font-bold hover:no-underline">
                {b.judul}
              </AccordionTrigger>
              <AccordionContent>
                <ul className="list-disc space-y-2 pl-5 text-base text-muted-foreground">
                  {b.isi.map((baris) => (
                    <li key={baris}>{baris}</li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <p className="mt-8 rounded-lg border border-border bg-secondary p-4 text-base text-secondary-foreground">
          Ketentuan dapat berubah sewaktu-waktu. Ketentuan yang berlaku adalah yang tercantum pada
          kontrak sewa yang Anda tandatangani.
        </p>
      </div>
    </PublicShell>
  );
}