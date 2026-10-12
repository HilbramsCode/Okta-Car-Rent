import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Check } from "lucide-react";

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
import { formatRupiah, formatTanggalSingkat } from "@/lib/format";
import {
  ambilUnitTersedia,
  cekKelayakanPenyewa,
  hitungBiaya,
  hitungDurasi,
  OPSI_SOPIR,
  OPSI_TIPE_SEWA,
  tarifDariSnapshot,
  type Kontrak,
  type MasukanBuatKontrak,
  type TipeSewa,
} from "@/lib/contracts";
import { ambilDaftarPenyewa, filterPenyewaAwal } from "@/lib/renters";

const LANGKAH = ["Penyewa", "Unit & Tanggal", "Tarif & Biaya", "Ringkasan"];

type Nilai = {
  renter_id: string;
  vehicle_id: string;
  rental_type: TipeSewa;
  start_date: string;
  end_date: string;
  base_rate: string;
  discount_amount: string;
  additional_charges: string;
  deposit_amount: string;
  late_fee_per_day: string;
  driver_option: string;
  pickup_location: string;
  return_location: string;
  terms_notes: string;
  override_reason: string;
};

function awalDari(k?: Kontrak): Nilai {
  const hariIni = new Date().toISOString().slice(0, 10);
  return {
    renter_id: k?.renter_id ?? "",
    vehicle_id: k?.vehicle_id ?? "",
    rental_type: (k?.rental_type ?? "harian") as TipeSewa,
    start_date: k?.start_date ?? hariIni,
    end_date: k?.end_date ?? hariIni,
    base_rate: String(k?.base_rate ?? ""),
    discount_amount: String(k?.discount_amount ?? 0),
    additional_charges: String(k?.additional_charges ?? 0),
    deposit_amount: String(k?.deposit_amount ?? ""),
    late_fee_per_day: String(k?.late_fee_per_day ?? 100000),
    driver_option: k?.driver_option ?? "lepas_kunci",
    pickup_location: k?.pickup_location ?? "Kantor Okta Car Rent",
    return_location: k?.return_location ?? "Kantor Okta Car Rent",
    terms_notes: k?.terms_notes ?? "",
    override_reason: "",
  };
}

const angka = (v: string): number => {
  const n = Number(String(v).replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

export function FormKontrak({
  awal,
  labelSimpan,
  mengirim,
  bolehMenimpa,
  onSimpan,
  onBatal,
}: {
  awal?: Kontrak;
  labelSimpan: string;
  mengirim: boolean;
  bolehMenimpa: boolean;
  onSimpan: (nilai: MasukanBuatKontrak) => void;
  onBatal: () => void;
}) {
  const [langkah, setLangkah] = useState(0);
  const [nilai, setNilai] = useState<Nilai>(() => awalDari(awal));
  const [galat, setGalat] = useState<string | null>(null);

  function set<K extends keyof Nilai>(key: K, value: Nilai[K]) {
    setNilai((p) => ({ ...p, [key]: value }));
  }

  const penyewa = useQuery({
    queryKey: ["kontrak-penyewa-pilihan"],
    queryFn: () => ambilDaftarPenyewa({ ...filterPenyewaAwal, perHalaman: 500 }),
  });

  const kelayakan = useQuery({
    queryKey: ["kontrak-kelayakan", nilai.renter_id, nilai.start_date, nilai.end_date],
    queryFn: () => cekKelayakanPenyewa(nilai.renter_id, nilai.start_date, nilai.end_date),
    enabled: nilai.renter_id !== "",
    retry: false,
  });

  // Pesan peringatan lama tidak boleh tertinggal setelah penyewa atau hasil pemeriksaan berubah.
  useEffect(() => {
    setGalat(null);
  }, [nilai.renter_id, kelayakan.data, kelayakan.status]);

  const unit = useQuery({
    queryKey: ["kontrak-unit-tersedia", nilai.start_date, nilai.end_date, awal?.id],
    queryFn: () => ambilUnitTersedia(nilai.start_date, nilai.end_date, awal?.id),
    enabled: nilai.start_date !== "" && nilai.end_date !== "",
  });

  const unitTerpilih = useMemo(
    () => (unit.data ?? []).find((u) => u.id === nilai.vehicle_id) ?? null,
    [unit.data, nilai.vehicle_id],
  );

  // Snapshot tarif & deposit mengikuti unit dan jenis sewa yang dipilih.
  useEffect(() => {
    if (!unitTerpilih) return;
    const tarif = tarifDariSnapshot(nilai.rental_type, {
      daily: unitTerpilih.daily_rate,
      weekly: unitTerpilih.weekly_rate,
      monthly: unitTerpilih.monthly_rate,
    });
    setNilai((p) => ({
      ...p,
      base_rate: String(tarif),
      deposit_amount: p.deposit_amount === "" ? String(unitTerpilih.deposit_amount) : p.deposit_amount,
    }));
  }, [unitTerpilih, nilai.rental_type]);

  const durasi = hitungDurasi(nilai.start_date, nilai.end_date, nilai.rental_type);
  const biaya = hitungBiaya(
    angka(nilai.base_rate),
    durasi,
    angka(nilai.discount_amount),
    angka(nilai.additional_charges),
  );

  const blocks = kelayakan.data?.blocks ?? [];
  const perluPenimpaan = blocks.length > 0;

  function validasiLangkah(l: number): string | null {
    if (l === 0) {
      if (!nilai.renter_id) return "Pilih penyewa terlebih dahulu.";
      if (kelayakan.isPending) return "Memeriksa kelayakan penyewa…";
      if (kelayakan.isError) return "Pemeriksaan kelayakan gagal. Coba lagi.";
      if (perluPenimpaan && !bolehMenimpa) {
        return "Penyewa belum memenuhi syarat. Hanya pemilik yang dapat menimpa aturan ini.";
      }
      if (perluPenimpaan && nilai.override_reason.trim().length < 10) {
        return "Alasan penimpaan wajib diisi minimal 10 karakter.";
      }
    }
    if (l === 1) {
      if (!nilai.start_date || !nilai.end_date) return "Tanggal mulai dan selesai wajib diisi.";
      if (nilai.end_date < nilai.start_date) return "Tanggal selesai harus setelah tanggal mulai.";
      if (!nilai.vehicle_id) return "Pilih unit kendaraan.";
    }
    if (l === 2) {
      if (angka(nilai.base_rate) <= 0) return "Tarif sewa harus lebih dari nol.";
      if (angka(nilai.discount_amount) > biaya.subtotal) return "Diskon melebihi subtotal.";
      if (angka(nilai.deposit_amount) < 0) return "Deposit tidak boleh negatif.";
    }
    return null;
  }

  function lanjut() {
    const pesan = validasiLangkah(langkah);
    if (pesan) {
      setGalat(pesan);
      return;
    }
    setGalat(null);
    setLangkah((l) => Math.min(LANGKAH.length - 1, l + 1));
  }

  function kirim() {
    for (let i = 0; i < LANGKAH.length - 1; i++) {
      const pesan = validasiLangkah(i);
      if (pesan) {
        setGalat(pesan);
        setLangkah(i);
        return;
      }
    }
    setGalat(null);
    onSimpan({
      renter_id: nilai.renter_id,
      vehicle_id: nilai.vehicle_id,
      rental_type: nilai.rental_type,
      start_date: nilai.start_date,
      end_date: nilai.end_date,
      duration_qty: durasi,
      base_rate: angka(nilai.base_rate),
      discount_amount: angka(nilai.discount_amount),
      additional_charges: angka(nilai.additional_charges),
      deposit_amount: angka(nilai.deposit_amount),
      late_fee_per_day: angka(nilai.late_fee_per_day),
      driver_option: nilai.driver_option,
      pickup_location: nilai.pickup_location.trim(),
      return_location: nilai.return_location.trim(),
      terms_notes: nilai.terms_notes.trim() === "" ? null : nilai.terms_notes.trim(),
      override_type: perluPenimpaan ? "pembuatan_kontrak" : null,
      override_reason: perluPenimpaan ? nilai.override_reason.trim() : null,
    });
  }

  const daftarPenyewa = penyewa.data?.baris ?? [];
  const penyewaTerpilih = daftarPenyewa.find((p) => p.id === nilai.renter_id);

  return (
    <div className="space-y-6">
      <ol className="flex flex-wrap gap-2">
        {LANGKAH.map((l, i) => (
          <li key={l}>
            <span
              className={`inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-base font-semibold ${
                i === langkah
                  ? "border-primary bg-primary/10 text-primary"
                  : i < langkah
                    ? "border-success/40 bg-success/10 text-success"
                    : "border-border bg-card text-muted-foreground"
              }`}
            >
              {i < langkah ? <Check className="size-4" /> : <span>{i + 1}.</span>} {l}
            </span>
          </li>
        ))}
      </ol>

      {galat && (
        <p
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-base font-medium text-destructive"
        >
          {galat}
        </p>
      )}

      <div className="rounded-lg border border-border bg-card p-5">
        {langkah === 0 && (
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="f-penyewa" className="text-base">
                Penyewa <span className="text-destructive">*</span>
              </Label>
              <Select value={nilai.renter_id} onValueChange={(v) => set("renter_id", v)}>
                <SelectTrigger id="f-penyewa" className="h-11 text-base">
                  <SelectValue placeholder="Pilih penyewa" />
                </SelectTrigger>
                <SelectContent>
                  {daftarPenyewa.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-base">
                      {p.full_name} — {p.phone}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {nilai.renter_id !== "" && kelayakan.isPending && (
              <p role="status" className="text-base text-muted-foreground">
                Memeriksa kelayakan penyewa…
              </p>
            )}
            {nilai.renter_id !== "" && kelayakan.isError && (
              <div className="flex flex-wrap items-center gap-3 rounded-md border border-destructive/30 bg-destructive/10 p-3">
                <p className="text-base font-medium text-destructive">
                  Pemeriksaan kelayakan gagal.
                </p>
                <Button type="button" variant="outline" size="sm" onClick={() => kelayakan.refetch()}>
                  Coba lagi
                </Button>
              </div>
            )}


            {penyewaTerpilih && kelayakan.data && (
              <div className="space-y-3">
                {blocks.length === 0 ? (
                  <p className="rounded-md border border-success/30 bg-success/10 p-3 text-base font-medium text-success">
                    Penyewa memenuhi syarat untuk membuat kontrak.
                  </p>
                ) : (
                  <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3">
                    <p className="flex items-center gap-2 text-base font-semibold text-destructive">
                      <AlertTriangle className="size-4" /> Penyewa belum memenuhi syarat
                    </p>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-base text-destructive">
                      {blocks.map((b) => (
                        <li key={b}>{b}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {(kelayakan.data.warnings ?? []).map((w) => (
                  <p
                    key={w}
                    className="rounded-md border border-warning/40 bg-warning/15 p-3 text-base text-warning-foreground"
                  >
                    {w}
                  </p>
                ))}
                {perluPenimpaan && bolehMenimpa && (
                  <div className="space-y-2">
                    <Label htmlFor="f-override" className="text-base">
                      Alasan Penimpaan Pemilik <span className="text-destructive">*</span>
                    </Label>
                    <Textarea
                      id="f-override"
                      rows={3}
                      className="text-base"
                      value={nilai.override_reason}
                      onChange={(e) => set("override_reason", e.target.value)}
                      placeholder="Contoh: Pelanggan lama, tunggakan akan dilunasi saat serah terima."
                    />
                    <p className="text-sm text-muted-foreground">
                      Alasan wajib diisi dan tercatat pada log audit.
                    </p>
                  </div>
                )}
                {perluPenimpaan && !bolehMenimpa && (
                  <p className="text-base text-muted-foreground">
                    Hubungi pemilik untuk melakukan penimpaan aturan ini.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {langkah === 1 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="f-tipe" className="text-base">
                Jenis Sewa <span className="text-destructive">*</span>
              </Label>
              <Select
                value={nilai.rental_type}
                onValueChange={(v) => set("rental_type", v as TipeSewa)}
              >
                <SelectTrigger id="f-tipe" className="h-11 text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OPSI_TIPE_SEWA.map((o) => (
                    <SelectItem key={o.value} value={o.value} className="text-base">
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="f-sopir" className="text-base">
                Opsi Sopir
              </Label>
              <Select
                value={nilai.driver_option}
                onValueChange={(v) => set("driver_option", v)}
              >
                <SelectTrigger id="f-sopir" className="h-11 text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OPSI_SOPIR.map((o) => (
                    <SelectItem key={o.value} value={o.value} className="text-base">
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="f-mulai" className="text-base">
                Tanggal Mulai <span className="text-destructive">*</span>
              </Label>
              <Input
                id="f-mulai"
                type="date"
                className="h-11 text-base"
                value={nilai.start_date}
                onChange={(e) => set("start_date", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="f-selesai" className="text-base">
                Tanggal Selesai <span className="text-destructive">*</span>
              </Label>
              <Input
                id="f-selesai"
                type="date"
                className="h-11 text-base"
                value={nilai.end_date}
                onChange={(e) => set("end_date", e.target.value)}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="f-unit" className="text-base">
                Unit Kendaraan <span className="text-destructive">*</span>
              </Label>
              <Select value={nilai.vehicle_id} onValueChange={(v) => set("vehicle_id", v)}>
                <SelectTrigger id="f-unit" className="h-11 text-base">
                  <SelectValue
                    placeholder={
                      unit.isLoading ? "Memuat unit…" : "Pilih unit yang tersedia pada tanggal ini"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {(unit.data ?? []).map((u) => (
                    <SelectItem key={u.id} value={u.id} className="text-base">
                      {u.brand} {u.model} — {u.plate_number} ({formatRupiah(u.daily_rate)}/hari)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Hanya unit tanpa jadwal bentrok pada {formatTanggalSingkat(nilai.start_date)} –{" "}
                {formatTanggalSingkat(nilai.end_date)} yang ditampilkan.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="f-ambil" className="text-base">
                Lokasi Pengambilan
              </Label>
              <Input
                id="f-ambil"
                className="h-11 text-base"
                value={nilai.pickup_location}
                onChange={(e) => set("pickup_location", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="f-kembali" className="text-base">
                Lokasi Pengembalian
              </Label>
              <Input
                id="f-kembali"
                className="h-11 text-base"
                value={nilai.return_location}
                onChange={(e) => set("return_location", e.target.value)}
              />
            </div>
          </div>
        )}

        {langkah === 2 && (
          <div className="grid gap-4 sm:grid-cols-2">
            {unitTerpilih && (
              <p className="sm:col-span-2 rounded-md border border-border bg-muted/40 p-3 text-base text-muted-foreground">
                Tarif tersimpan sebagai salinan harga saat kontrak dibuat: harian{" "}
                {formatRupiah(unitTerpilih.daily_rate)}, mingguan{" "}
                {formatRupiah(unitTerpilih.weekly_rate ?? 0)}, bulanan{" "}
                {formatRupiah(unitTerpilih.monthly_rate ?? 0)}.
              </p>
            )}
            <Uang id="base_rate" label="Tarif per Periode" nilai={nilai} set={set} wajib />
            <Uang id="discount_amount" label="Diskon" nilai={nilai} set={set} />
            <Uang id="additional_charges" label="Biaya Tambahan" nilai={nilai} set={set} />
            <Uang id="deposit_amount" label="Deposit" nilai={nilai} set={set} wajib />
            <Uang id="late_fee_per_day" label="Denda Keterlambatan / Hari" nilai={nilai} set={set} />
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="f-catatan" className="text-base">
                Catatan / Ketentuan Khusus
              </Label>
              <Textarea
                id="f-catatan"
                rows={3}
                className="text-base"
                value={nilai.terms_notes}
                onChange={(e) => set("terms_notes", e.target.value)}
              />
            </div>
          </div>
        )}

        {langkah === 3 && (
          <dl className="grid gap-3 sm:grid-cols-2">
            <Baris label="Penyewa" nilai={penyewaTerpilih?.full_name ?? "-"} />
            <Baris
              label="Unit"
              nilai={
                unitTerpilih
                  ? `${unitTerpilih.brand} ${unitTerpilih.model} (${unitTerpilih.plate_number})`
                  : "-"
              }
            />
            <Baris
              label="Periode"
              nilai={`${formatTanggalSingkat(nilai.start_date)} – ${formatTanggalSingkat(nilai.end_date)}`}
            />
            <Baris
              label="Durasi"
              nilai={`${durasi} ${nilai.rental_type === "bulanan" ? "bulan" : nilai.rental_type === "mingguan" ? "minggu" : "hari"}`}
            />
            <Baris label="Subtotal" nilai={formatRupiah(biaya.subtotal)} />
            <Baris label="Diskon" nilai={formatRupiah(biaya.diskon)} />
            <Baris label="Biaya Tambahan" nilai={formatRupiah(biaya.biayaTambahan)} />
            <Baris label="Deposit" nilai={formatRupiah(angka(nilai.deposit_amount))} />
            <div className="sm:col-span-2 rounded-md border border-primary/30 bg-primary/10 p-4">
              <dt className="text-base font-medium text-foreground">Total Tagihan Sewa</dt>
              <dd className="font-heading text-2xl font-bold text-primary">
                {formatRupiah(biaya.total)}
              </dd>
            </div>
            {perluPenimpaan && (
              <p className="sm:col-span-2 rounded-md border border-warning/40 bg-warning/15 p-3 text-base text-warning-foreground">
                Kontrak dibuat dengan penimpaan pemilik. Alasan: {nilai.override_reason}
              </p>
            )}
          </dl>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        {langkah > 0 && (
          <Button
            type="button"
            size="lg"
            variant="outline"
            className="text-base"
            onClick={() => setLangkah((l) => l - 1)}
            disabled={mengirim}
          >
            Kembali
          </Button>
        )}
        {langkah < LANGKAH.length - 1 ? (
          <Button
            type="button"
            size="lg"
            className="text-base"
            onClick={lanjut}
            disabled={
              langkah === 0 &&
              nilai.renter_id !== "" &&
              (kelayakan.isPending || kelayakan.isError)
            }
          >
            Lanjut
          </Button>
        ) : (
          <Button
            type="button"
            size="lg"
            className="text-base"
            onClick={kirim}
            disabled={mengirim}
          >
            {mengirim ? "Menyimpan…" : labelSimpan}
          </Button>
        )}
        <Button
          type="button"
          size="lg"
          variant="outline"
          className="text-base"
          onClick={onBatal}
          disabled={mengirim}
        >
          Batal
        </Button>
      </div>
    </div>
  );
}

function Baris({ label, nilai }: { label: string; nilai: string }) {
  return (
    <div className="rounded-md border border-border p-3">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-base font-semibold text-foreground">{nilai}</dd>
    </div>
  );
}

function Uang({
  id,
  label,
  nilai,
  set,
  wajib,
}: {
  id: keyof Nilai;
  label: string;
  nilai: Nilai;
  set: <K extends keyof Nilai>(k: K, v: Nilai[K]) => void;
  wajib?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={`f-${String(id)}`} className="text-base">
        {label} {wajib && <span className="text-destructive">*</span>}
      </Label>
      <Input
        id={`f-${String(id)}`}
        type="number"
        min={0}
        step={1000}
        className="h-11 text-base"
        value={nilai[id] as string}
        onChange={(e) => set(id, e.target.value as Nilai[typeof id])}
      />
      <p className="text-sm text-muted-foreground">{formatRupiah(Number(nilai[id] || 0))}</p>
    </div>
  );
}