import { useState } from "react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { MasukanPenyewa, Penyewa } from "@/lib/renters";

const telepon = /^(\+62|62|0)8[1-9][0-9]{6,11}$/;

const skema = z.object({
  full_name: z.string().trim().min(3, "Nama lengkap wajib diisi (minimal 3 karakter)").max(100),
  phone: z
    .string()
    .trim()
    .regex(telepon, "Nomor HP tidak valid. Contoh: 081234567890"),
  email: z
    .string()
    .trim()
    .email("Format email tidak valid")
    .max(255)
    .nullable()
    .or(z.literal("").transform(() => null)),
  id_card_number: z
    .string()
    .trim()
    .regex(/^\d{16}$/, "Nomor KTP harus 16 digit angka")
    .nullable(),
  driving_license_number: z
    .string()
    .trim()
    .min(8, "Nomor SIM minimal 8 karakter")
    .max(20, "Nomor SIM maksimal 20 karakter")
    .nullable(),
  driving_license_expiry: z.string().nullable(),
  address: z.string().trim().max(300).nullable(),
  city: z.string().trim().max(80).nullable(),
  occupation: z.string().trim().max(80).nullable(),
  emergency_contact_name: z.string().trim().max(100).nullable(),
  emergency_contact_phone: z
    .string()
    .trim()
    .regex(telepon, "Nomor darurat tidak valid. Contoh: 081234567890")
    .nullable(),
  notes: z.string().trim().max(1000).nullable(),
});

type Nilai = Record<string, string>;

function awalDari(p?: Penyewa): Nilai {
  return {
    full_name: p?.full_name ?? "",
    phone: p?.phone ?? "",
    email: p?.email ?? "",
    id_card_number: p?.id_card_number ?? "",
    driving_license_number: p?.driving_license_number ?? "",
    driving_license_expiry: p?.driving_license_expiry ?? "",
    address: p?.address ?? "",
    city: p?.city ?? "",
    occupation: p?.occupation ?? "",
    emergency_contact_name: p?.emergency_contact_name ?? "",
    emergency_contact_phone: p?.emergency_contact_phone ?? "",
    notes: p?.notes ?? "",
  };
}

const teksAtauNull = (v: string): string | null => (v.trim() === "" ? null : v.trim());

export function FormPenyewa({
  awal,
  labelSimpan,
  mengirim,
  onSimpan,
  onBatal,
}: {
  awal?: Penyewa;
  labelSimpan: string;
  mengirim: boolean;
  onSimpan: (nilai: MasukanPenyewa) => void;
  onBatal: () => void;
}) {
  const [nilai, setNilai] = useState<Nilai>(() => awalDari(awal));
  const [galat, setGalat] = useState<Record<string, string>>({});

  function set(key: string, value: string) {
    setNilai((p) => ({ ...p, [key]: value }));
  }

  function kirim(e: React.FormEvent) {
    e.preventDefault();
    const kandidat = {
      full_name: nilai.full_name,
      phone: nilai.phone.replace(/[\s-]/g, ""),
      email: teksAtauNull(nilai.email),
      id_card_number: teksAtauNull(nilai.id_card_number.replace(/\s/g, "")),
      driving_license_number: teksAtauNull(nilai.driving_license_number),
      driving_license_expiry: teksAtauNull(nilai.driving_license_expiry),
      address: teksAtauNull(nilai.address),
      city: teksAtauNull(nilai.city),
      occupation: teksAtauNull(nilai.occupation),
      emergency_contact_name: teksAtauNull(nilai.emergency_contact_name),
      emergency_contact_phone: teksAtauNull(nilai.emergency_contact_phone),
      notes: teksAtauNull(nilai.notes),
    };

    const hasil = skema.safeParse(kandidat);
    if (!hasil.success) {
      const peta: Record<string, string> = {};
      for (const issue of hasil.error.issues) {
        const key = String(issue.path[0]);
        if (!peta[key]) peta[key] = issue.message;
      }
      setGalat(peta);
      document.getElementById(`f-${Object.keys(peta)[0]}`)?.focus();
      return;
    }

    setGalat({});
    onSimpan(hasil.data as MasukanPenyewa);
  }

  return (
    <form onSubmit={kirim} className="space-y-8" noValidate>
      <Bagian judul="Data Pribadi">
        <Teks id="full_name" label="Nama Lengkap" wajib nilai={nilai} set={set} galat={galat} />
        <Teks
          id="phone"
          label="Nomor HP"
          wajib
          nilai={nilai}
          set={set}
          galat={galat}
          petunjuk="Contoh: 081234567890"
        />
        <Teks id="email" label="Email" tipe="email" nilai={nilai} set={set} galat={galat} />
        <Teks id="occupation" label="Pekerjaan" nilai={nilai} set={set} galat={galat} />
        <Teks id="city" label="Kota" nilai={nilai} set={set} galat={galat} />
      </Bagian>

      <Bagian judul="Identitas & SIM">
        <Teks
          id="id_card_number"
          label="Nomor KTP"
          nilai={nilai}
          set={set}
          galat={galat}
          petunjuk="16 digit angka"
        />
        <Teks
          id="driving_license_number"
          label="Nomor SIM"
          nilai={nilai}
          set={set}
          galat={galat}
        />
        <Teks
          id="driving_license_expiry"
          label="Masa Berlaku SIM"
          tipe="date"
          nilai={nilai}
          set={set}
          galat={galat}
        />
      </Bagian>

      <Bagian judul="Kontak Darurat">
        <Teks
          id="emergency_contact_name"
          label="Nama Kontak Darurat"
          nilai={nilai}
          set={set}
          galat={galat}
        />
        <Teks
          id="emergency_contact_phone"
          label="Nomor Kontak Darurat"
          nilai={nilai}
          set={set}
          galat={galat}
        />
      </Bagian>

      <fieldset className="rounded-lg border border-border bg-card p-5">
        <legend className="px-2 font-heading text-lg font-bold text-foreground">
          Alamat & Catatan
        </legend>
        <div className="mt-2 grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="f-address" className="text-base">
              Alamat
            </Label>
            <Textarea
              id="f-address"
              value={nilai.address}
              onChange={(e) => set("address", e.target.value)}
              rows={3}
              className="text-base"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="f-notes" className="text-base">
              Catatan Internal
            </Label>
            <Textarea
              id="f-notes"
              value={nilai.notes}
              onChange={(e) => set("notes", e.target.value)}
              rows={3}
              className="text-base"
            />
          </div>
        </div>
      </fieldset>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button type="submit" size="lg" disabled={mengirim} className="text-base">
          {mengirim ? "Menyimpan…" : labelSimpan}
        </Button>
        <Button
          type="button"
          size="lg"
          variant="outline"
          onClick={onBatal}
          className="text-base"
          disabled={mengirim}
        >
          Batal
        </Button>
      </div>
    </form>
  );
}

function Bagian({ judul, children }: { judul: string; children: React.ReactNode }) {
  return (
    <fieldset className="rounded-lg border border-border bg-card p-5">
      <legend className="px-2 font-heading text-lg font-bold text-foreground">{judul}</legend>
      <div className="mt-2 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </fieldset>
  );
}

function Teks({
  id,
  label,
  nilai,
  set,
  galat,
  tipe = "text",
  wajib,
  petunjuk,
}: {
  id: string;
  label: string;
  nilai: Record<string, string>;
  set: (k: string, v: string) => void;
  galat: Record<string, string>;
  tipe?: string;
  wajib?: boolean;
  petunjuk?: string;
}) {
  const pesan = galat[id];
  return (
    <div className="space-y-2">
      <Label htmlFor={`f-${id}`} className="text-base">
        {label} {wajib && <span className="text-destructive">*</span>}
      </Label>
      <Input
        id={`f-${id}`}
        type={tipe}
        value={nilai[id]}
        onChange={(e) => set(id, e.target.value)}
        aria-invalid={pesan ? true : undefined}
        aria-describedby={pesan ? `e-${id}` : undefined}
        className="h-11 text-base"
      />
      {petunjuk && !pesan && <p className="text-sm text-muted-foreground">{petunjuk}</p>}
      {pesan && (
        <p id={`e-${id}`} role="alert" className="text-sm font-medium text-destructive">
          {pesan}
        </p>
      )}
    </div>
  );
}