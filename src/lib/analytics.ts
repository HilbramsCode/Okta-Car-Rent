import { supabase } from "@/integrations/supabase/client";

/* ============================ Periode ============================ */

export type KunciPeriode = "bulan_ini" | "bulan_lalu" | "tahun_ini" | "kustom";

export type Periode = { dari: string; sampai: string; label: string };

export function tanggalLokal(d: Date): string {
  const bulan = `${d.getMonth() + 1}`.padStart(2, "0");
  const hari = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${bulan}-${hari}`;
}

export function periodeDari(kunci: KunciPeriode, dari?: string, sampai?: string): Periode {
  const kini = new Date();
  if (kunci === "bulan_lalu") {
    const awal = new Date(kini.getFullYear(), kini.getMonth() - 1, 1);
    const akhir = new Date(kini.getFullYear(), kini.getMonth(), 0);
    return { dari: tanggalLokal(awal), sampai: tanggalLokal(akhir), label: "Bulan Lalu" };
  }
  if (kunci === "tahun_ini") {
    return {
      dari: `${kini.getFullYear()}-01-01`,
      sampai: tanggalLokal(kini),
      label: `Tahun ${kini.getFullYear()}`,
    };
  }
  if (kunci === "kustom" && dari && sampai) {
    return { dari, sampai, label: `${dari} s/d ${sampai}` };
  }
  const awal = new Date(kini.getFullYear(), kini.getMonth(), 1);
  return { dari: tanggalLokal(awal), sampai: tanggalLokal(kini), label: "Bulan Ini" };
}

export const OPSI_PERIODE: { value: KunciPeriode; label: string }[] = [
  { value: "bulan_ini", label: "Bulan Ini" },
  { value: "bulan_lalu", label: "Bulan Lalu" },
  { value: "tahun_ini", label: "Tahun Ini" },
  { value: "kustom", label: "Rentang Sendiri" },
];

/* ============================ Pembanding ============================ */

export type Pembanding = { arah: "naik" | "turun" | "sama"; persen: number; selisih: number };

export function bandingkan(sekarang: number, sebelumnya: number): Pembanding | null {
  if (!Number.isFinite(sekarang) || !Number.isFinite(sebelumnya)) return null;
  const selisih = sekarang - sebelumnya;
  if (sebelumnya === 0) return selisih === 0 ? null : { arah: "naik", persen: 100, selisih };
  const persen = Math.round(Math.abs(selisih) * 1000 / sebelumnya) / 10;
  return {
    arah: selisih > 0 ? "naik" : selisih < 0 ? "turun" : "sama",
    persen,
    selisih,
  };
}

/* ============================ Bentuk data ============================ */

export type BarisWaktu = { label: string; total: number; jumlah: number };
export type BarisTren = { bulan: string; pendapatan: number; biaya: number };

export type RingkasanEksekutif = {
  pendapatan_hari_ini: number;
  pendapatan_bulan_ini: number;
  pendapatan_bulan_lalu: number;
  pendapatan_tahun_ini: number;
  tunggakan_nominal: number;
  tunggakan_jumlah: number;
  deposit_ditahan_nominal: number;
  deposit_ditahan_jumlah: number;
  biaya_perawatan_bulan_ini: number;
  biaya_perawatan_bulan_lalu: number;
  kendaraan_total: number;
  kendaraan_tersedia: number;
  kendaraan_disewa: number;
  kendaraan_perawatan: number;
  kontrak_aktif: number;
  kontrak_aktif_bulan_lalu: number;
  kontrak_terlambat: number;
  verifikasi_menunggu: number;
  keterisian_bulan_ini: number;
  keterisian_bulan_lalu: number;
  tren_12_bulan: BarisTren[];
  perlu_tindakan: {
    kontrak_jatuh_tempo: { id: string; nomor: string; penyewa: string; kendaraan: string; end_date: string }[];
    tunggakan_terlama: { id: string; penyewa: string; sisa: number; umur_hari: number; keterangan: string }[];
    perawatan_terlambat: { id: string; kendaraan: string; jenis: string; scheduled_date: string }[];
  };
};

export type Sorotan = { tingkat: "bahaya" | "peringatan" | "sukses"; pesan: string };

export type AnalitikPendapatan = {
  total: number;
  jumlah_transaksi: number;
  harian: BarisWaktu[];
  mingguan: BarisWaktu[];
  bulanan: BarisWaktu[];
  tahunan: BarisWaktu[];
  per_kendaraan: BarisWaktu[];
  per_kategori: BarisWaktu[];
  per_tipe_sewa: BarisWaktu[];
  per_metode: BarisWaktu[];
  penagihan_tunggakan: BarisWaktu[];
  verifikasi: { label: string; jumlah: number; rata_jam: number }[];
  verifikasi_menunggu: number;
};

export type BarisArmada = {
  vehicle_id: string;
  label: string;
  kategori: string;
  jumlah_sewa: number;
  hari_pakai: number;
  pendapatan: number;
  biaya_perawatan: number;
  downtime: number;
  odometer: number;
  delta_km: number;
};

export type AnalitikArmada = {
  keterisian: number;
  rata_durasi_sewa: number;
  ketersediaan: { tersedia: number; disewa: number; perawatan: number; tidak_aktif: number };
  per_kendaraan: BarisArmada[];
  kesiapan: Record<string, unknown>[];
};

export type AnalitikKeuangan = {
  pendapatan: number;
  biaya_perawatan: number;
  kas_operasional: number;
  tunggakan_total: number;
  tunggakan_jumlah: number;
  umur_piutang: { kelompok: string; jumlah: number; total: number }[];
  deposit: {
    ditahan_jumlah: number;
    ditahan_total: number;
    menunggu_jumlah: number;
    dikembalikan_total: number;
    disita_total: number;
    potongan_total: number;
  };
  pembayaran_menunggu: { jumlah: number; total: number };
  perbandingan_bulanan: BarisTren[];
};

export type AnalitikPelanggan = {
  total: number;
  aktif: number;
  baru: number;
  berulang: number;
  rata_durasi_kontrak: number;
  teratas: {
    renter_id: string;
    nama: string;
    telepon: string;
    jumlah_kontrak: number;
    nilai: number;
    tunggakan: number;
  }[];
  kontrak_terpanjang: { nomor: string; penyewa: string; durasi: number; nilai: number }[];
};

export type AnalitikPerawatan = {
  oli_segera: number;
  ban_segera: number;
  terlambat_jadwal: number;
  total_biaya: number;
  rata_hari_perbaikan: number;
  per_bulan: { bulan: string; jumlah: number; total: number }[];
  per_kategori: { kategori: string; jumlah: number; total: number }[];
  bengkel: {
    workshop_id: string;
    name: string;
    kunjungan: number;
    total_biaya: number;
    rata_biaya: number;
    rata_hari: number;
  }[];
  jatuh_tempo: Record<string, unknown>[];
};

/* ============================ Pengambilan ============================ */

export function pesanGalatAnalitik(pesan: string): string {
  if (/Akses ditolak/i.test(pesan)) return "Hanya pemilik yang dapat membuka analitik ini.";
  return pesan;
}

export async function ambilRingkasanEksekutif(): Promise<RingkasanEksekutif> {
  const { data, error } = await supabase.rpc("bi_executive_summary");
  if (error) throw new Error(pesanGalatAnalitik(error.message));
  return data as unknown as RingkasanEksekutif;
}

export async function ambilSorotan(): Promise<Sorotan[]> {
  const { data, error } = await supabase.rpc("bi_owner_insights");
  if (error) throw new Error(pesanGalatAnalitik(error.message));
  return ((data as unknown as { sorotan: Sorotan[] } | null)?.sorotan ?? []) as Sorotan[];
}

export async function ambilAnalitikPendapatan(p: Periode): Promise<AnalitikPendapatan> {
  const { data, error } = await supabase.rpc("bi_revenue_analytics", {
    _dari: p.dari,
    _sampai: p.sampai,
  });
  if (error) throw new Error(pesanGalatAnalitik(error.message));
  return data as unknown as AnalitikPendapatan;
}

export async function ambilAnalitikArmada(p: Periode): Promise<AnalitikArmada> {
  const { data, error } = await supabase.rpc("bi_fleet_analytics", {
    _dari: p.dari,
    _sampai: p.sampai,
  });
  if (error) throw new Error(pesanGalatAnalitik(error.message));
  return data as unknown as AnalitikArmada;
}

export async function ambilAnalitikKeuangan(p: Periode): Promise<AnalitikKeuangan> {
  const { data, error } = await supabase.rpc("bi_finance_analytics", {
    _dari: p.dari,
    _sampai: p.sampai,
  });
  if (error) throw new Error(pesanGalatAnalitik(error.message));
  return data as unknown as AnalitikKeuangan;
}

export async function ambilAnalitikPelanggan(p: Periode): Promise<AnalitikPelanggan> {
  const { data, error } = await supabase.rpc("bi_customer_analytics", {
    _dari: p.dari,
    _sampai: p.sampai,
  });
  if (error) throw new Error(pesanGalatAnalitik(error.message));
  return data as unknown as AnalitikPelanggan;
}

export async function ambilAnalitikPerawatan(p: Periode): Promise<AnalitikPerawatan> {
  const { data, error } = await supabase.rpc("bi_maintenance_analytics", {
    _dari: p.dari,
    _sampai: p.sampai,
  });
  if (error) throw new Error(pesanGalatAnalitik(error.message));
  return data as unknown as AnalitikPerawatan;
}

export async function catatBukaLaporan(laporan: string, periode: string): Promise<void> {
  await supabase.rpc("log_report_view", { _report: laporan, _periode: periode });
}

/* Cache 5 menit dipakai seluruh halaman analitik & laporan. */
export const OPSI_CACHE = {
  staleTime: 5 * 60_000,
  gcTime: 30 * 60_000,
  refetchOnWindowFocus: false,
} as const;