import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { pesanGalat, BUCKET_KENDARAAN } from "@/lib/vehicles";

export type Kontrak = Database["public"]["Tables"]["contracts"]["Row"];
export type MasukanKontrak = Database["public"]["Tables"]["contracts"]["Insert"];
export type StatusKontrak = Database["public"]["Enums"]["contract_status"];
export type TipeSewa = Database["public"]["Enums"]["rental_type"];
export type ChecklistKontrak = Database["public"]["Tables"]["contract_checklists"]["Row"];
export type FotoChecklist = Database["public"]["Tables"]["contract_checklist_photos"]["Row"];
export type TemplateChecklist = Database["public"]["Tables"]["checklist_templates"]["Row"];
export type ItemTemplateChecklist =
  Database["public"]["Tables"]["checklist_template_items"]["Row"];
export type Deposit = Database["public"]["Tables"]["deposits"]["Row"];
export type PotonganDeposit = Database["public"]["Tables"]["deposit_deductions"]["Row"];
export type Pembayaran = Database["public"]["Tables"]["payments"]["Row"];
export type Perpanjangan = Database["public"]["Tables"]["contract_extensions"]["Row"];
export type RiwayatStatusKontrak =
  Database["public"]["Tables"]["contract_status_history"]["Row"];

const sel = (s: string): string => s;

export const OPSI_STATUS_KONTRAK: { value: StatusKontrak; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "aktif", label: "Aktif" },
  { value: "terlambat", label: "Terlambat" },
  { value: "selesai", label: "Selesai" },
  { value: "dibatalkan", label: "Dibatalkan" },
];

export const OPSI_TIPE_SEWA: { value: TipeSewa; label: string }[] = [
  { value: "harian", label: "Harian" },
  { value: "mingguan", label: "Mingguan" },
  { value: "bulanan", label: "Bulanan" },
];

export const OPSI_SOPIR = [
  { value: "lepas_kunci", label: "Lepas Kunci" },
  { value: "dengan_sopir", label: "Dengan Sopir" },
];

export const OPSI_BBM = ["Penuh", "3/4", "1/2", "1/4", "Kosong"];

export const OPSI_KONDISI = ["baik", "lecet", "rusak", "hilang"] as const;

export const OPSI_ALASAN_POTONGAN = [
  "Kerusakan kendaraan",
  "Kekurangan BBM",
  "Kelebihan kilometer",
  "Denda keterlambatan",
  "Tilang / pelanggaran",
  "Kebersihan kendaraan",
  "Lainnya",
];

/* ============================ Perhitungan ============================ */

export function satuanDurasi(tipe: TipeSewa): number {
  return tipe === "bulanan" ? 30 : tipe === "mingguan" ? 7 : 1;
}

export function hitungDurasi(mulai: string, selesai: string, tipe: TipeSewa): number {
  if (!mulai || !selesai) return 1;
  const hari =
    Math.round((new Date(selesai).getTime() - new Date(mulai).getTime()) / 86_400_000) + 1;
  if (hari <= 0) return 1;
  return Math.max(1, Math.ceil(hari / satuanDurasi(tipe)));
}

export type RincianBiaya = {
  subtotal: number;
  diskon: number;
  biayaTambahan: number;
  total: number;
};

export function hitungBiaya(
  tarif: number,
  durasi: number,
  diskon: number,
  biayaTambahan: number,
): RincianBiaya {
  const subtotal = Math.max(0, tarif) * Math.max(1, durasi);
  const d = Math.min(Math.max(0, diskon), subtotal);
  return {
    subtotal,
    diskon: d,
    biayaTambahan: Math.max(0, biayaTambahan),
    total: subtotal - d + Math.max(0, biayaTambahan),
  };
}

/** Tarif dari snapshot kontrak (kalau ada), jatuh ke tarif master kendaraan. */
export function tarifDariSnapshot(
  tipe: TipeSewa,
  snap: {
    daily: number | null;
    weekly: number | null;
    monthly: number | null;
  },
): number {
  if (tipe === "bulanan") return Number(snap.monthly ?? snap.daily ?? 0);
  if (tipe === "mingguan") return Number(snap.weekly ?? snap.daily ?? 0);
  return Number(snap.daily ?? 0);
}

export function dendaKeterlambatan(k: Kontrak): { hari: number; nominal: number } {
  if (k.status !== "terlambat") return { hari: 0, nominal: 0 };
  const hari = Math.max(
    0,
    Math.round((Date.now() - new Date(k.end_date).getTime()) / 86_400_000),
  );
  return { hari, nominal: hari * Number(k.late_fee_per_day ?? 0) };
}

/* ============================ Daftar ============================ */

export type UrutanKontrak = "terbaru" | "terlama" | "jatuh_tempo" | "nilai";

export type FilterKontrak = {
  cari: string;
  status: string;
  tipe: string;
  dariTanggal: string;
  sampaiTanggal: string;
  urutan: UrutanKontrak;
  halaman: number;
  perHalaman: number;
};

export const filterKontrakAwal: FilterKontrak = {
  cari: "",
  status: "semua",
  tipe: "semua",
  dariTanggal: "",
  sampaiTanggal: "",
  urutan: "terbaru",
  halaman: 1,
  perHalaman: 10,
};

export type BarisKontrak = {
  id: string;
  contract_number: string;
  start_date: string;
  end_date: string;
  status: StatusKontrak;
  rental_type: TipeSewa;
  total_amount: number;
  deposit_amount: number;
  renters: { id: string; full_name: string; phone: string } | null;
  vehicles: { id: string; brand: string; model: string; plate_number: string } | null;
  dibayar: number;
};

export type RingkasanKontrak = {
  total: number;
  aktif: number;
  terlambat: number;
  draft: number;
  jatuhTempoMingguIni: number;
  nilaiAktif: number;
};

export type HasilDaftarKontrak = {
  baris: BarisKontrak[];
  total: number;
  ringkasan: RingkasanKontrak;
};

const KOLOM_DAFTAR =
  "id, contract_number, start_date, end_date, status, rental_type, total_amount, deposit_amount, renters(id, full_name, phone), vehicles(id, brand, model, plate_number)";

/* ==================== Portal penyewa: kontrak saya ==================== */

export type KontrakSaya = {
  id: string;
  contract_number: string;
  start_date: string;
  end_date: string;
  actual_return_date: string | null;
  status: StatusKontrak;
  rental_type: TipeSewa;
  driver_option: string;
  pickup_location: string | null;
  return_location: string | null;
  base_rate: number;
  duration_qty: number;
  total_amount: number;
  deposit_amount: number;
  late_fee_per_day: number;
  vehicles: { brand: string; model: string; plate_number: string } | null;
  dibayar: number;
};

/**
 * Kontrak milik penyewa yang sedang masuk.
 * Pembatasan baris dilakukan oleh RLS (`owns_renter(renter_id)`), sama seperti
 * halaman Pembayaran Saya dan Deposit Saya. Kolom internal tidak diambil.
 */
export async function ambilKontrakSaya(): Promise<KontrakSaya[]> {
  const { data, error } = await supabase
    .from("contracts")
    .select(
      sel(
        "id, contract_number, start_date, end_date, actual_return_date, status, rental_type, driver_option, pickup_location, return_location, base_rate, duration_qty, total_amount, deposit_amount, late_fee_per_day, vehicles(brand, model, plate_number)",
      ),
    )
    .order("start_date", { ascending: false })
    .returns<Omit<KontrakSaya, "dibayar">[]>();
  if (error) throw new Error(pesanGalat(error.message));

  const baris = (data ?? []).map((k) => ({ ...k, dibayar: 0 })) as KontrakSaya[];
  if (baris.length === 0) return [];

  const { data: bayar } = await supabase
    .from("payments")
    .select(sel("contract_id, amount"))
    .eq("status", "lunas")
    .in(
      "contract_id",
      baris.map((b) => b.id),
    )
    .returns<{ contract_id: string; amount: number }[]>();

  const peta = new Map<string, number>();
  for (const b of bayar ?? []) {
    peta.set(b.contract_id, (peta.get(b.contract_id) ?? 0) + Number(b.amount));
  }
  baris.forEach((k) => (k.dibayar = peta.get(k.id) ?? 0));
  return baris;
}

export function dendaKontrakSaya(k: KontrakSaya): { hari: number; nominal: number } {
  if (k.status !== "terlambat") return { hari: 0, nominal: 0 };
  const hari = Math.max(
    0,
    Math.round((Date.now() - new Date(k.end_date).getTime()) / 86_400_000),
  );
  return { hari, nominal: hari * Number(k.late_fee_per_day ?? 0) };
}

export async function ambilDaftarKontrak(f: FilterKontrak): Promise<HasilDaftarKontrak> {
  const { data, error } = await supabase
    .from("contracts")
    .select(sel(KOLOM_DAFTAR))
    .order("start_date", { ascending: false })
    .returns<Omit<BarisKontrak, "dibayar">[]>();
  if (error) throw new Error(pesanGalat(error.message));

  const semua = (data ?? []).map((k) => ({ ...k, dibayar: 0 })) as BarisKontrak[];

  const { data: bayar } = await supabase
    .from("payments")
    .select(sel("contract_id, amount, status"))
    .eq("status", "lunas")
    .returns<{ contract_id: string; amount: number }[]>();
  const peta = new Map<string, number>();
  for (const b of bayar ?? []) {
    peta.set(b.contract_id, (peta.get(b.contract_id) ?? 0) + Number(b.amount));
  }
  semua.forEach((k) => (k.dibayar = peta.get(k.id) ?? 0));

  const minggu = new Date();
  minggu.setDate(minggu.getDate() + 7);
  const batasMinggu = minggu.toISOString().slice(0, 10);
  const hariIni = new Date().toISOString().slice(0, 10);

  const ringkasan: RingkasanKontrak = {
    total: semua.length,
    aktif: semua.filter((k) => k.status === "aktif").length,
    terlambat: semua.filter((k) => k.status === "terlambat").length,
    draft: semua.filter((k) => k.status === "draft").length,
    jatuhTempoMingguIni: semua.filter(
      (k) => k.status === "aktif" && k.end_date >= hariIni && k.end_date <= batasMinggu,
    ).length,
    nilaiAktif: semua
      .filter((k) => k.status === "aktif" || k.status === "terlambat")
      .reduce((a, k) => a + Number(k.total_amount), 0),
  };

  const cari = f.cari.trim().toLowerCase();
  let hasil = semua.filter((k) => {
    if (f.status !== "semua" && k.status !== f.status) return false;
    if (f.tipe !== "semua" && k.rental_type !== f.tipe) return false;
    if (f.dariTanggal && k.end_date < f.dariTanggal) return false;
    if (f.sampaiTanggal && k.start_date > f.sampaiTanggal) return false;
    if (cari) {
      const teks = [
        k.contract_number,
        k.renters?.full_name ?? "",
        k.renters?.phone ?? "",
        k.vehicles?.plate_number ?? "",
        `${k.vehicles?.brand ?? ""} ${k.vehicles?.model ?? ""}`,
      ]
        .join(" ")
        .toLowerCase();
      if (!teks.includes(cari)) return false;
    }
    return true;
  });

  hasil = hasil.sort((a, b) => {
    switch (f.urutan) {
      case "terlama":
        return a.start_date.localeCompare(b.start_date);
      case "jatuh_tempo":
        return a.end_date.localeCompare(b.end_date);
      case "nilai":
        return Number(b.total_amount) - Number(a.total_amount);
      default:
        return b.start_date.localeCompare(a.start_date);
    }
  });

  const total = hasil.length;
  const dari = (f.halaman - 1) * f.perHalaman;
  return { baris: hasil.slice(dari, dari + f.perHalaman), total, ringkasan };
}

/* ============================ Detail ============================ */

export type DetailKontrak = {
  kontrak: Kontrak;
  penyewa: {
    id: string;
    full_name: string;
    phone: string;
    email: string | null;
    verification_status: string;
    driving_license_expiry: string | null;
  } | null;
  kendaraan: {
    id: string;
    brand: string;
    model: string;
    plate_number: string;
    year: number;
    transmission: string;
    status: string;
  } | null;
  checklist: ChecklistKontrak[];
  fotoChecklist: Record<string, FotoChecklist[]>;
  pembayaran: Pembayaran[];
  deposit: Deposit | null;
  potongan: PotonganDeposit[];
  perpanjangan: Perpanjangan[];
  riwayat: RiwayatStatusKontrak[];
  tagihan: { total: number; dibayar: number; menunggu: number; sisa: number };
};

export async function ambilDetailKontrak(id: string): Promise<DetailKontrak> {
  const { data: kontrak, error } = await supabase
    .from("contracts")
    .select(sel("*"))
    .eq("id", id)
    .maybeSingle()
    .returns<Kontrak>();
  if (error) throw new Error(pesanGalat(error.message));
  if (!kontrak) throw new Error("Kontrak tidak ditemukan.");

  const [penyewa, kendaraan, checklist, pembayaran, deposit, perpanjangan, riwayat] =
    await Promise.all([
      supabase
        .from("renters")
        .select(
          sel("id, full_name, phone, email, verification_status, driving_license_expiry"),
        )
        .eq("id", kontrak.renter_id)
        .maybeSingle()
        .returns<DetailKontrak["penyewa"]>(),
      supabase
        .from("vehicles")
        .select(sel("id, brand, model, plate_number, year, transmission, status"))
        .eq("id", kontrak.vehicle_id)
        .maybeSingle()
        .returns<DetailKontrak["kendaraan"]>(),
      supabase
        .from("contract_checklists")
        .select(sel("*"))
        .eq("contract_id", id)
        .order("sort_order", { ascending: true })
        .returns<ChecklistKontrak[]>(),
      supabase
        .from("payments")
        .select(sel("*"))
        .eq("contract_id", id)
        .order("payment_date", { ascending: false })
        .returns<Pembayaran[]>(),
      supabase
        .from("deposits")
        .select(sel("*"))
        .eq("contract_id", id)
        .order("created_at", { ascending: false })
        .limit(1)
        .returns<Deposit[]>(),
      supabase
        .from("contract_extensions")
        .select(sel("*"))
        .eq("contract_id", id)
        .order("created_at", { ascending: false })
        .returns<Perpanjangan[]>(),
      supabase
        .from("contract_status_history")
        .select(sel("*"))
        .eq("contract_id", id)
        .order("changed_at", { ascending: false })
        .returns<RiwayatStatusKontrak[]>(),
    ]);

  const galat =
    penyewa.error ??
    kendaraan.error ??
    checklist.error ??
    pembayaran.error ??
    deposit.error ??
    perpanjangan.error ??
    riwayat.error;
  if (galat) throw new Error(pesanGalat(galat.message));

  const daftarChecklist = checklist.data ?? [];
  const fotoChecklist: Record<string, FotoChecklist[]> = {};
  if (daftarChecklist.length > 0) {
    const { data: foto } = await supabase
      .from("contract_checklist_photos")
      .select(sel("*"))
      .in(
        "checklist_id",
        daftarChecklist.map((c) => c.id),
      )
      .order("sort_order", { ascending: true })
      .returns<FotoChecklist[]>();
    for (const f of foto ?? []) {
      (fotoChecklist[f.checklist_id] ??= []).push(f);
    }
  }

  const dep = (deposit.data ?? [])[0] ?? null;
  let potongan: PotonganDeposit[] = [];
  if (dep) {
    const { data } = await supabase
      .from("deposit_deductions")
      .select(sel("*"))
      .eq("deposit_id", dep.id)
      .order("created_at", { ascending: false })
      .returns<PotonganDeposit[]>();
    potongan = data ?? [];
  }

  const bayar = pembayaran.data ?? [];
  const dibayar = bayar
    .filter((p) => p.status === "lunas")
    .reduce((a, p) => a + Number(p.amount), 0);
  const menunggu = bayar
    .filter((p) => p.status === "menunggu_verifikasi")
    .reduce((a, p) => a + Number(p.amount), 0);

  return {
    kontrak,
    penyewa: penyewa.data ?? null,
    kendaraan: kendaraan.data ?? null,
    checklist: daftarChecklist,
    fotoChecklist,
    pembayaran: bayar,
    deposit: dep,
    potongan,
    perpanjangan: perpanjangan.data ?? [],
    riwayat: riwayat.data ?? [],
    tagihan: {
      total: Number(kontrak.total_amount),
      dibayar,
      menunggu,
      sisa: Math.max(0, Number(kontrak.total_amount) - dibayar),
    },
  };
}

/* ============================ Kelayakan & ketersediaan ============================ */

export type Kelayakan = {
  eligible: boolean;
  blocks: string[];
  warnings: string[];
  arrears: number;
};

export async function cekKelayakanPenyewa(
  renterId: string,
  mulai: string,
  selesai: string,
): Promise<Kelayakan> {
  const { data, error } = await supabase.rpc("check_renter_eligibility", {
    _renter_id: renterId,
    _start: mulai || new Date().toISOString().slice(0, 10),
    _end: selesai || new Date().toISOString().slice(0, 10),
  });
  if (error) throw new Error(pesanGalat(error.message));
  const h = (data ?? {}) as Partial<Kelayakan>;
  return {
    eligible: Boolean(h.eligible),
    blocks: h.blocks ?? [],
    warnings: h.warnings ?? [],
    arrears: Number(h.arrears ?? 0),
  };
}

export type UnitTersedia = {
  id: string;
  brand: string;
  model: string;
  plate_number: string;
  category: string;
  transmission: string;
  seat_capacity: number;
  daily_rate: number;
  weekly_rate: number | null;
  monthly_rate: number | null;
  deposit_amount: number;
  status: string;
  current_odometer: number;
};

/** Unit berstatus tersedia dan tidak punya kontrak bentrok pada rentang tanggal. */
export async function ambilUnitTersedia(
  mulai: string,
  selesai: string,
  kecualiKontrakId?: string,
): Promise<UnitTersedia[]> {
  const [unit, kontrak] = await Promise.all([
    supabase
      .from("vehicles")
      .select(
        sel(
          "id, brand, model, plate_number, category, transmission, seat_capacity, daily_rate, weekly_rate, monthly_rate, deposit_amount, status, current_odometer",
        ),
      )
      .in("status", ["tersedia", "disewa"])
      .order("brand", { ascending: true })
      .returns<UnitTersedia[]>(),
    supabase
      .from("contracts")
      .select(sel("id, vehicle_id, start_date, end_date, status"))
      .in("status", ["draft", "aktif", "terlambat"])
      .returns<
        { id: string; vehicle_id: string; start_date: string; end_date: string }[]
      >(),
  ]);
  const galat = unit.error ?? kontrak.error;
  if (galat) throw new Error(pesanGalat(galat.message));
  if (!mulai || !selesai) return (unit.data ?? []).filter((u) => u.status === "tersedia");

  const sibuk = new Set(
    (kontrak.data ?? [])
      .filter(
        (k) =>
          k.id !== kecualiKontrakId && k.start_date <= selesai && k.end_date >= mulai,
      )
      .map((k) => k.vehicle_id),
  );
  return (unit.data ?? []).filter((u) => !sibuk.has(u.id));
}

/* ============================ Tulis kontrak ============================ */

export type MasukanBuatKontrak = {
  renter_id: string;
  vehicle_id: string;
  rental_type: TipeSewa;
  start_date: string;
  end_date: string;
  duration_qty: number;
  base_rate: number;
  discount_amount: number;
  additional_charges: number;
  deposit_amount: number;
  late_fee_per_day: number;
  driver_option: string;
  pickup_location: string;
  return_location: string;
  terms_notes: string | null;
  override_type?: string | null;
  override_reason?: string | null;
};

async function snapshotKendaraan(vehicleId: string) {
  const { data, error } = await supabase
    .from("vehicles")
    .select(sel("daily_rate, weekly_rate, monthly_rate, deposit_amount, current_odometer"))
    .eq("id", vehicleId)
    .maybeSingle()
    .returns<{
      daily_rate: number;
      weekly_rate: number | null;
      monthly_rate: number | null;
      deposit_amount: number;
      current_odometer: number;
    }>();
  if (error) throw new Error(pesanGalat(error.message));
  if (!data) throw new Error("Kendaraan tidak ditemukan.");
  return data;
}

async function nomorKontrakBaru(): Promise<string> {
  const { data, error } = await supabase.rpc("generate_contract_number");
  if (error) throw new Error(pesanGalat(error.message));
  return data as unknown as string;
}

export async function buatKontrak(nilai: MasukanBuatKontrak): Promise<string> {
  if (nilai.override_type && !(nilai.override_reason ?? "").trim()) {
    throw new Error("Alasan penimpaan wajib diisi.");
  }
  const snap = await snapshotKendaraan(nilai.vehicle_id);
  const biaya = hitungBiaya(
    nilai.base_rate,
    nilai.duration_qty,
    nilai.discount_amount,
    nilai.additional_charges,
  );
  const { data: sesi } = await supabase.auth.getUser();
  const nomor = await nomorKontrakBaru();

  const { data, error } = await supabase
    .from("contracts")
    .insert({
      contract_number: nomor,
      renter_id: nilai.renter_id,
      vehicle_id: nilai.vehicle_id,
      rental_type: nilai.rental_type,
      start_date: nilai.start_date,
      end_date: nilai.end_date,
      duration_qty: nilai.duration_qty,
      base_rate: nilai.base_rate,
      subtotal: biaya.subtotal,
      discount_amount: biaya.diskon,
      additional_charges: biaya.biayaTambahan,
      total_amount: biaya.total,
      deposit_amount: nilai.deposit_amount,
      late_fee_per_day: nilai.late_fee_per_day,
      driver_option: nilai.driver_option,
      pickup_location: nilai.pickup_location,
      return_location: nilai.return_location,
      terms_notes: nilai.terms_notes,
      status: "draft",
      created_by: sesi.user?.id ?? null,
      snapshot_daily_rate: snap.daily_rate,
      snapshot_weekly_rate: snap.weekly_rate,
      snapshot_monthly_rate: snap.monthly_rate,
      snapshot_deposit_amount: snap.deposit_amount,
      pricing_snapshot_at: new Date().toISOString(),
      override_type: nilai.override_type ?? null,
      override_reason: nilai.override_reason ?? null,
    })
    .select(sel("id"))
    .single()
    .returns<{ id: string }>();
  if (error) throw new Error(pesanGalat(error.message));
  return data.id;
}

export async function perbaruiKontrakDraft(
  id: string,
  nilai: MasukanBuatKontrak,
): Promise<void> {
  if (nilai.override_type && !(nilai.override_reason ?? "").trim()) {
    throw new Error("Alasan penimpaan wajib diisi.");
  }
  const biaya = hitungBiaya(
    nilai.base_rate,
    nilai.duration_qty,
    nilai.discount_amount,
    nilai.additional_charges,
  );
  const { error } = await supabase
    .from("contracts")
    .update({
      renter_id: nilai.renter_id,
      vehicle_id: nilai.vehicle_id,
      rental_type: nilai.rental_type,
      start_date: nilai.start_date,
      end_date: nilai.end_date,
      duration_qty: nilai.duration_qty,
      base_rate: nilai.base_rate,
      subtotal: biaya.subtotal,
      discount_amount: biaya.diskon,
      additional_charges: biaya.biayaTambahan,
      total_amount: biaya.total,
      deposit_amount: nilai.deposit_amount,
      late_fee_per_day: nilai.late_fee_per_day,
      driver_option: nilai.driver_option,
      pickup_location: nilai.pickup_location,
      return_location: nilai.return_location,
      terms_notes: nilai.terms_notes,
      override_type: nilai.override_type ?? null,
      override_reason: nilai.override_reason ?? null,
    })
    .eq("id", id)
    .eq("status", "draft");
  if (error) throw new Error(pesanGalat(error.message));
}

export async function hapusKontrakDraft(id: string): Promise<void> {
  const { error } = await supabase.from("contracts").delete().eq("id", id).eq("status", "draft");
  if (error) throw new Error(pesanGalat(error.message));
}

/* ============================ Checklist ============================ */

export async function ambilTemplateChecklist(): Promise<
  { template: TemplateChecklist; item: ItemTemplateChecklist[] }[]
> {
  const [tpl, item] = await Promise.all([
    supabase
      .from("checklist_templates")
      .select(sel("*"))
      .eq("is_active", true)
      .order("is_default", { ascending: false })
      .returns<TemplateChecklist[]>(),
    supabase
      .from("checklist_template_items")
      .select(sel("*"))
      .order("sort_order", { ascending: true })
      .returns<ItemTemplateChecklist[]>(),
  ]);
  const galat = tpl.error ?? item.error;
  if (galat) throw new Error(pesanGalat(galat.message));
  return (tpl.data ?? []).map((t) => ({
    template: t,
    item: (item.data ?? []).filter((i) => i.template_id === t.id),
  }));
}

export type JenisChecklist = "keluar" | "masuk";

/** Salin item template menjadi checklist kontrak (snapshot). */
export async function siapkanChecklistDariTemplate(
  contractId: string,
  jenis: JenisChecklist,
  templateId: string,
): Promise<void> {
  const { data: item, error } = await supabase
    .from("checklist_template_items")
    .select(sel("*"))
    .eq("template_id", templateId)
    .order("sort_order", { ascending: true })
    .returns<ItemTemplateChecklist[]>();
  if (error) throw new Error(pesanGalat(error.message));
  if (!item || item.length === 0) throw new Error("Template belum memiliki item pemeriksaan.");

  const { error: hapus } = await supabase
    .from("contract_checklists")
    .delete()
    .eq("contract_id", contractId)
    .eq("checklist_type", jenis);
  if (hapus) throw new Error(pesanGalat(hapus.message));

  const { error: simpan } = await supabase.from("contract_checklists").insert(
    item.map((i) => ({
      contract_id: contractId,
      checklist_type: jenis,
      item_name: i.item_name,
      category: i.category,
      sort_order: i.sort_order,
      is_required: i.is_required,
      template_item_id: i.id,
      condition: "baik",
    })),
  );
  if (simpan) throw new Error(pesanGalat(simpan.message));
}

export async function simpanItemChecklist(
  id: string,
  nilai: { condition: string; notes: string | null },
): Promise<void> {
  const { error } = await supabase.from("contract_checklists").update(nilai).eq("id", id);
  if (error) throw new Error(pesanGalat(error.message));
}

function ekstensi(nama: string): string {
  const bagian = nama.split(".");
  return bagian.length > 1 ? bagian.pop()!.toLowerCase() : "bin";
}

export async function unggahFotoChecklist(
  contractId: string,
  checklistId: string,
  file: File,
  caption: string | null,
): Promise<void> {
  const path = `inspeksi/${contractId}/${checklistId}-${crypto.randomUUID()}.${ekstensi(file.name)}`;
  const { error } = await supabase.storage.from(BUCKET_KENDARAAN).upload(path, file);
  if (error) throw new Error(`Gagal mengunggah foto: ${error.message}`);
  const { data: sesi } = await supabase.auth.getUser();
  const { error: baris } = await supabase.from("contract_checklist_photos").insert({
    checklist_id: checklistId,
    photo_url: path,
    caption,
    created_by: sesi.user?.id ?? null,
  });
  if (baris) throw new Error(pesanGalat(baris.message));
}

export async function hapusFotoChecklist(foto: FotoChecklist): Promise<void> {
  if (!foto.photo_url.startsWith("http")) {
    await supabase.storage.from(BUCKET_KENDARAAN).remove([foto.photo_url]);
  }
  const { error } = await supabase.from("contract_checklist_photos").delete().eq("id", foto.id);
  if (error) throw new Error(pesanGalat(error.message));
}

export async function urlFotoInspeksi(paths: string[]): Promise<Record<string, string>> {
  const hasil: Record<string, string> = {};
  const perlu = [...new Set(paths.filter((p) => p && !p.startsWith("http")))];
  paths.filter((p) => p?.startsWith("http")).forEach((p) => (hasil[p] = p));
  if (perlu.length > 0) {
    const { data } = await supabase.storage
      .from(BUCKET_KENDARAAN)
      .createSignedUrls(perlu, 3600);
    (data ?? []).forEach((i) => {
      if (i.path && i.signedUrl) hasil[i.path] = i.signedUrl;
    });
  }
  return hasil;
}

/* ============================ Aksi status ============================ */

export type MasukanSerahTerima = {
  odometer_start: number;
  fuel_level_start: string;
  deposit_diterima: boolean;
  metode_deposit: string;
  catatan: string | null;
};

export async function aktifkanKontrak(
  id: string,
  nilai: MasukanSerahTerima,
): Promise<void> {
  const detail = await ambilDetailKontrak(id);
  if (detail.kontrak.status !== "draft") {
    throw new Error("Hanya kontrak berstatus draft yang dapat diaktifkan.");
  }
  if (!nilai.deposit_diterima && detail.tagihan.dibayar <= 0) {
    throw new Error(
      "Deposit atau pembayaran awal belum diterima. Catat penerimaan terlebih dahulu.",
    );
  }

  const { data: sesi } = await supabase.auth.getUser();

  if (nilai.deposit_diterima && detail.deposit) {
    const { error } = await supabase
      .from("deposits")
      .update({
        received_date: new Date().toISOString().slice(0, 10),
        received_method: nilai.metode_deposit,
        status: "ditahan",
        held_until: detail.kontrak.end_date,
        handled_by: sesi.user?.id ?? null,
        notes: nilai.catatan,
      })
      .eq("id", detail.deposit.id)
      .eq("status", "menunggu_penerimaan");
    if (error) throw new Error(pesanGalat(error.message));
  }

  const { error } = await supabase
    .from("contracts")
    .update({
      status: "aktif",
      odometer_start: nilai.odometer_start,
      fuel_level_start: nilai.fuel_level_start,
      approved_by: sesi.user?.id ?? null,
    })
    .eq("id", id);
  if (error) throw new Error(pesanGalat(error.message));
}

export type MasukanPengembalian = {
  odometer_end: number;
  fuel_level_end: string;
  actual_return_date: string;
  biaya_tambahan: number;
  catatan: string | null;
};

export async function selesaikanKontrak(
  id: string,
  nilai: MasukanPengembalian,
): Promise<void> {
  const detail = await ambilDetailKontrak(id);
  const k = detail.kontrak;
  if (k.status !== "aktif" && k.status !== "terlambat") {
    throw new Error("Hanya kontrak berjalan yang dapat diselesaikan.");
  }
  if (k.odometer_start !== null && nilai.odometer_end < k.odometer_start) {
    throw new Error("Odometer akhir tidak boleh lebih kecil dari odometer awal.");
  }

  const tambahan = Number(k.additional_charges) + Math.max(0, nilai.biaya_tambahan);
  const total = Number(k.subtotal) - Number(k.discount_amount) + tambahan;

  const { error } = await supabase
    .from("contracts")
    .update({
      status: "selesai",
      odometer_end: nilai.odometer_end,
      fuel_level_end: nilai.fuel_level_end,
      actual_return_date: nilai.actual_return_date,
      additional_charges: tambahan,
      total_amount: total,
      terms_notes: nilai.catatan ?? k.terms_notes,
    })
    .eq("id", id);
  if (error) throw new Error(pesanGalat(error.message));
}

export async function batalkanKontrak(id: string, alasan: string): Promise<void> {
  if (!alasan.trim()) throw new Error("Alasan pembatalan wajib diisi.");
  const { data: sesi } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("contracts")
    .update({
      status: "dibatalkan",
      override_type: "pembatalan",
      override_reason: alasan.trim(),
      override_by: sesi.user?.id ?? null,
      override_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw new Error(pesanGalat(error.message));
}

export async function perpanjangKontrak(
  id: string,
  tanggalBaru: string,
  biayaTambahan: number,
): Promise<void> {
  const detail = await ambilDetailKontrak(id);
  const k = detail.kontrak;
  if (k.status !== "aktif" && k.status !== "terlambat") {
    throw new Error("Hanya kontrak berjalan yang dapat diperpanjang.");
  }
  if (tanggalBaru <= k.end_date) {
    throw new Error("Tanggal perpanjangan harus setelah tanggal selesai saat ini.");
  }

  const { data: sesi } = await supabase.auth.getUser();
  const total = Number(k.total_amount) + Math.max(0, biayaTambahan);

  const { error } = await supabase
    .from("contracts")
    .update({
      end_date: tanggalBaru,
      total_amount: total,
      additional_charges: Number(k.additional_charges) + Math.max(0, biayaTambahan),
      duration_qty: hitungDurasi(k.start_date, tanggalBaru, k.rental_type),
      status: "aktif",
    })
    .eq("id", id);
  if (error) throw new Error(pesanGalat(error.message));

  const { error: ext } = await supabase.from("contract_extensions").insert({
    contract_id: id,
    previous_end_date: k.end_date,
    new_end_date: tanggalBaru,
    additional_amount: Math.max(0, biayaTambahan),
    approved_by: sesi.user?.id ?? null,
  });
  if (ext) throw new Error(pesanGalat(ext.message));
}

/** Penimpaan aturan oleh pemilik, alasan wajib. */
export async function catatPenimpaan(
  id: string,
  jenis: string,
  alasan: string,
): Promise<void> {
  if (!alasan.trim()) throw new Error("Alasan penimpaan wajib diisi.");
  const { data: sesi } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("contracts")
    .update({
      override_type: jenis,
      override_reason: alasan.trim(),
      override_by: sesi.user?.id ?? null,
      override_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw new Error(pesanGalat(error.message));
}

/* ============================ Pembayaran & deposit ============================ */

export async function catatPembayaran(
  contractId: string,
  nilai: {
    amount: number;
    payment_date: string;
    method: string;
    reference_number: string | null;
    notes: string | null;
  },
): Promise<void> {
  const { data: nomor, error: galatNomor } = await supabase.rpc("generate_invoice_number");
  if (galatNomor) throw new Error(pesanGalat(galatNomor.message));
  const { data: sesi } = await supabase.auth.getUser();
  const { error } = await supabase.from("payments").insert({
    contract_id: contractId,
    invoice_number: nomor as unknown as string,
    amount: nilai.amount,
    payment_date: nilai.payment_date,
    method: nilai.method,
    reference_number: nilai.reference_number,
    notes: nilai.notes,
    status: "lunas",
    verified_by: sesi.user?.id ?? null,
    verified_at: new Date().toISOString(),
    created_by: sesi.user?.id ?? null,
  });
  if (error) throw new Error(pesanGalat(error.message));
}

export async function verifikasiPembayaran(
  id: string,
  status: "lunas" | "ditolak",
  alasan: string | null,
): Promise<void> {
  const { data: sesi } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("payments")
    .update({
      status,
      verified_by: sesi.user?.id ?? null,
      verified_at: new Date().toISOString(),
      rejection_reason: status === "ditolak" ? alasan : null,
    })
    .eq("id", id);
  if (error) throw new Error(pesanGalat(error.message));
}

export async function tambahPotonganDeposit(
  depositId: string,
  nilai: { reason: string; description: string | null; amount: number },
): Promise<void> {
  const { data: sesi } = await supabase.auth.getUser();
  const { error } = await supabase.from("deposit_deductions").insert({
    deposit_id: depositId,
    reason: nilai.reason,
    description: nilai.description,
    amount: nilai.amount,
    created_by: sesi.user?.id ?? null,
  });
  if (error) throw new Error(pesanGalat(error.message));
}

export async function hapusPotonganDeposit(id: string): Promise<void> {
  const { error } = await supabase.from("deposit_deductions").delete().eq("id", id);
  if (error) throw new Error(pesanGalat(error.message));
}

export async function kembalikanDeposit(
  depositId: string,
  nilai: { refund_amount: number; refund_method: string; catatan: string | null },
): Promise<void> {
  const { data: sesi } = await supabase.auth.getUser();
  const { data: dep, error: galatDep } = await supabase
    .from("deposits")
    .select(sel("amount"))
    .eq("id", depositId)
    .maybeSingle()
    .returns<{ amount: number }>();
  if (galatDep) throw new Error(pesanGalat(galatDep.message));

  const nominal = Number(dep?.amount ?? 0);
  const status =
    nilai.refund_amount <= 0
      ? "disita"
      : nilai.refund_amount >= nominal
        ? "dikembalikan"
        : "sebagian_dikembalikan";

  const { error } = await supabase
    .from("deposits")
    .update({
      refund_amount: nilai.refund_amount,
      refund_method: nilai.refund_method,
      refund_date: new Date().toISOString().slice(0, 10),
      status,
      handled_by: sesi.user?.id ?? null,
      notes: nilai.catatan,
    })
    .eq("id", depositId);
  if (error) throw new Error(pesanGalat(error.message));
}

export function pesanGalatKontrak(pesan: string): string {
  const p = pesan.toLowerCase();
  if (p.includes("bentrok")) return pesan;
  if (p.includes("alasan penimpaan")) return "Alasan penimpaan wajib diisi.";
  return pesanGalat(pesan);
}
/* ===================== Pemeriksaan kontrak harian (Phase 3A) ==================== */

export type HasilPemeriksaanKontrak = {
  kontrak_terlambat: number;
  pengingat_dibuat: number;
};

/**
 * Menjalankan pemeriksaan kontrak: menandai kontrak yang melewati tanggal
 * berakhir menjadi "terlambat" dan membuat pengingat H-7. Aman dijalankan
 * berulang karena notifikasi memakai `dedupe_key`. Hanya staf yang diizinkan
 * (dijaga di dalam fungsi database).
 */
export async function periksaKontrakHarian(): Promise<HasilPemeriksaanKontrak> {
  const { data, error } = await supabase.rpc("periksa_kontrak_harian");
  if (error) throw new Error(pesanGalat(error.message));
  return (data as unknown as HasilPemeriksaanKontrak) ?? {
    kontrak_terlambat: 0,
    pengingat_dibuat: 0,
  };
}
