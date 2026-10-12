import { useState } from "react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  OPSI_BAHAN_BAKAR,
  OPSI_KATEGORI,
  OPSI_STATUS,
  OPSI_TRANSMISI,
  type Kendaraan,
  type MasukanKendaraan,
} from "@/lib/vehicles";

const tahunIni = new Date().getFullYear();

const skema = z.object({
  brand: z.string().trim().min(2, "Merek wajib diisi (minimal 2 karakter)").max(50),
  model: z.string().trim().min(1, "Model wajib diisi").max(50),
  variant: z.string().trim().max(50).optional().or(z.literal("")),
  year: z
    .number({ message: "Tahun wajib diisi" })
    .int("Tahun harus bilangan bulat")
    .min(1990, "Tahun minimal 1990")
    .max(tahunIni + 1, `Tahun maksimal ${tahunIni + 1}`),
  plate_number: z
    .string()
    .trim()
    .min(3, "Nomor polisi wajib diisi")
    .max(15, "Nomor polisi terlalu panjang")
    .regex(/^[A-Z0-9 ]+$/i, "Nomor polisi hanya boleh huruf, angka, dan spasi"),
  color: z.string().trim().min(2, "Warna wajib diisi").max(30),
  transmission: z.string().min(1, "Transmisi wajib dipilih"),
  fuel_type: z.string().min(1, "Bahan bakar wajib dipilih"),
  seat_capacity: z.number().int().min(2, "Kapasitas minimal 2 kursi").max(60),
  category: z.string().min(1, "Kategori wajib dipilih"),
  current_odometer: z.number().int().min(0, "Kilometer tidak boleh negatif"),
  daily_rate: z.number().positive("Tarif harian harus lebih dari 0"),
  weekly_rate: z.number().min(0).nullable(),
  monthly_rate: z.number().min(0).nullable(),
  deposit_amount: z.number().min(0, "Deposit tidak boleh negatif"),
  status: z.string().min(1),
  purchase_price: z.number().min(0).nullable(),
  purchase_date: z.string().nullable(),
  insurance_provider: z.string().trim().max(80).nullable(),
  insurance_policy_number: z.string().trim().max(60).nullable(),
  insurance_expiry: z.string().nullable(),
  stnk_expiry: z.string().nullable(),
  tax_due_date: z.string().nullable(),
  notes: z.string().trim().max(1000).nullable(),
});

type Nilai = Record<string, string>;

function awalDari(k?: Kendaraan): Nilai {
  return {
    brand: k?.brand ?? "",
    model: k?.model ?? "",
    variant: k?.variant ?? "",
    year: k ? String(k.year) : String(tahunIni),
    plate_number: k?.plate_number ?? "",
    color: k?.color ?? "",
    transmission: k?.transmission ?? "Manual",
    fuel_type: k?.fuel_type ?? "Bensin",
    seat_capacity: k ? String(k.seat_capacity) : "5",
    category: k?.category ?? "MPV",
    current_odometer: k ? String(k.current_odometer) : "0",
    daily_rate: k ? String(k.daily_rate) : "",
    weekly_rate: k?.weekly_rate != null ? String(k.weekly_rate) : "",
    monthly_rate: k?.monthly_rate != null ? String(k.monthly_rate) : "",
    deposit_amount: k ? String(k.deposit_amount) : "0",
    status: k?.status ?? "tersedia",
    purchase_date: k?.purchase_date ?? "",
    purchase_price: k?.purchase_price != null ? String(k.purchase_price) : "",
    insurance_provider: k?.insurance_provider ?? "",
    insurance_policy_number: k?.insurance_policy_number ?? "",
    insurance_expiry: k?.insurance_expiry ?? "",
    stnk_expiry: k?.stnk_expiry ?? "",
    tax_due_date: k?.tax_due_date ?? "",
    notes: k?.notes ?? "",
  };
}

const angka = (v: string): number => Number(String(v).replace(/[^\d.-]/g, "") || 0);
const angkaAtauNull = (v: string): number | null => (v.trim() === "" ? null : angka(v));
const teksAtauNull = (v: string): string | null => (v.trim() === "" ? null : v.trim());

export function FormKendaraan({
  awal,
  labelSimpan,
  mengirim,
  onSimpan,
  onBatal,
}: {
  awal?: Kendaraan;
  labelSimpan: string;
  mengirim: boolean;
  onSimpan: (nilai: MasukanKendaraan) => void;
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
      brand: nilai.brand,
      model: nilai.model,
      variant: nilai.variant,
      year: angka(nilai.year),
      plate_number: nilai.plate_number.toUpperCase(),
      color: nilai.color,
      transmission: nilai.transmission,
      fuel_type: nilai.fuel_type,
      seat_capacity: angka(nilai.seat_capacity),
      category: nilai.category,
      current_odometer: angka(nilai.current_odometer),
      daily_rate: angka(nilai.daily_rate),
      weekly_rate: angkaAtauNull(nilai.weekly_rate),
      monthly_rate: angkaAtauNull(nilai.monthly_rate),
      deposit_amount: angka(nilai.deposit_amount),
      status: nilai.status,
      purchase_date: teksAtauNull(nilai.purchase_date),
      purchase_price: angkaAtauNull(nilai.purchase_price),
      insurance_provider: teksAtauNull(nilai.insurance_provider),
      insurance_policy_number: teksAtauNull(nilai.insurance_policy_number),
      insurance_expiry: teksAtauNull(nilai.insurance_expiry),
      stnk_expiry: teksAtauNull(nilai.stnk_expiry),
      tax_due_date: teksAtauNull(nilai.tax_due_date),
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
      const pertama = document.getElementById(`f-${Object.keys(peta)[0]}`);
      pertama?.focus();
      return;
    }

    setGalat({});
    const bersih = hasil.data;
    onSimpan({
      ...bersih,
      variant: teksAtauNull(bersih.variant ?? ""),
      status: bersih.status as MasukanKendaraan["status"],
    });
  }

  return (
    <form onSubmit={kirim} className="space-y-8" noValidate>
      <Bagian judul="Identitas Kendaraan">
        <Teks id="brand" label="Merek" wajib nilai={nilai} set={set} galat={galat} />
        <Teks id="model" label="Model" wajib nilai={nilai} set={set} galat={galat} />
        <Teks id="variant" label="Varian" nilai={nilai} set={set} galat={galat} />
        <Teks id="year" label="Tahun" wajib tipe="number" nilai={nilai} set={set} galat={galat} />
        <Teks
          id="plate_number"
          label="Nomor Polisi"
          wajib
          nilai={nilai}
          set={set}
          galat={galat}
          petunjuk="Contoh: B 1234 XYZ"
        />
        <Teks id="color" label="Warna" wajib nilai={nilai} set={set} galat={galat} />
        <Pilih
          id="transmission"
          label="Transmisi"
          opsi={OPSI_TRANSMISI.map((o) => ({ value: o, label: o }))}
          nilai={nilai}
          set={set}
          galat={galat}
        />
        <Pilih
          id="fuel_type"
          label="Bahan Bakar"
          opsi={OPSI_BAHAN_BAKAR.map((o) => ({ value: o, label: o }))}
          nilai={nilai}
          set={set}
          galat={galat}
        />
        <Teks
          id="seat_capacity"
          label="Kapasitas Kursi"
          wajib
          tipe="number"
          nilai={nilai}
          set={set}
          galat={galat}
        />
        <Pilih
          id="category"
          label="Kategori"
          opsi={OPSI_KATEGORI.map((o) => ({ value: o, label: o }))}
          nilai={nilai}
          set={set}
          galat={galat}
        />
        <Teks
          id="current_odometer"
          label="Kilometer Saat Ini"
          tipe="number"
          nilai={nilai}
          set={set}
          galat={galat}
        />
        <Pilih
          id="status"
          label="Status"
          opsi={OPSI_STATUS.map((o) => ({ value: o.value, label: o.label }))}
          nilai={nilai}
          set={set}
          galat={galat}
        />
      </Bagian>

      <Bagian judul="Tarif & Deposit">
        <Teks
          id="daily_rate"
          label="Tarif Harian (Rp)"
          wajib
          tipe="number"
          nilai={nilai}
          set={set}
          galat={galat}
        />
        <Teks id="weekly_rate" label="Tarif Mingguan (Rp)" tipe="number" nilai={nilai} set={set} galat={galat} />
        <Teks id="monthly_rate" label="Tarif Bulanan (Rp)" tipe="number" nilai={nilai} set={set} galat={galat} />
        <Teks
          id="deposit_amount"
          label="Deposit (Rp)"
          tipe="number"
          nilai={nilai}
          set={set}
          galat={galat}
        />
      </Bagian>

      <Bagian judul="Kepemilikan & Dokumen">
        <Teks id="purchase_date" label="Tanggal Pembelian" tipe="date" nilai={nilai} set={set} galat={galat} />
        <Teks id="purchase_price" label="Harga Beli (Rp)" tipe="number" nilai={nilai} set={set} galat={galat} />
        <Teks id="insurance_provider" label="Penyedia Asuransi" nilai={nilai} set={set} galat={galat} />
        <Teks id="insurance_policy_number" label="Nomor Polis Asuransi" nilai={nilai} set={set} galat={galat} />
        <Teks id="insurance_expiry" label="Masa Berlaku Asuransi" tipe="date" nilai={nilai} set={set} galat={galat} />
        <Teks id="stnk_expiry" label="Masa Berlaku STNK" tipe="date" nilai={nilai} set={set} galat={galat} />
        <Teks id="tax_due_date" label="Jatuh Tempo Pajak" tipe="date" nilai={nilai} set={set} galat={galat} />
      </Bagian>

      <div className="space-y-2">
        <Label htmlFor="f-notes" className="text-base">
          Catatan
        </Label>
        <Textarea
          id="f-notes"
          value={nilai.notes}
          onChange={(e) => set("notes", e.target.value)}
          rows={4}
          className="text-base"
          placeholder="Catatan kondisi kendaraan, kelengkapan, atau informasi lain."
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <Button type="submit" size="lg" className="text-base" disabled={mengirim}>
          {mengirim ? "Menyimpan…" : labelSimpan}
        </Button>
        <Button type="button" variant="outline" size="lg" className="text-base" onClick={onBatal}>
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
        inputMode={tipe === "number" ? "numeric" : undefined}
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

function Pilih({
  id,
  label,
  opsi,
  nilai,
  set,
  galat,
}: {
  id: string;
  label: string;
  opsi: { value: string; label: string }[];
  nilai: Record<string, string>;
  set: (k: string, v: string) => void;
  galat: Record<string, string>;
}) {
  const pesan = galat[id];
  return (
    <div className="space-y-2">
      <Label htmlFor={`f-${id}`} className="text-base">
        {label}
      </Label>
      <Select value={nilai[id]} onValueChange={(v) => set(id, v)}>
        <SelectTrigger id={`f-${id}`} className="h-11 text-base">
          <SelectValue placeholder={`Pilih ${label.toLowerCase()}`} />
        </SelectTrigger>
        <SelectContent>
          {opsi.map((o) => (
            <SelectItem key={o.value} value={o.value} className="text-base">
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {pesan && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {pesan}
        </p>
      )}
    </div>
  );
}