import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";
import { pesanGalat } from "@/lib/vehicles";

export type Perawatan = Database["public"]["Tables"]["maintenance_records"]["Row"];
export type ItemPerawatan = Database["public"]["Tables"]["maintenance_items"]["Row"];
export type Bengkel = Database["public"]["Tables"]["workshops"]["Row"];
export type InvoicePerawatan = Database["public"]["Tables"]["maintenance_invoices"]["Row"];
export type PengaturanPerawatan = Database["public"]["Tables"]["maintenance_settings"]["Row"];
export type BacaanOdometer = Database["public"]["Tables"]["vehicle_odometer_readings"]["Row"];
export type StatusPerawatan = Database["public"]["Enums"]["maintenance_status"];
export type LogAudit = Database["public"]["Tables"]["audit_logs"]["Row"];

export const BUCKET_INVOICE_PERAWATAN = "vehicle-photos";

const sel = (s: string): string => s;

export const OPSI_KATEGORI_PERAWATAN = [
  { value: "preventif", label: "Perawatan Berkala" },
  { value: "korektif", label: "Perbaikan / Kerusakan" },
] as const;

export const labelKategori = (v: string | null | undefined): string =>
  OPSI_KATEGORI_PERAWATAN.find((o) => o.value === v)?.label ?? "Perawatan Berkala";

export const OPSI_JENIS_PREVENTIF = [
  { value: "ganti_oli", label: "Ganti Oli" },
  { value: "ganti_ban", label: "Ganti Ban" },
  { value: "servis_rutin", label: "Servis Rutin" },
  { value: "perpanjangan_stnk", label: "Perpanjangan STNK" },
];

export const OPSI_JENIS_KOREKTIF = [
  { value: "kecelakaan", label: "Kecelakaan" },
  { value: "mesin", label: "Kerusakan Mesin" },
  { value: "kelistrikan", label: "Kelistrikan" },
  { value: "bodi", label: "Bodi & Cat" },
  { value: "lainnya", label: "Lainnya" },
];

export const OPSI_STATUS_PERAWATAN: { value: StatusPerawatan; label: string }[] = [
  { value: "dijadwalkan", label: "Dijadwalkan" },
  { value: "dikerjakan", label: "Sedang Dikerjakan" },
  { value: "selesai", label: "Selesai" },
  { value: "dibatalkan", label: "Dibatalkan" },
];

export const labelJenisPekerjaan = (v: string | null | undefined): string => {
  if (!v) return "-";
  const semua = [...OPSI_JENIS_PREVENTIF, ...OPSI_JENIS_KOREKTIF];
  return semua.find((o) => o.value === v)?.label ?? v.replace(/_/g, " ");
};

/* ============================ Berkas ============================ */

export async function unggahInvoicePerawatan(file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `invoice-perawatan/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from(BUCKET_INVOICE_PERAWATAN)
    .upload(path, file, { upsert: false });
  if (error) throw new Error(pesanGalat(error.message));
  return path;
}

export async function urlInvoicePerawatan(path: string | null): Promise<string | null> {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  const { data } = await supabase.storage
    .from(BUCKET_INVOICE_PERAWATAN)
    .createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

/* ============================ Ringkasan ============================ */

export type RingkasanArmadaSehat = {
  tersedia: number;
  perawatan: number;
  pekerjaan_aktif: number;
  terlambat_jadwal: number;
  oli_segera: number;
  ban_segera: number;
  biaya_bulan_ini: number;
  biaya_tahun_ini: number;
  invoice_tertunda: number;
};

export async function ambilRingkasanPerawatan(): Promise<RingkasanArmadaSehat> {
  const { data, error } = await supabase.rpc("fleet_health_summary");
  if (error) throw new Error(pesanGalatPerawatan(error.message));
  return data as unknown as RingkasanArmadaSehat;
}

export type KendaraanPerluServis =
  Database["public"]["Functions"]["fleet_maintenance_due"]["Returns"][number];

export async function ambilKendaraanPerluServis(): Promise<KendaraanPerluServis[]> {
  const { data, error } = await supabase.rpc("fleet_maintenance_due");
  if (error) throw new Error(pesanGalatPerawatan(error.message));
  return data ?? [];
}

export async function ambilPengaturanPerawatan(): Promise<PengaturanPerawatan | null> {
  const { data, error } = await supabase
    .from("maintenance_settings")
    .select(sel("*"))
    .maybeSingle()
    .returns<PengaturanPerawatan>();
  if (error) throw new Error(pesanGalatPerawatan(error.message));
  return data ?? null;
}

export async function perbaruiPengaturanPerawatan(nilai: {
  oil_interval_km: number;
  tire_interval_km: number;
  oil_warning_km: number;
  tire_warning_km: number;
}): Promise<void> {
  const { error } = await supabase
    .from("maintenance_settings")
    .update(nilai)
    .eq("id", true);
  if (error) throw new Error(pesanGalatPerawatan(error.message));
}

/* ============================ Bengkel ============================ */

export async function ambilDaftarBengkel(sertakanNonaktif = false): Promise<Bengkel[]> {
  let q = supabase.from("workshops").select(sel("*")).order("name", { ascending: true });
  if (!sertakanNonaktif) q = q.eq("is_active", true);
  const { data, error } = await q.returns<Bengkel[]>();
  if (error) throw new Error(pesanGalatPerawatan(error.message));
  return data ?? [];
}

export type MasukanBengkel = {
  name: string;
  address: string | null;
  phone: string | null;
  specialization: string | null;
  notes: string | null;
};

export async function simpanBengkel(id: string | null, nilai: MasukanBengkel): Promise<void> {
  if (!nilai.name.trim()) throw new Error("Nama bengkel wajib diisi.");
  const isi = { ...nilai, name: nilai.name.trim() };
  const { error } = id
    ? await supabase.from("workshops").update(isi).eq("id", id)
    : await supabase.from("workshops").insert(isi);
  if (error) throw new Error(pesanGalatPerawatan(error.message));
}

export async function ubahAktifBengkel(id: string, aktif: boolean): Promise<void> {
  const { error } = await supabase.from("workshops").update({ is_active: aktif }).eq("id", id);
  if (error) throw new Error(pesanGalatPerawatan(error.message));
}

export type PerformaBengkel = {
  workshop_id: string;
  name: string;
  kunjungan: number;
  total_biaya: number;
  rata_biaya: number;
  rata_hari: number;
};

export async function ambilPerformaBengkel(): Promise<PerformaBengkel[]> {
  const { data, error } = await supabase.rpc("workshop_performance");
  if (error) throw new Error(pesanGalatPerawatan(error.message));
  return (data ?? []) as unknown as PerformaBengkel[];
}

/* ============================ Daftar perawatan ============================ */

export type BarisPerawatan = Perawatan & {
  vehicles: { id: string; brand: string; model: string; plate_number: string } | null;
  workshops: { id: string; name: string } | null;
};

const KOLOM_PERAWATAN = sel(
  "*, vehicles(id, brand, model, plate_number), workshops(id, name)",
);

export type FilterPerawatan = {
  cari: string;
  status: StatusPerawatan | "semua";
  kategori: string;
  vehicleId: string;
  dari: string;
  sampai: string;
};

export const filterPerawatanAwal: FilterPerawatan = {
  cari: "",
  status: "semua",
  kategori: "semua",
  vehicleId: "semua",
  dari: "",
  sampai: "",
};

export async function ambilDaftarPerawatan(filter: FilterPerawatan): Promise<BarisPerawatan[]> {
  let q = supabase
    .from("maintenance_records")
    .select(KOLOM_PERAWATAN)
    .order("scheduled_date", { ascending: false });

  if (filter.status !== "semua") q = q.eq("status", filter.status);
  if (filter.kategori !== "semua") q = q.eq("category", filter.kategori);
  if (filter.vehicleId !== "semua") q = q.eq("vehicle_id", filter.vehicleId);
  if (filter.dari) q = q.gte("scheduled_date", filter.dari);
  if (filter.sampai) q = q.lte("scheduled_date", filter.sampai);

  const { data, error } = await q.returns<BarisPerawatan[]>();
  if (error) throw new Error(pesanGalatPerawatan(error.message));

  const cari = filter.cari.trim().toLowerCase();
  const baris = data ?? [];
  if (!cari) return baris;
  return baris.filter((b) => {
    const teks = [
      b.vehicles?.brand,
      b.vehicles?.model,
      b.vehicles?.plate_number,
      b.workshops?.name,
      b.workshop_name,
      b.description,
      b.maintenance_type,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return teks.includes(cari);
  });
}

/* ============================ Detail ============================ */

export type DetailPerawatan = {
  perawatan: BarisPerawatan;
  item: ItemPerawatan[];
  invoice: InvoicePerawatan[];
  audit: LogAudit[];
  kendaraanDisewa: string | null;
};

export async function ambilDetailPerawatan(id: string): Promise<DetailPerawatan> {
  const { data, error } = await supabase
    .from("maintenance_records")
    .select(KOLOM_PERAWATAN)
    .eq("id", id)
    .maybeSingle()
    .returns<BarisPerawatan>();
  if (error) throw new Error(pesanGalatPerawatan(error.message));
  if (!data) throw new Error("Catatan perawatan tidak ditemukan.");

  const [item, invoice, audit, kontrak] = await Promise.all([
    supabase
      .from("maintenance_items")
      .select(sel("*"))
      .eq("maintenance_record_id", id)
      .returns<ItemPerawatan[]>(),
    supabase
      .from("maintenance_invoices")
      .select(sel("*"))
      .eq("maintenance_record_id", id)
      .order("invoice_date", { ascending: false })
      .returns<InvoicePerawatan[]>(),
    supabase
      .from("audit_logs")
      .select(sel("*"))
      .eq("entity_id", id)
      .order("created_at", { ascending: false })
      .limit(30)
      .returns<LogAudit[]>(),
    supabase
      .from("contracts")
      .select(sel("contract_number"))
      .eq("vehicle_id", data.vehicle_id)
      .in("status", ["aktif", "terlambat"])
      .limit(1)
      .returns<{ contract_number: string }[]>(),
  ]);

  const galat = item.error ?? invoice.error;
  if (galat) throw new Error(pesanGalatPerawatan(galat.message));

  return {
    perawatan: data,
    item: item.data ?? [],
    invoice: invoice.data ?? [],
    audit: audit.data ?? [],
    kendaraanDisewa: kontrak.data?.[0]?.contract_number ?? null,
  };
}

/* ============================ Aksi lifecycle ============================ */

export type MasukanPerawatan = {
  vehicle_id: string;
  category: string;
  maintenance_type: string;
  subtype: string | null;
  scheduled_date: string;
  workshop_id: string | null;
  description: string | null;
  notes: string | null;
  odometer: number | null;
};

export async function buatPerawatan(nilai: MasukanPerawatan): Promise<string> {
  if (!nilai.vehicle_id) throw new Error("Kendaraan wajib dipilih.");
  if (!nilai.maintenance_type) throw new Error("Jenis pekerjaan wajib dipilih.");
  if (!nilai.scheduled_date) throw new Error("Tanggal rencana wajib diisi.");

  const nama = nilai.workshop_id ? await namaBengkel(nilai.workshop_id) : null;

  const { data, error } = await supabase
    .from("maintenance_records")
    .insert({
      vehicle_id: nilai.vehicle_id,
      category: nilai.category,
      maintenance_type: nilai.maintenance_type,
      subtype: nilai.subtype ?? nilai.maintenance_type,
      scheduled_date: nilai.scheduled_date,
      workshop_id: nilai.workshop_id,
      workshop_name: nama,
      description: nilai.description,
      notes: nilai.notes,
      odometer: nilai.odometer,
      status: "dijadwalkan",
      cost: 0,
    })
    .select(sel("id"))
    .single()
    .returns<{ id: string }>();
  if (error) throw new Error(pesanGalatPerawatan(error.message));
  return data.id;
}

async function namaBengkel(id: string): Promise<string | null> {
  const { data } = await supabase
    .from("workshops")
    .select(sel("name"))
    .eq("id", id)
    .maybeSingle()
    .returns<{ name: string }>();
  return data?.name ?? null;
}

export async function perbaruiPerawatan(
  id: string,
  nilai: Partial<MasukanPerawatan>,
): Promise<void> {
  const isi: Database["public"]["Tables"]["maintenance_records"]["Update"] = { ...nilai };
  if (nilai.workshop_id) isi.workshop_name = await namaBengkel(nilai.workshop_id);
  const { error } = await supabase.from("maintenance_records").update(isi).eq("id", id);
  if (error) throw new Error(pesanGalatPerawatan(error.message));
}

export async function mulaiPerawatan(id: string, alasanPaksa?: string | null): Promise<void> {
  const { error } = await supabase
    .from("maintenance_records")
    .update({
      status: "dikerjakan",
      forced_reason: alasanPaksa?.trim() ? alasanPaksa.trim() : null,
    })
    .eq("id", id);
  if (error) throw new Error(pesanGalatPerawatan(error.message));
}

export async function selesaikanPerawatan(
  id: string,
  nilai: {
    completed_date: string;
    odometer: number;
    cost: number;
    mechanic_notes: string | null;
    invoice_pending: boolean;
  },
): Promise<void> {
  if (!nilai.completed_date) throw new Error("Tanggal selesai wajib diisi.");
  if (!Number.isFinite(nilai.odometer)) throw new Error("Kilometer saat servis wajib diisi.");
  const { error } = await supabase.rpc("complete_maintenance", {
    _id: id,
    _completed_date: nilai.completed_date,
    _odometer: nilai.odometer,
    _cost: nilai.cost,
    _mechanic_notes: nilai.mechanic_notes ?? "",
    _invoice_pending: nilai.invoice_pending,
  });
  if (error) throw new Error(pesanGalatPerawatan(error.message));
}

export async function batalkanPerawatan(id: string, alasan: string): Promise<void> {
  if (!alasan.trim()) throw new Error("Alasan pembatalan wajib diisi.");
  const { error } = await supabase
    .from("maintenance_records")
    .update({ status: "dibatalkan", cancel_reason: alasan.trim() })
    .eq("id", id);
  if (error) throw new Error(pesanGalatPerawatan(error.message));
}

/* ============================ Item & invoice ============================ */

export async function tambahItemPerawatan(
  recordId: string,
  nilai: { item_name: string; qty: number; unit_cost: number },
): Promise<void> {
  if (!nilai.item_name.trim()) throw new Error("Nama item wajib diisi.");
  if (nilai.qty <= 0) throw new Error("Jumlah item harus lebih dari nol.");
  const { error } = await supabase.from("maintenance_items").insert({
    maintenance_record_id: recordId,
    item_name: nilai.item_name.trim(),
    qty: nilai.qty,
    unit_cost: nilai.unit_cost,
  });
  if (error) throw new Error(pesanGalatPerawatan(error.message));
}

export async function hapusItemPerawatan(id: string): Promise<void> {
  const { error } = await supabase.from("maintenance_items").delete().eq("id", id);
  if (error) throw new Error(pesanGalatPerawatan(error.message));
}

export async function tambahInvoicePerawatan(
  recordId: string,
  nilai: {
    workshop_id: string | null;
    invoice_number: string;
    invoice_date: string;
    amount: number;
    file_url: string;
    notes: string | null;
  },
): Promise<void> {
  if (!nilai.invoice_number.trim()) throw new Error("Nomor invoice wajib diisi.");
  if (!nilai.file_url) throw new Error("Berkas invoice wajib diunggah.");
  const { data: sesi } = await supabase.auth.getUser();
  const { error } = await supabase.from("maintenance_invoices").insert({
    maintenance_record_id: recordId,
    workshop_id: nilai.workshop_id,
    invoice_number: nilai.invoice_number.trim(),
    invoice_date: nilai.invoice_date,
    amount: nilai.amount,
    file_url: nilai.file_url,
    notes: nilai.notes,
    created_by: sesi.user?.id ?? null,
  });
  if (error) throw new Error(pesanGalatPerawatan(error.message));
}

/* ============================ Odometer ============================ */

export async function catatOdometer(
  vehicleId: string,
  odometer: number,
  catatan: string | null,
): Promise<void> {
  const { error } = await supabase.rpc("record_vehicle_odometer", {
    _vehicle_id: vehicleId,
    _odometer: odometer,
    _notes: catatan ?? "",
    _source: "manual",
  });
  if (error) throw new Error(pesanGalatPerawatan(error.message));
}

export async function ambilRiwayatOdometer(vehicleId: string): Promise<BacaanOdometer[]> {
  const { data, error } = await supabase
    .from("vehicle_odometer_readings")
    .select(sel("*"))
    .eq("vehicle_id", vehicleId)
    .order("recorded_at", { ascending: false })
    .limit(20)
    .returns<BacaanOdometer[]>();
  if (error) throw new Error(pesanGalatPerawatan(error.message));
  return data ?? [];
}

/* ============================ Laporan ============================ */

export type LaporanBiaya = {
  per_kendaraan: { vehicle_id: string; label: string; jumlah: number; total: number; km: number }[];
  per_jenis: { jenis: string; jumlah: number; total: number }[];
  per_bulan: { bulan: string; jumlah: number; total: number }[];
  total: number;
};

export async function ambilLaporanBiaya(dari: string, sampai: string): Promise<LaporanBiaya> {
  const { data, error } = await supabase.rpc("maintenance_cost_report", {
    _dari: dari,
    _sampai: sampai,
  });
  if (error) throw new Error(pesanGalatPerawatan(error.message));
  return data as unknown as LaporanBiaya;
}

/* ============================ Portal penyewa ============================ */

export type InfoPerawatanPenyewa = {
  contract_number: string;
  kendaraan: string;
  status: string;
};

export async function ambilInfoPerawatanSaya(): Promise<InfoPerawatanPenyewa[]> {
  const { data, error } = await supabase.rpc("my_rental_maintenance_notice");
  if (error) throw new Error(pesanGalatPerawatan(error.message));
  return (data as unknown as InfoPerawatanPenyewa[]) ?? [];
}

export function ringkasJson(value: Json | null): string {
  if (value === null || value === undefined) return "-";
  if (typeof value === "object") return Object.keys(value as object).join(", ");
  return String(value);
}

export function pesanGalatPerawatan(pesan: string): string {
  const p = pesan.toLowerCase();
  if (p.includes("maintenance_records_active_unique")) {
    return "Sudah ada pekerjaan berjalan dengan jenis yang sama untuk kendaraan ini.";
  }
  if (p.includes("maintenance_invoices_number_unique")) {
    return "Nomor invoice tersebut sudah tercatat untuk bengkel yang sama.";
  }
  if (p.includes("workshops_name_unique")) return "Nama bengkel sudah terdaftar.";
  if (
    p.includes("kilometer") ||
    p.includes("invoice") ||
    p.includes("perawatan") ||
    p.includes("bengkel") ||
    p.includes("alasan") ||
    p.includes("kendaraan")
  ) {
    return pesan;
  }
  return pesanGalat(pesan);
}
/* ===================== Pemeriksaan perawatan harian (Phase 3C) ==================== */

export type HasilPemeriksaanPerawatan = {
  servis_segera: number;
  servis_terlambat: number;
  jadwal_terlambat: number;
  pengingat_dibuat: number;
};

/**
 * Memeriksa kesiapan servis armada (oli/ban berbasis odometer) dan jadwal
 * perawatan yang sudah lewat, lalu membuat pengingat untuk Pemilik/Admin.
 * Aman dijalankan berulang karena notifikasi memakai `dedupe_key`.
 * Hanya staf (dijaga di dalam fungsi database).
 */
export async function periksaPerawatanHarian(): Promise<HasilPemeriksaanPerawatan> {
  const { data, error } = await supabase.rpc("periksa_perawatan_harian");
  if (error) throw new Error(pesanGalat(error.message));
  return (data as unknown as HasilPemeriksaanPerawatan) ?? {
    servis_segera: 0,
    servis_terlambat: 0,
    jadwal_terlambat: 0,
    pengingat_dibuat: 0,
  };
}
