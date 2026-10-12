import { supabase } from "@/integrations/supabase/client";
import { formatRupiah, formatTanggalSingkat } from "@/lib/format";
import {
  labelMetodeBayar,
  labelTipeSewa,
  statusDeposit,
  statusKendaraan,
  statusKontrak,
  statusPembayaran,
  statusPerawatan,
  statusTunggakan,
  statusVerifikasi,
  ambilLabel,
} from "@/lib/labels";
import { labelJenisPekerjaan, labelKategori } from "@/lib/maintenance";

const sel = (s: string): string => s;

export type TipeKolom = "teks" | "uang" | "angka" | "tanggal" | "persen";
export type Kolom = { key: string; label: string; tipe: TipeKolom };
export type BarisLaporan = Record<string, string | number | null>;

export type FilterLaporan = { dari: string; sampai: string; cari: string; status: string };

export type DefinisiLaporan = {
  key: string;
  judul: string;
  deskripsi: string;
  hanyaPemilik: boolean;
  pakaiPeriode: boolean;
  opsiStatus: { value: string; label: string }[];
  kolom: Kolom[];
  ambil: (f: FilterLaporan) => Promise<BarisLaporan[]>;
};

function galat(pesan: string): never {
  throw new Error(pesan);
}

function cocok(nilai: unknown, cari: string): boolean {
  if (!cari) return true;
  return String(nilai ?? "").toLowerCase().includes(cari.toLowerCase());
}

function opsi(map: Record<string, { label: string }>): { value: string; label: string }[] {
  return Object.entries(map).map(([value, v]) => ({ value, label: v.label }));
}

/* ============================ Laporan ============================ */

type BarisPembayaran = {
  id: string;
  invoice_number: string;
  receipt_number: string | null;
  payment_date: string;
  amount: number;
  method: string;
  status: string;
  payment_category: string;
  reversed_at: string | null;
  contracts: {
    contract_number: string;
    rental_type: string;
    renters: { full_name: string } | null;
    vehicles: { brand: string; model: string; plate_number: string; category: string } | null;
  } | null;
};

async function ambilPembayaranMentah(f: FilterLaporan, hanyaLunas: boolean) {
  let q = supabase
    .from("payments")
    .select(
      sel(
        "id, invoice_number, receipt_number, payment_date, amount, method, status, payment_category, reversed_at, contracts(contract_number, rental_type, renters(full_name), vehicles(brand, model, plate_number, category))",
      ),
    )
    .gte("payment_date", f.dari)
    .lte("payment_date", f.sampai)
    .order("payment_date", { ascending: false })
    .limit(2000);
  if (hanyaLunas) q = q.eq("status", "lunas").is("reversed_at", null);
  else if (f.status && f.status !== "semua") q = q.eq("status", f.status as never);
  const { data, error } = await q.returns<BarisPembayaran[]>();
  if (error) galat(error.message);
  return data ?? [];
}

const laporanPendapatan: DefinisiLaporan = {
  key: "pendapatan",
  judul: "Laporan Pendapatan",
  deskripsi: "Seluruh pembayaran lunas pada periode terpilih.",
  hanyaPemilik: true,
  pakaiPeriode: true,
  opsiStatus: [],
  kolom: [
    { key: "tanggal", label: "Tanggal", tipe: "tanggal" },
    { key: "kuitansi", label: "No. Kuitansi", tipe: "teks" },
    { key: "kontrak", label: "Kontrak", tipe: "teks" },
    { key: "penyewa", label: "Penyewa", tipe: "teks" },
    { key: "kendaraan", label: "Kendaraan", tipe: "teks" },
    { key: "tipe_sewa", label: "Tipe Sewa", tipe: "teks" },
    { key: "metode", label: "Metode", tipe: "teks" },
    { key: "nominal", label: "Nominal", tipe: "uang" },
  ],
  ambil: async (f) => {
    const baris = await ambilPembayaranMentah(f, true);
    return baris
      .map((p) => ({
        tanggal: p.payment_date,
        kuitansi: p.receipt_number ?? p.invoice_number,
        kontrak: p.contracts?.contract_number ?? "-",
        penyewa: p.contracts?.renters?.full_name ?? "-",
        kendaraan: p.contracts?.vehicles
          ? `${p.contracts.vehicles.brand} ${p.contracts.vehicles.model} (${p.contracts.vehicles.plate_number})`
          : "-",
        tipe_sewa: labelTipeSewa[p.contracts?.rental_type ?? ""] ?? "-",
        metode: labelMetodeBayar[p.method] ?? p.method,
        nominal: Number(p.amount ?? 0),
      }))
      .filter((r) => cocok(r.penyewa, f.cari) || cocok(r.kontrak, f.cari) || cocok(r.kendaraan, f.cari));
  },
};

const laporanPembayaran: DefinisiLaporan = {
  key: "pembayaran",
  judul: "Laporan Pembayaran",
  deskripsi: "Semua transaksi pembayaran termasuk yang menunggu verifikasi dan ditolak.",
  hanyaPemilik: false,
  pakaiPeriode: true,
  opsiStatus: opsi(statusPembayaran),
  kolom: [
    { key: "tanggal", label: "Tanggal", tipe: "tanggal" },
    { key: "invoice", label: "No. Invoice", tipe: "teks" },
    { key: "kontrak", label: "Kontrak", tipe: "teks" },
    { key: "penyewa", label: "Penyewa", tipe: "teks" },
    { key: "kategori", label: "Kategori", tipe: "teks" },
    { key: "metode", label: "Metode", tipe: "teks" },
    { key: "status", label: "Status", tipe: "teks" },
    { key: "nominal", label: "Nominal", tipe: "uang" },
  ],
  ambil: async (f) => {
    const baris = await ambilPembayaranMentah(f, false);
    return baris
      .map((p) => ({
        tanggal: p.payment_date,
        invoice: p.invoice_number,
        kontrak: p.contracts?.contract_number ?? "-",
        penyewa: p.contracts?.renters?.full_name ?? "-",
        kategori: p.payment_category,
        metode: labelMetodeBayar[p.method] ?? p.method,
        status: p.reversed_at ? "Dibalik" : ambilLabel(statusPembayaran, p.status).label,
        nominal: Number(p.amount ?? 0),
      }))
      .filter((r) => cocok(r.penyewa, f.cari) || cocok(r.invoice, f.cari) || cocok(r.kontrak, f.cari));
  },
};

type BarisKontrak = {
  id: string;
  contract_number: string;
  start_date: string;
  end_date: string;
  actual_return_date: string | null;
  rental_type: string;
  status: string;
  total_amount: number;
  deposit_amount: number;
  renters: { full_name: string; phone: string } | null;
  vehicles: { brand: string; model: string; plate_number: string } | null;
};

const laporanKontrak: DefinisiLaporan = {
  key: "kontrak",
  judul: "Laporan Kontrak",
  deskripsi: "Kontrak yang dimulai pada periode terpilih.",
  hanyaPemilik: false,
  pakaiPeriode: true,
  opsiStatus: opsi(statusKontrak),
  kolom: [
    { key: "nomor", label: "No. Kontrak", tipe: "teks" },
    { key: "penyewa", label: "Penyewa", tipe: "teks" },
    { key: "kendaraan", label: "Kendaraan", tipe: "teks" },
    { key: "mulai", label: "Mulai", tipe: "tanggal" },
    { key: "selesai", label: "Selesai", tipe: "tanggal" },
    { key: "durasi", label: "Durasi (hari)", tipe: "angka" },
    { key: "tipe_sewa", label: "Tipe Sewa", tipe: "teks" },
    { key: "status", label: "Status", tipe: "teks" },
    { key: "nilai", label: "Nilai Kontrak", tipe: "uang" },
  ],
  ambil: async (f) => {
    let q = supabase
      .from("contracts")
      .select(
        sel(
          "id, contract_number, start_date, end_date, actual_return_date, rental_type, status, total_amount, deposit_amount, renters(full_name, phone), vehicles(brand, model, plate_number)",
        ),
      )
      .gte("start_date", f.dari)
      .lte("start_date", f.sampai)
      .order("start_date", { ascending: false })
      .limit(2000);
    if (f.status && f.status !== "semua") q = q.eq("status", f.status as never);
    const { data, error } = await q.returns<BarisKontrak[]>();
    if (error) galat(error.message);
    return (data ?? [])
      .map((c) => {
        const akhir = c.actual_return_date ?? c.end_date;
        const durasi =
          Math.round(
            (new Date(akhir).getTime() - new Date(c.start_date).getTime()) / 86_400_000,
          ) + 1;
        return {
          nomor: c.contract_number,
          penyewa: c.renters?.full_name ?? "-",
          kendaraan: c.vehicles
            ? `${c.vehicles.brand} ${c.vehicles.model} (${c.vehicles.plate_number})`
            : "-",
          mulai: c.start_date,
          selesai: akhir,
          durasi,
          tipe_sewa: labelTipeSewa[c.rental_type] ?? c.rental_type,
          status: ambilLabel(statusKontrak, c.status).label,
          nilai: Number(c.total_amount ?? 0),
        };
      })
      .filter((r) => cocok(r.penyewa, f.cari) || cocok(r.nomor, f.cari) || cocok(r.kendaraan, f.cari));
  },
};

type BarisKendaraan = {
  id: string;
  brand: string;
  model: string;
  plate_number: string;
  year: number;
  category: string;
  transmission: string;
  status: string;
  current_odometer: number;
  daily_rate: number;
  stnk_expiry: string | null;
  insurance_expiry: string | null;
};

const laporanKendaraan: DefinisiLaporan = {
  key: "kendaraan",
  judul: "Laporan Kendaraan",
  deskripsi: "Data lengkap armada beserta status dan kilometer terakhir.",
  hanyaPemilik: false,
  pakaiPeriode: false,
  opsiStatus: opsi(statusKendaraan),
  kolom: [
    { key: "kendaraan", label: "Kendaraan", tipe: "teks" },
    { key: "plat", label: "Plat", tipe: "teks" },
    { key: "tahun", label: "Tahun", tipe: "angka" },
    { key: "kategori", label: "Kategori", tipe: "teks" },
    { key: "transmisi", label: "Transmisi", tipe: "teks" },
    { key: "status", label: "Status", tipe: "teks" },
    { key: "odometer", label: "Odometer (KM)", tipe: "angka" },
    { key: "tarif", label: "Tarif Harian", tipe: "uang" },
    { key: "stnk", label: "STNK Berakhir", tipe: "tanggal" },
    { key: "asuransi", label: "Asuransi Berakhir", tipe: "tanggal" },
  ],
  ambil: async (f) => {
    let q = supabase
      .from("vehicles_internal")
      .select(
        sel(
          "id, brand, model, plate_number, year, category, transmission, status, current_odometer, daily_rate, stnk_expiry, insurance_expiry",
        ),
      )
      .order("brand")
      .limit(2000);
    if (f.status && f.status !== "semua") q = q.eq("status", f.status as never);
    const { data, error } = await q.returns<BarisKendaraan[]>();
    if (error) galat(error.message);
    return (data ?? [])
      .map((v) => ({
        kendaraan: `${v.brand} ${v.model}`,
        plat: v.plate_number,
        tahun: v.year,
        kategori: v.category,
        transmisi: v.transmission,
        status: ambilLabel(statusKendaraan, v.status).label,
        odometer: v.current_odometer,
        tarif: Number(v.daily_rate ?? 0),
        stnk: v.stnk_expiry,
        asuransi: v.insurance_expiry,
      }))
      .filter((r) => cocok(r.kendaraan, f.cari) || cocok(r.plat, f.cari));
  },
};

type BarisPerawatan = {
  id: string;
  scheduled_date: string;
  completed_date: string | null;
  maintenance_type: string;
  category: string;
  status: string;
  cost: number;
  odometer: number | null;
  workshop_name: string | null;
  vehicles: { brand: string; model: string; plate_number: string } | null;
  workshops: { name: string } | null;
};

const laporanPerawatan: DefinisiLaporan = {
  key: "perawatan",
  judul: "Laporan Perawatan",
  deskripsi: "Pekerjaan perawatan dan perbaikan pada periode terpilih.",
  hanyaPemilik: false,
  pakaiPeriode: true,
  opsiStatus: opsi(statusPerawatan),
  kolom: [
    { key: "jadwal", label: "Jadwal", tipe: "tanggal" },
    { key: "selesai", label: "Selesai", tipe: "tanggal" },
    { key: "kendaraan", label: "Kendaraan", tipe: "teks" },
    { key: "kategori", label: "Kategori", tipe: "teks" },
    { key: "jenis", label: "Jenis Pekerjaan", tipe: "teks" },
    { key: "bengkel", label: "Bengkel", tipe: "teks" },
    { key: "odometer", label: "Odometer (KM)", tipe: "angka" },
    { key: "status", label: "Status", tipe: "teks" },
    { key: "biaya", label: "Biaya", tipe: "uang" },
  ],
  ambil: async (f) => {
    let q = supabase
      .from("maintenance_records")
      .select(
        sel(
          "id, scheduled_date, completed_date, maintenance_type, category, status, cost, odometer, workshop_name, vehicles(brand, model, plate_number), workshops(name)",
        ),
      )
      .gte("scheduled_date", f.dari)
      .lte("scheduled_date", f.sampai)
      .order("scheduled_date", { ascending: false })
      .limit(2000);
    if (f.status && f.status !== "semua") q = q.eq("status", f.status as never);
    const { data, error } = await q.returns<BarisPerawatan[]>();
    if (error) galat(error.message);
    return (data ?? [])
      .map((m) => ({
        jadwal: m.scheduled_date,
        selesai: m.completed_date,
        kendaraan: m.vehicles
          ? `${m.vehicles.brand} ${m.vehicles.model} (${m.vehicles.plate_number})`
          : "-",
        kategori: labelKategori(m.category),
        jenis: labelJenisPekerjaan(m.maintenance_type),
        bengkel: m.workshops?.name ?? m.workshop_name ?? "-",
        odometer: m.odometer ?? 0,
        status: ambilLabel(statusPerawatan, m.status).label,
        biaya: Number(m.cost ?? 0),
      }))
      .filter((r) => cocok(r.kendaraan, f.cari) || cocok(r.bengkel, f.cari) || cocok(r.jenis, f.cari));
  },
};

type BarisTunggakan = {
  id: string;
  description: string;
  amount_due: number;
  amount_paid: number;
  due_date: string;
  status: string;
  renters: { full_name: string; phone: string } | null;
  contracts: { contract_number: string } | null;
};

const laporanTunggakan: DefinisiLaporan = {
  key: "tunggakan",
  judul: "Laporan Tunggakan",
  deskripsi: "Tagihan yang belum lunas beserta umur piutangnya.",
  hanyaPemilik: false,
  pakaiPeriode: false,
  opsiStatus: opsi(statusTunggakan),
  kolom: [
    { key: "penyewa", label: "Penyewa", tipe: "teks" },
    { key: "telepon", label: "Telepon", tipe: "teks" },
    { key: "kontrak", label: "Kontrak", tipe: "teks" },
    { key: "keterangan", label: "Keterangan", tipe: "teks" },
    { key: "jatuh_tempo", label: "Jatuh Tempo", tipe: "tanggal" },
    { key: "umur", label: "Umur (hari)", tipe: "angka" },
    { key: "tagihan", label: "Tagihan", tipe: "uang" },
    { key: "dibayar", label: "Dibayar", tipe: "uang" },
    { key: "sisa", label: "Sisa", tipe: "uang" },
    { key: "status", label: "Status", tipe: "teks" },
  ],
  ambil: async (f) => {
    let q = supabase
      .from("outstanding_payments")
      .select(
        sel(
          "id, description, amount_due, amount_paid, due_date, status, renters(full_name, phone), contracts(contract_number)",
        ),
      )
      .order("due_date")
      .limit(2000);
    if (f.status && f.status !== "semua") q = q.eq("status", f.status as never);
    const { data, error } = await q.returns<BarisTunggakan[]>();
    if (error) galat(error.message);
    const kini = Date.now();
    return (data ?? [])
      .map((o) => ({
        penyewa: o.renters?.full_name ?? "-",
        telepon: o.renters?.phone ?? "-",
        kontrak: o.contracts?.contract_number ?? "-",
        keterangan: o.description,
        jatuh_tempo: o.due_date,
        umur: Math.max(
          0,
          Math.round((kini - new Date(o.due_date).getTime()) / 86_400_000),
        ),
        tagihan: Number(o.amount_due ?? 0),
        dibayar: Number(o.amount_paid ?? 0),
        sisa: Number(o.amount_due ?? 0) - Number(o.amount_paid ?? 0),
        status: ambilLabel(statusTunggakan, o.status).label,
      }))
      .filter((r) => cocok(r.penyewa, f.cari) || cocok(r.kontrak, f.cari));
  },
};

type BarisDeposit = {
  id: string;
  amount: number;
  status: string;
  received_date: string | null;
  refund_amount: number | null;
  refund_date: string | null;
  renters: { full_name: string } | null;
  contracts: { contract_number: string } | null;
};

const laporanDeposit: DefinisiLaporan = {
  key: "deposit",
  judul: "Laporan Deposit",
  deskripsi: "Status deposit jaminan setiap kontrak.",
  hanyaPemilik: false,
  pakaiPeriode: false,
  opsiStatus: opsi(statusDeposit),
  kolom: [
    { key: "penyewa", label: "Penyewa", tipe: "teks" },
    { key: "kontrak", label: "Kontrak", tipe: "teks" },
    { key: "nominal", label: "Nominal", tipe: "uang" },
    { key: "diterima", label: "Diterima", tipe: "tanggal" },
    { key: "status", label: "Status", tipe: "teks" },
    { key: "dikembalikan", label: "Dikembalikan", tipe: "uang" },
    { key: "tanggal_kembali", label: "Tgl Pengembalian", tipe: "tanggal" },
  ],
  ambil: async (f) => {
    let q = supabase
      .from("deposits")
      .select(
        sel(
          "id, amount, status, received_date, refund_amount, refund_date, renters(full_name), contracts(contract_number)",
        ),
      )
      .order("created_at", { ascending: false })
      .limit(2000);
    if (f.status && f.status !== "semua") q = q.eq("status", f.status as never);
    const { data, error } = await q.returns<BarisDeposit[]>();
    if (error) galat(error.message);
    return (data ?? [])
      .map((d) => ({
        penyewa: d.renters?.full_name ?? "-",
        kontrak: d.contracts?.contract_number ?? "-",
        nominal: Number(d.amount ?? 0),
        diterima: d.received_date,
        status: ambilLabel(statusDeposit, d.status).label,
        dikembalikan: Number(d.refund_amount ?? 0),
        tanggal_kembali: d.refund_date,
      }))
      .filter((r) => cocok(r.penyewa, f.cari) || cocok(r.kontrak, f.cari));
  },
};

type BarisBengkel = {
  workshop_id: string;
  name: string;
  kunjungan: number;
  total_biaya: number;
  rata_biaya: number;
  rata_hari: number;
};

const laporanBengkel: DefinisiLaporan = {
  key: "bengkel",
  judul: "Laporan Bengkel",
  deskripsi: "Kinerja bengkel mitra: jumlah kunjungan, biaya, dan lama pengerjaan.",
  hanyaPemilik: false,
  pakaiPeriode: false,
  opsiStatus: [],
  kolom: [
    { key: "nama", label: "Bengkel", tipe: "teks" },
    { key: "kunjungan", label: "Kunjungan", tipe: "angka" },
    { key: "total", label: "Total Biaya", tipe: "uang" },
    { key: "rata_biaya", label: "Rata Biaya", tipe: "uang" },
    { key: "rata_hari", label: "Rata Hari Kerja", tipe: "angka" },
  ],
  ambil: async (f) => {
    const { data, error } = await supabase.rpc("workshop_performance");
    if (error) galat(error.message);
    return ((data ?? []) as BarisBengkel[])
      .map((w) => ({
        nama: w.name,
        kunjungan: Number(w.kunjungan ?? 0),
        total: Number(w.total_biaya ?? 0),
        rata_biaya: Number(w.rata_biaya ?? 0),
        rata_hari: Number(w.rata_hari ?? 0),
      }))
      .filter((r) => cocok(r.nama, f.cari));
  },
};

type BarisPelanggan = {
  id: string;
  full_name: string;
  phone: string;
  city: string | null;
  verification_status: string;
  is_active: boolean;
  created_at: string;
};

const laporanPelanggan: DefinisiLaporan = {
  key: "pelanggan",
  judul: "Laporan Pelanggan",
  deskripsi: "Daftar penyewa beserta status verifikasi dan jumlah kontraknya.",
  hanyaPemilik: false,
  pakaiPeriode: false,
  opsiStatus: opsi(statusVerifikasi),
  kolom: [
    { key: "nama", label: "Nama", tipe: "teks" },
    { key: "telepon", label: "Telepon", tipe: "teks" },
    { key: "kota", label: "Kota", tipe: "teks" },
    { key: "verifikasi", label: "Verifikasi", tipe: "teks" },
    { key: "aktif", label: "Aktif", tipe: "teks" },
    { key: "jumlah_kontrak", label: "Jumlah Kontrak", tipe: "angka" },
    { key: "terdaftar", label: "Terdaftar", tipe: "tanggal" },
  ],
  ambil: async (f) => {
    let q = supabase
      .from("renters")
      .select(sel("id, full_name, phone, city, verification_status, is_active, created_at"))
      .order("full_name")
      .limit(2000);
    if (f.status && f.status !== "semua") q = q.eq("verification_status", f.status as never);
    const { data, error } = await q.returns<BarisPelanggan[]>();
    if (error) galat(error.message);
    const { data: kontrak, error: galatKontrak } = await supabase
      .from("contracts")
      .select(sel("renter_id"))
      .limit(5000)
      .returns<{ renter_id: string }[]>();
    if (galatKontrak) galat(galatKontrak.message);
    const hitung = new Map<string, number>();
    for (const k of kontrak ?? []) hitung.set(k.renter_id, (hitung.get(k.renter_id) ?? 0) + 1);
    return (data ?? [])
      .map((r) => ({
        nama: r.full_name,
        telepon: r.phone,
        kota: r.city ?? "-",
        verifikasi: ambilLabel(statusVerifikasi, r.verification_status).label,
        aktif: r.is_active ? "Aktif" : "Tidak Aktif",
        jumlah_kontrak: hitung.get(r.id) ?? 0,
        terdaftar: r.created_at,
      }))
      .filter((r) => cocok(r.nama, f.cari) || cocok(r.telepon, f.cari) || cocok(r.kota, f.cari));
  },
};

export const LAPORAN: DefinisiLaporan[] = [
  laporanPendapatan,
  laporanKontrak,
  laporanKendaraan,
  laporanPerawatan,
  laporanTunggakan,
  laporanDeposit,
  laporanPembayaran,
  laporanBengkel,
  laporanPelanggan,
];

export function cariLaporan(key: string): DefinisiLaporan | undefined {
  return LAPORAN.find((l) => l.key === key);
}

/* ============================ Tampilan sel ============================ */

export function tampilkanSel(nilai: string | number | null, tipe: TipeKolom): string {
  if (nilai === null || nilai === undefined || nilai === "") return "-";
  if (tipe === "uang") return formatRupiah(Number(nilai));
  if (tipe === "tanggal") return formatTanggalSingkat(String(nilai));
  if (tipe === "persen") return `${nilai}%`;
  if (tipe === "angka") return new Intl.NumberFormat("id-ID").format(Number(nilai));
  return String(nilai);
}

/* ============================ Ekspor ============================ */

function nilaiEkspor(nilai: string | number | null, tipe: TipeKolom): string | number {
  if (nilai === null || nilai === undefined) return "";
  if (tipe === "uang" || tipe === "angka") return Number(nilai);
  return String(nilai);
}

function namaBerkas(def: DefinisiLaporan, periode: string, ext: string): string {
  return `${def.key}-${periode.replace(/[^0-9a-zA-Z]+/g, "-")}.${ext}`;
}

function unduh(blob: Blob, nama: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nama;
  a.click();
  URL.revokeObjectURL(url);
}

async function catatEkspor(
  def: DefinisiLaporan,
  periode: string,
  filter: FilterLaporan,
  jumlah: number,
): Promise<void> {
  await supabase.rpc("log_report_export", {
    _report: def.judul,
    _periode: periode,
    _filter: { cari: filter.cari, status: filter.status, dari: filter.dari, sampai: filter.sampai },
    _rows: jumlah,
  });
}

export async function eksporCSV(
  def: DefinisiLaporan,
  baris: BarisLaporan[],
  periode: string,
  filter: FilterLaporan,
): Promise<void> {
  const kutip = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const isi = [
    def.kolom.map((k) => kutip(k.label)).join(","),
    ...baris.map((b) => def.kolom.map((k) => kutip(nilaiEkspor(b[k.key] ?? null, k.tipe))).join(",")),
  ].join("\r\n");
  unduh(new Blob(["\uFEFF" + isi], { type: "text/csv;charset=utf-8" }), namaBerkas(def, periode, "csv"));
  await catatEkspor(def, periode, filter, baris.length);
}

export async function eksporExcel(
  def: DefinisiLaporan,
  baris: BarisLaporan[],
  periode: string,
  filter: FilterLaporan,
): Promise<void> {
  const XLSX = await import("xlsx");
  const data = baris.map((b) => {
    const o: Record<string, string | number> = {};
    for (const k of def.kolom) o[k.label] = nilaiEkspor(b[k.key] ?? null, k.tipe);
    return o;
  });
  const sheet = XLSX.utils.json_to_sheet(data, {
    header: def.kolom.map((k) => k.label),
  });
  sheet["!cols"] = def.kolom.map((k) => ({ wch: Math.max(12, k.label.length + 4) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, "Laporan");
  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
  unduh(
    new Blob([buf], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    namaBerkas(def, periode, "xlsx"),
  );
  await catatEkspor(def, periode, filter, baris.length);
}

export function totalKolomUang(def: DefinisiLaporan, baris: BarisLaporan[]): Record<string, number> {
  const total: Record<string, number> = {};
  for (const k of def.kolom) {
    if (k.tipe !== "uang") continue;
    total[k.key] = baris.reduce((t, b) => t + Number(b[k.key] ?? 0), 0);
  }
  return total;
}