import { createFileRoute } from "@tanstack/react-router";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { PageHeader, PublicShell } from "@/components/site/PublicShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/kontak")({
  head: () => ({
    meta: [
      { title: "Kontak & Lokasi — Okta Car Rent" },
      {
        name: "description",
        content:
          "Hubungi Okta Car Rent melalui telepon, WhatsApp, atau email untuk menanyakan ketersediaan unit dan memesan mobil sewa.",
      },
      { property: "og:title", content: "Kontak & Lokasi — Okta Car Rent" },
      {
        property: "og:description",
        content: "Alamat kantor, nomor telepon, dan formulir permintaan sewa.",
      },
    ],
  }),
  component: HalamanKontak,
});

const skema = z.object({
  nama: z.string().trim().min(3, "Nama minimal 3 karakter").max(100, "Nama terlalu panjang"),
  telepon: z
    .string()
    .trim()
    .min(8, "Nomor telepon minimal 8 digit")
    .max(20, "Nomor telepon terlalu panjang")
    .regex(/^[0-9+()\-\s]+$/, "Nomor telepon hanya boleh berisi angka"),
  email: z.string().trim().email("Alamat email tidak valid").max(255).or(z.literal("")),
  pesan: z.string().trim().min(10, "Pesan minimal 10 karakter").max(1000, "Pesan maksimal 1000 karakter"),
});

const WHATSAPP = "6281200001234";

function HalamanKontak() {
  const [form, setForm] = useState({ nama: "", telepon: "", email: "", pesan: "" });
  const [galat, setGalat] = useState<Record<string, string>>({});

  function kirim(e: React.FormEvent) {
    e.preventDefault();
    const hasil = skema.safeParse(form);
    if (!hasil.success) {
      const map: Record<string, string> = {};
      for (const issue of hasil.error.issues) map[String(issue.path[0])] = issue.message;
      setGalat(map);
      toast.error("Mohon periksa kembali isian formulir.");
      return;
    }
    setGalat({});
    const d = hasil.data;
    const teks = `Halo Okta Car Rent, saya ${d.nama} (${d.telepon}${d.email ? `, ${d.email}` : ""}).\n\n${d.pesan}`;
    window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(teks)}`, "_blank", "noopener");
    toast.success("Pesan disiapkan di WhatsApp. Silakan tekan kirim di sana.");
  }

  return (
    <PublicShell>
      <PageHeader
        judul="Kontak & Lokasi"
        deskripsi="Tim kami siap membantu memilih unit yang sesuai dan mengecek ketersediaan tanggal sewa Anda."
      />

      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-xl">Kirim Permintaan Sewa</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={kirim} className="space-y-4" noValidate>
              <div className="space-y-1.5">
                <Label htmlFor="nama" className="text-base">Nama lengkap</Label>
                <Input
                  id="nama"
                  value={form.nama}
                  maxLength={100}
                  onChange={(e) => setForm({ ...form, nama: e.target.value })}
                  className="h-11 text-base"
                />
                {galat.nama ? <p className="text-base text-destructive">{galat.nama}</p> : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="telepon" className="text-base">Nomor telepon / WhatsApp</Label>
                <Input
                  id="telepon"
                  inputMode="tel"
                  value={form.telepon}
                  maxLength={20}
                  onChange={(e) => setForm({ ...form, telepon: e.target.value })}
                  className="h-11 text-base"
                />
                {galat.telepon ? <p className="text-base text-destructive">{galat.telepon}</p> : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-base">Email (opsional)</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  maxLength={255}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="h-11 text-base"
                />
                {galat.email ? <p className="text-base text-destructive">{galat.email}</p> : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pesan" className="text-base">Kebutuhan sewa</Label>
                <Textarea
                  id="pesan"
                  rows={5}
                  maxLength={1000}
                  placeholder="Contoh: Butuh Avanza matic tanggal 5–8 bulan depan, lepas kunci, diambil di kantor."
                  value={form.pesan}
                  onChange={(e) => setForm({ ...form, pesan: e.target.value })}
                  className="text-base"
                />
                {galat.pesan ? <p className="text-base text-destructive">{galat.pesan}</p> : null}
              </div>

              <Button type="submit" size="lg" className="w-full text-base">
                Kirim lewat WhatsApp
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-xl">Informasi Kontak</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-4 text-base">
                <li className="flex items-start gap-3">
                  <MapPin className="mt-0.5 size-5 shrink-0 text-primary" />
                  <span>
                    <strong className="block">Kantor Okta Car Rent</strong>
                    <span className="text-muted-foreground">
                      Jl. Raya Pasar Minggu No. 88, Jakarta Selatan 12520
                    </span>
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Phone className="mt-0.5 size-5 shrink-0 text-primary" />
                  <span>
                    <strong className="block">Telepon / WhatsApp</strong>
                    <a href="tel:+622150001234" className="text-muted-foreground hover:text-primary">
                      (021) 5000-1234
                    </a>{" "}
                    ·{" "}
                    <a
                      href={`https://wa.me/${WHATSAPP}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-primary"
                    >
                      0812-0000-1234
                    </a>
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Mail className="mt-0.5 size-5 shrink-0 text-primary" />
                  <span>
                    <strong className="block">Email</strong>
                    <a
                      href="mailto:halo@oktacarrent.id"
                      className="text-muted-foreground hover:text-primary"
                    >
                      halo@oktacarrent.id
                    </a>
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Clock className="mt-0.5 size-5 shrink-0 text-primary" />
                  <span>
                    <strong className="block">Jam Operasional</strong>
                    <span className="text-muted-foreground">
                      Senin–Jumat 08.00–20.00 · Sabtu–Minggu 08.00–17.00 WIB
                    </span>
                  </span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-primary">
            <CardContent className="pt-6">
              <h2 className="font-heading text-lg font-bold">Sudah menjadi pelanggan?</h2>
              <p className="mt-1.5 text-base text-muted-foreground">
                Masuk ke akun Anda untuk melihat kontrak sewa yang sedang berjalan, tagihan, dan
                status pengembalian uang jaminan.
              </p>
              <Button asChild size="lg" variant="outline" className="mt-4 text-base">
                <a href="/auth">Masuk ke Akun</a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </PublicShell>
  );
}