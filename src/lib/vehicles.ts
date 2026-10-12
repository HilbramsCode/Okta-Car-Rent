import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type StatusKendaraan = Database["public"]["Enums"]["vehicle_status"];
export type Kendaraan = Database["public"]["Tables"]["vehicles"]["Row"];
export type FotoKendaraan = Database["public"]["Tables"]["vehicle_photos"]["Row"];
export type DokumenKendaraan = Database["public"]["Tables"]["vehicle_documents"]["Row"];
export type RiwayatStatus = Database["public"]["Tables"]["vehicle_status_history"]["Row"];
export type Perawatan = Database["public"]["Tables"]["maintenance_records"]["Row"];

export const BUCKET_KENDARAAN = "vehicle-photos";

export const OPSI_STATUS: { value: StatusKendaraan; label: string }[] = [
  { value: "tersedia", label: "Tersedia" },
  { value: "disewa", label: "Sedang Disewa" },
  { value: "perawatan", label: "Dalam Perawatan" },
  { value: "tidak_aktif", label: "Tidak Aktif" },
];

export const OPSI_TRANSMISI = ["Manual", "Automatic"];
export const OPSI_BAHAN_BAKAR = ["Bensin", "Solar", "Hybrid", "Listrik"];
export const OPSI_KATEGORI = ["MPV", "SUV", "City Car", "Sedan", "Pikap", "Bus", "Mewah"];
export const OPSI_JENIS_DOKUMEN = ["STNK", "BPKB", "Asuransi", "KIR", "Lainnya"];

const sel = (s: string): string => s;

export type UrutanDaftar = "terbaru" | "terlama" | "tarif" | "tahun" | "kilometer";

export type FilterKendaraan = {
  cari: string;
  status: string;
  kategori: string;
  transmisi: string;
  bahanBakar: string;
  tahun: string;
  urutan: UrutanDaftar;
  halaman: number;
  perHalaman: number;
  sertakanNonaktif: boolean;
};

export const filterAwal: FilterKendaraan = {
  cari: "",
  status: "semua",
  kategori: "semua",
  transmisi: "semua",
  bahanBakar: "semua",
  tahun: "semua",
  urutan: "terbaru",
  halaman: 1,
  perHalaman: 10,
  sertakanNonaktif: false,
};

export type BarisKendaraan = Kendaraan & {
  fotoUrl: string | null;
  perawatanTerakhir: string | null;
};

export type HasilDaftar = { baris: BarisKendaraan[]; total: number };

function urutkan(urutan: UrutanDaftar) {
  switch (urutan) {
    case "terlama":
      return { kolom: "created_at", naik: true };
    case "tarif":
      return { kolom: "daily_rate", naik: true };
    case "tahun":
      return { kolom: "year", naik: false };
    case "kilometer":
      return { kolom: "current_odometer", naik: false };
    default:
      return { kolom: "created_at", naik: false };
  }
}

/** URL yang bisa ditampilkan: path storage ditandatangani, URL absolut dipakai apa adanya. */
export async function urlBerkas(path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  const { data } = await supabase.storage.from(BUCKET_KENDARAAN).createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

async function urlBanyak(paths: string[]): Promise<Record<string, string>> {
  const hasil: Record<string, string> = {};
  const perluTandaTangan = paths.filter((p) => p && !p.startsWith("http"));
  paths.filter((p) => p?.startsWith("http")).forEach((p) => (hasil[p] = p));
  if (perluTandaTangan.length > 0) {
    const { data } = await supabase.storage
      .from(BUCKET_KENDARAAN)
      .createSignedUrls(perluTandaTangan, 3600);
    (data ?? []).forEach((item) => {
      if (item.path && item.signedUrl) hasil[item.path] = item.signedUrl;
    });
  }
  return hasil;
}

export async function ambilDaftarKendaraan(f: FilterKendaraan): Promise<HasilDaftar> {
  const { kolom, naik } = urutkan(f.urutan);
  const dari = (f.halaman - 1) * f.perHalaman;

  let q = supabase
    .from("vehicles_internal")
    .select(sel("*"), { count: "exact" })
    .order(kolom, { ascending: naik });

  if (f.status !== "semua") q = q.eq("status", f.status as StatusKendaraan);
  else if (!f.sertakanNonaktif) q = q.neq("status", "tidak_aktif");
  if (f.kategori !== "semua") q = q.eq("category", f.kategori);
  if (f.transmisi !== "semua") q = q.eq("transmission", f.transmisi);
  if (f.bahanBakar !== "semua") q = q.eq("fuel_type", f.bahanBakar);
  if (f.tahun !== "semua") q = q.eq("year", Number(f.tahun));

  const cari = f.cari.trim();
  if (cari) {
    const aman = cari.replace(/[,()%]/g, " ").trim();
    const bagian = [
      `plate_number.ilike.%${aman}%`,
      `brand.ilike.%${aman}%`,
      `model.ilike.%${aman}%`,
      `variant.ilike.%${aman}%`,
    ];
    if (/^\d{4}$/.test(aman)) bagian.push(`year.eq.${aman}`);
    q = q.or(bagian.join(","));
  }

  const { data, count, error } = await q
    .range(dari, dari + f.perHalaman - 1)
    .returns<Kendaraan[]>();
  if (error) throw new Error(error.message);

  const rows = data ?? [];
  const ids = rows.map((r) => r.id);
  if (ids.length === 0) return { baris: [], total: count ?? 0 };

  const [foto, perawatan] = await Promise.all([
    supabase
      .from("vehicle_photos")
      .select(sel("vehicle_id, photo_url, is_primary, sort_order"))
      .in("vehicle_id", ids)
      .returns<{ vehicle_id: string; photo_url: string; is_primary: boolean; sort_order: number }[]>(),
    supabase
      .from("maintenance_records")
      .select(sel("vehicle_id, completed_date, scheduled_date, status"))
      .in("vehicle_id", ids)
      .returns<
        { vehicle_id: string; completed_date: string | null; scheduled_date: string; status: string }[]
      >(),
  ]);

  const petaFoto = new Map<string, string>();
  for (const p of foto.data ?? []) {
    const ada = petaFoto.get(p.vehicle_id);
    if (!ada || p.is_primary) petaFoto.set(p.vehicle_id, p.photo_url);
  }
  const url = await urlBanyak([...petaFoto.values()]);

  const petaPerawatan = new Map<string, string>();
  for (const m of perawatan.data ?? []) {
    if (m.status !== "selesai") continue;
    const tgl = m.completed_date ?? m.scheduled_date;
    const ada = petaPerawatan.get(m.vehicle_id);
    if (!ada || tgl > ada) petaPerawatan.set(m.vehicle_id, tgl);
  }

  return {
    total: count ?? rows.length,
    baris: rows.map((r) => ({
      ...r,
      fotoUrl: url[petaFoto.get(r.id) ?? ""] ?? null,
      perawatanTerakhir: petaPerawatan.get(r.id) ?? null,
    })),
  };
}

export type RingkasanArmada = {
  total: number;
  tersedia: number;
  disewa: number;
  perawatan: number;
  tidakAktif: number;
  tahunTersedia: number[];
};

export async function ambilRingkasanArmada(): Promise<RingkasanArmada> {
  const { data, error } = await supabase
    .from("vehicles")
    .select(sel("status, year"))
    .returns<{ status: StatusKendaraan; year: number }[]>();
  if (error) throw new Error(error.message);
  const rows = data ?? [];
  const hitung = (s: StatusKendaraan) => rows.filter((r) => r.status === s).length;
  return {
    total: rows.length,
    tersedia: hitung("tersedia"),
    disewa: hitung("disewa"),
    perawatan: hitung("perawatan"),
    tidakAktif: hitung("tidak_aktif"),
    tahunTersedia: [...new Set(rows.map((r) => r.year))].sort((a, b) => b - a),
  };
}

export type KontrakRingkas = {
  id: string;
  contract_number: string;
  start_date: string;
  end_date: string;
  actual_return_date: string | null;
  total_amount: number;
  status: string;
  renters: { full_name: string } | null;
};

export type DetailKendaraan = {
  kendaraan: Kendaraan;
  foto: (FotoKendaraan & { url: string | null })[];
  dokumen: (DokumenKendaraan & { url: string | null })[];
  kontrak: KontrakRingkas[];
  kontrakBerjalan: KontrakRingkas | null;
  perawatan: Perawatan[];
  riwayatStatus: RiwayatStatus[];
};

export async function ambilDetailKendaraan(id: string): Promise<DetailKendaraan> {
  const [kendaraan, foto, dokumen, kontrak, perawatan, riwayat] = await Promise.all([
    supabase
      .from("vehicles_internal")
      .select(sel("*"))
      .eq("id", id)
      .maybeSingle()
      .returns<Kendaraan>(),
    supabase
      .from("vehicle_photos")
      .select(sel("*"))
      .eq("vehicle_id", id)
      .order("is_primary", { ascending: false })
      .order("sort_order", { ascending: true })
      .returns<FotoKendaraan[]>(),
    supabase
      .from("vehicle_documents")
      .select(sel("*"))
      .eq("vehicle_id", id)
      .order("created_at", { ascending: false })
      .returns<DokumenKendaraan[]>(),
    supabase
      .from("contracts")
      .select(
        sel(
          "id, contract_number, start_date, end_date, actual_return_date, total_amount, status, renters(full_name)",
        ),
      )
      .eq("vehicle_id", id)
      .order("start_date", { ascending: false })
      .returns<KontrakRingkas[]>(),
    supabase
      .from("maintenance_records")
      .select(sel("*"))
      .eq("vehicle_id", id)
      .order("scheduled_date", { ascending: false })
      .returns<Perawatan[]>(),
    supabase
      .from("vehicle_status_history")
      .select(sel("*"))
      .eq("vehicle_id", id)
      .order("changed_at", { ascending: false })
      .returns<RiwayatStatus[]>(),
  ]);

  const galat =
    kendaraan.error ?? foto.error ?? dokumen.error ?? kontrak.error ?? perawatan.error ?? riwayat.error;
  if (galat) throw new Error(galat.message);
  if (!kendaraan.data) throw new Error("Kendaraan tidak ditemukan.");

  const daftarFoto = foto.data ?? [];
  const daftarDokumen = dokumen.data ?? [];
  const url = await urlBanyak([
    ...daftarFoto.map((f) => f.photo_url),
    ...daftarDokumen.map((d) => d.file_url),
  ]);

  const daftarKontrak = kontrak.data ?? [];

  return {
    kendaraan: kendaraan.data,
    foto: daftarFoto.map((f) => ({ ...f, url: url[f.photo_url] ?? null })),
    dokumen: daftarDokumen.map((d) => ({ ...d, url: url[d.file_url] ?? null })),
    kontrak: daftarKontrak,
    kontrakBerjalan:
      daftarKontrak.find((k) => k.status === "aktif" || k.status === "terlambat") ?? null,
    perawatan: perawatan.data ?? [],
    riwayatStatus: riwayat.data ?? [],
  };
}

export type MasukanKendaraan = Database["public"]["Tables"]["vehicles"]["Insert"];

export async function buatKendaraan(nilai: MasukanKendaraan): Promise<string> {
  const { data, error } = await supabase
    .from("vehicles")
    .insert(nilai)
    .select(sel("id"))
    .single()
    .returns<{ id: string }>();
  if (error) throw new Error(pesanGalat(error.message));
  return data.id;
}

export async function perbaruiKendaraan(id: string, nilai: MasukanKendaraan): Promise<void> {
  const { error } = await supabase.from("vehicles").update(nilai).eq("id", id);
  if (error) throw new Error(pesanGalat(error.message));
}

/** Ubah status; trigger database mencatat riwayat status dan log audit. */
export async function ubahStatusKendaraan(id: string, status: StatusKendaraan): Promise<void> {
  if (status === "tidak_aktif" || status === "perawatan") {
    const aktif = await kontrakAktifKendaraan(id);
    if (aktif) {
      throw new Error(
        `Kendaraan masih terikat kontrak berjalan (${aktif}). Selesaikan kontrak terlebih dahulu.`,
      );
    }
  }
  const { error } = await supabase.from("vehicles").update({ status }).eq("id", id);
  if (error) throw new Error(pesanGalat(error.message));
}

export async function kontrakAktifKendaraan(id: string): Promise<string | null> {
  const { data } = await supabase
    .from("contracts")
    .select(sel("contract_number"))
    .eq("vehicle_id", id)
    .in("status", ["aktif", "terlambat"])
    .limit(1)
    .returns<{ contract_number: string }[]>();
  return data?.[0]?.contract_number ?? null;
}

/** Hapus lunak: kendaraan ditandai tidak aktif, data historis tetap tersimpan. */
export async function nonaktifkanKendaraan(id: string): Promise<void> {
  await ubahStatusKendaraan(id, "tidak_aktif");
}

function ekstensi(nama: string): string {
  const bagian = nama.split(".");
  return bagian.length > 1 ? bagian.pop()!.toLowerCase() : "bin";
}

export async function unggahFotoKendaraan(vehicleId: string, file: File): Promise<void> {
  const path = `${vehicleId}/${crypto.randomUUID()}.${ekstensi(file.name)}`;
  const { error } = await supabase.storage.from(BUCKET_KENDARAAN).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw new Error(`Gagal mengunggah foto: ${error.message}`);

  const { count } = await supabase
    .from("vehicle_photos")
    .select(sel("id"), { count: "exact", head: true })
    .eq("vehicle_id", vehicleId);

  const { error: galatBaris } = await supabase.from("vehicle_photos").insert({
    vehicle_id: vehicleId,
    photo_url: path,
    is_primary: (count ?? 0) === 0,
    sort_order: count ?? 0,
  });
  if (galatBaris) throw new Error(pesanGalat(galatBaris.message));
}

export async function hapusFotoKendaraan(foto: FotoKendaraan): Promise<void> {
  if (!foto.photo_url.startsWith("http")) {
    await supabase.storage.from(BUCKET_KENDARAAN).remove([foto.photo_url]);
  }
  const { error } = await supabase.from("vehicle_photos").delete().eq("id", foto.id);
  if (error) throw new Error(pesanGalat(error.message));
}

export async function jadikanFotoUtama(foto: FotoKendaraan): Promise<void> {
  const { error: reset } = await supabase
    .from("vehicle_photos")
    .update({ is_primary: false })
    .eq("vehicle_id", foto.vehicle_id);
  if (reset) throw new Error(pesanGalat(reset.message));
  const { error } = await supabase
    .from("vehicle_photos")
    .update({ is_primary: true })
    .eq("id", foto.id);
  if (error) throw new Error(pesanGalat(error.message));
}

export async function unggahDokumenKendaraan(
  vehicleId: string,
  file: File,
  docType: string,
  expiry: string | null,
  notes: string | null,
): Promise<void> {
  const path = `${vehicleId}/dokumen/${crypto.randomUUID()}.${ekstensi(file.name)}`;
  const { error } = await supabase.storage.from(BUCKET_KENDARAAN).upload(path, file);
  if (error) throw new Error(`Gagal mengunggah dokumen: ${error.message}`);
  const { error: galatBaris } = await supabase.from("vehicle_documents").insert({
    vehicle_id: vehicleId,
    doc_type: docType,
    file_url: path,
    expiry_date: expiry,
    notes,
  });
  if (galatBaris) throw new Error(pesanGalat(galatBaris.message));
}

export async function hapusDokumenKendaraan(dok: DokumenKendaraan): Promise<void> {
  if (!dok.file_url.startsWith("http")) {
    await supabase.storage.from(BUCKET_KENDARAAN).remove([dok.file_url]);
  }
  const { error } = await supabase.from("vehicle_documents").delete().eq("id", dok.id);
  if (error) throw new Error(pesanGalat(error.message));
}

export function pesanGalat(pesan: string): string {
  const p = pesan.toLowerCase();
  if (p.includes("row-level security") || p.includes("permission"))
    return "Anda tidak memiliki izin untuk tindakan ini.";
  if (p.includes("duplicate") && p.includes("plate"))
    return "Nomor polisi sudah terdaftar pada kendaraan lain.";
  if (p.includes("duplicate")) return "Data serupa sudah ada di sistem.";
  if (p.includes("failed to fetch") || p.includes("network"))
    return "Koneksi bermasalah. Periksa jaringan Anda lalu coba lagi.";
  return pesan;
}

export function dokumenKedaluwarsa(tanggal: string | null): "kedaluwarsa" | "segera" | "aman" | null {
  if (!tanggal) return null;
  const selisih = Math.round((new Date(tanggal).getTime() - Date.now()) / 86_400_000);
  if (selisih < 0) return "kedaluwarsa";
  if (selisih <= 30) return "segera";
  return "aman";
}