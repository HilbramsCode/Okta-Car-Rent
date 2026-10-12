import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { pesanGalat } from "@/lib/vehicles";

export type Penyewa = Database["public"]["Tables"]["renters"]["Row"];
export type MasukanPenyewa = Database["public"]["Tables"]["renters"]["Insert"];
export type UbahPenyewa = Database["public"]["Tables"]["renters"]["Update"];
export type CatatanPenyewa = Database["public"]["Tables"]["renter_notes"]["Row"];
export type StatusVerifikasi = Database["public"]["Enums"]["verification_status"];

export const BUCKET_PENYEWA = "renter-documents";

const sel = (s: string): string => s;

export const OPSI_VERIFIKASI: { value: StatusVerifikasi; label: string }[] = [
  { value: "belum_diverifikasi", label: "Belum Diverifikasi" },
  { value: "terverifikasi", label: "Terverifikasi" },
  { value: "ditolak", label: "Ditolak" },
];

export type UrutanPenyewa = "terbaru" | "terlama" | "abjad" | "tunggakan";

export type FilterPenyewa = {
  cari: string;
  verifikasi: string;
  kontrakAktif: string;
  tunggakan: string;
  kota: string;
  urutan: UrutanPenyewa;
  halaman: number;
  perHalaman: number;
  sertakanNonaktif: boolean;
};

export const filterPenyewaAwal: FilterPenyewa = {
  cari: "",
  verifikasi: "semua",
  kontrakAktif: "semua",
  tunggakan: "semua",
  kota: "semua",
  urutan: "terbaru",
  halaman: 1,
  perHalaman: 10,
  sertakanNonaktif: false,
};

export type BarisPenyewa = Penyewa & {
  fotoUrl: string | null;
  kontrakAktif: { id: string; contract_number: string; end_date: string } | null;
  tunggakanNominal: number;
};

export type HasilDaftarPenyewa = {
  baris: BarisPenyewa[];
  total: number;
  kotaTersedia: string[];
  ringkasan: RingkasanPenyewa;
};

export type RingkasanPenyewa = {
  total: number;
  terverifikasi: number;
  belumTerverifikasi: number;
  kontrakAktif: number;
  denganTunggakan: number;
};

/** URL tampil untuk berkas penyewa (bucket privat butuh tanda tangan). */
export async function urlBerkasPenyewa(path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  const { data } = await supabase.storage.from(BUCKET_PENYEWA).createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

async function urlBanyakPenyewa(paths: string[]): Promise<Record<string, string>> {
  const hasil: Record<string, string> = {};
  const bersih = paths.filter(Boolean);
  bersih.filter((p) => p.startsWith("http")).forEach((p) => (hasil[p] = p));
  const perlu = [...new Set(bersih.filter((p) => !p.startsWith("http")))];
  if (perlu.length > 0) {
    const { data } = await supabase.storage.from(BUCKET_PENYEWA).createSignedUrls(perlu, 3600);
    (data ?? []).forEach((i) => {
      if (i.path && i.signedUrl) hasil[i.path] = i.signedUrl;
    });
  }
  return hasil;
}

const hanyaAngka = (v: string | null | undefined): string => (v ?? "").replace(/\D/g, "");

type KontrakBaris = {
  id: string;
  renter_id: string;
  contract_number: string;
  end_date: string;
  status: string;
};

type TunggakanBaris = {
  renter_id: string;
  amount_due: number;
  amount_paid: number;
  status: string;
};

async function ambilAgregat(): Promise<{
  kontrak: Map<string, KontrakBaris>;
  tunggakan: Map<string, number>;
}> {
  const [kontrak, tunggakan] = await Promise.all([
    supabase
      .from("contracts")
      .select(sel("id, renter_id, contract_number, end_date, status"))
      .in("status", ["aktif", "terlambat"])
      .returns<KontrakBaris[]>(),
    supabase
      .from("outstanding_payments")
      .select(sel("renter_id, amount_due, amount_paid, status"))
      .neq("status", "lunas")
      .returns<TunggakanBaris[]>(),
  ]);
  const galat = kontrak.error ?? tunggakan.error;
  if (galat) throw new Error(pesanGalat(galat.message));

  const petaKontrak = new Map<string, KontrakBaris>();
  for (const k of kontrak.data ?? []) {
    const ada = petaKontrak.get(k.renter_id);
    if (!ada || k.end_date > ada.end_date) petaKontrak.set(k.renter_id, k);
  }
  const petaTunggakan = new Map<string, number>();
  for (const t of tunggakan.data ?? []) {
    const sisa = Math.max(0, Number(t.amount_due) - Number(t.amount_paid));
    petaTunggakan.set(t.renter_id, (petaTunggakan.get(t.renter_id) ?? 0) + sisa);
  }
  return { kontrak: petaKontrak, tunggakan: petaTunggakan };
}

export async function ambilDaftarPenyewa(f: FilterPenyewa): Promise<HasilDaftarPenyewa> {
  const [penyewa, agregat] = await Promise.all([
    supabase
      .from("renters")
      .select(sel("*"))
      .order("created_at", { ascending: false })
      .returns<Penyewa[]>(),
    ambilAgregat(),
  ]);
  if (penyewa.error) throw new Error(pesanGalat(penyewa.error.message));

  const semua: BarisPenyewa[] = (penyewa.data ?? []).map((p) => ({
    ...p,
    fotoUrl: null,
    kontrakAktif: agregat.kontrak.get(p.id)
      ? {
          id: agregat.kontrak.get(p.id)!.id,
          contract_number: agregat.kontrak.get(p.id)!.contract_number,
          end_date: agregat.kontrak.get(p.id)!.end_date,
        }
      : null,
    tunggakanNominal: agregat.tunggakan.get(p.id) ?? 0,
  }));

  const aktifSaja = semua.filter((p) => p.is_active);
  const ringkasan: RingkasanPenyewa = {
    total: aktifSaja.length,
    terverifikasi: aktifSaja.filter((p) => p.verification_status === "terverifikasi").length,
    belumTerverifikasi: aktifSaja.filter((p) => p.verification_status !== "terverifikasi").length,
    kontrakAktif: aktifSaja.filter((p) => p.kontrakAktif).length,
    denganTunggakan: aktifSaja.filter((p) => p.tunggakanNominal > 0).length,
  };

  const kotaTersedia = [
    ...new Set(semua.map((p) => (p.city ?? "").trim()).filter((c) => c !== "")),
  ].sort((a, b) => a.localeCompare(b, "id-ID"));

  const cari = f.cari.trim().toLowerCase();
  const cariAngka = hanyaAngka(cari);

  let hasil = semua.filter((p) => {
    if (!f.sertakanNonaktif && !p.is_active) return false;
    if (f.verifikasi !== "semua" && p.verification_status !== f.verifikasi) return false;
    if (f.kontrakAktif === "ada" && !p.kontrakAktif) return false;
    if (f.kontrakAktif === "tidak" && p.kontrakAktif) return false;
    if (f.tunggakan === "ada" && p.tunggakanNominal <= 0) return false;
    if (f.tunggakan === "tidak" && p.tunggakanNominal > 0) return false;
    if (f.kota !== "semua" && (p.city ?? "").trim() !== f.kota) return false;
    if (cari) {
      const cocok =
        p.full_name.toLowerCase().includes(cari) ||
        (p.email ?? "").toLowerCase().includes(cari) ||
        (cariAngka !== "" &&
          (hanyaAngka(p.phone).includes(cariAngka) ||
            hanyaAngka(p.id_card_number).includes(cariAngka) ||
            hanyaAngka(p.driving_license_number).includes(cariAngka)));
      if (!cocok) return false;
    }
    return true;
  });

  hasil = hasil.sort((a, b) => {
    switch (f.urutan) {
      case "terlama":
        return a.created_at.localeCompare(b.created_at);
      case "abjad":
        return a.full_name.localeCompare(b.full_name, "id-ID");
      case "tunggakan":
        return b.tunggakanNominal - a.tunggakanNominal;
      default:
        return b.created_at.localeCompare(a.created_at);
    }
  });

  const total = hasil.length;
  const dari = (f.halaman - 1) * f.perHalaman;
  const baris = hasil.slice(dari, dari + f.perHalaman);

  const url = await urlBanyakPenyewa(baris.map((b) => b.avatar_url ?? "").filter(Boolean));
  baris.forEach((b) => {
    b.fotoUrl = b.avatar_url ? (url[b.avatar_url] ?? null) : null;
  });

  return { baris, total, kotaTersedia, ringkasan };
}

export type KontrakPenyewa = {
  id: string;
  contract_number: string;
  start_date: string;
  end_date: string;
  actual_return_date: string | null;
  total_amount: number;
  status: string;
  vehicles: { brand: string; model: string; plate_number: string } | null;
};

export type PembayaranPenyewa = {
  id: string;
  contract_id: string;
  invoice_number: string;
  amount: number;
  payment_date: string;
  method: string;
  status: string;
};

export type DepositPenyewa = Database["public"]["Tables"]["deposits"]["Row"];
export type TunggakanPenyewa = Database["public"]["Tables"]["outstanding_payments"]["Row"];

export type DetailPenyewa = {
  penyewa: Penyewa;
  fotoUrl: string | null;
  ktpUrl: string | null;
  simUrl: string | null;
  kontrak: KontrakPenyewa[];
  kontrakBerjalan: KontrakPenyewa | null;
  pembayaran: PembayaranPenyewa[];
  deposit: DepositPenyewa[];
  tunggakan: TunggakanPenyewa[];
  catatan: CatatanPenyewa[];
  ringkasanUang: {
    totalPembayaran: number;
    tunggakan: number;
    totalDeposit: number;
    depositDikembalikan: number;
  };
};

export async function ambilDetailPenyewa(id: string): Promise<DetailPenyewa> {
  const [penyewa, kontrak, deposit, tunggakan, catatan] = await Promise.all([
    supabase.from("renters").select(sel("*")).eq("id", id).maybeSingle().returns<Penyewa>(),
    supabase
      .from("contracts")
      .select(
        sel(
          "id, contract_number, start_date, end_date, actual_return_date, total_amount, status, vehicles(brand, model, plate_number)",
        ),
      )
      .eq("renter_id", id)
      .order("start_date", { ascending: false })
      .returns<KontrakPenyewa[]>(),
    supabase
      .from("deposits")
      .select(sel("*"))
      .eq("renter_id", id)
      .order("created_at", { ascending: false })
      .returns<DepositPenyewa[]>(),
    supabase
      .from("outstanding_payments")
      .select(sel("*"))
      .eq("renter_id", id)
      .order("due_date", { ascending: true })
      .returns<TunggakanPenyewa[]>(),
    supabase
      .from("renter_notes")
      .select(sel("*"))
      .eq("renter_id", id)
      .order("created_at", { ascending: false })
      .returns<CatatanPenyewa[]>(),
  ]);

  const galat =
    penyewa.error ?? kontrak.error ?? deposit.error ?? tunggakan.error ?? catatan.error;
  if (galat) throw new Error(pesanGalat(galat.message));
  if (!penyewa.data) throw new Error("Data penyewa tidak ditemukan.");

  const daftarKontrak = kontrak.data ?? [];
  const idKontrak = daftarKontrak.map((k) => k.id);

  let pembayaran: PembayaranPenyewa[] = [];
  if (idKontrak.length > 0) {
    const { data, error } = await supabase
      .from("payments")
      .select(sel("id, contract_id, invoice_number, amount, payment_date, method, status"))
      .in("contract_id", idKontrak)
      .order("payment_date", { ascending: false })
      .returns<PembayaranPenyewa[]>();
    if (error) throw new Error(pesanGalat(error.message));
    pembayaran = data ?? [];
  }

  const p = penyewa.data;
  const url = await urlBanyakPenyewa(
    [p.avatar_url, p.id_card_url, p.driving_license_url].filter(Boolean) as string[],
  );

  const daftarDeposit = deposit.data ?? [];
  const daftarTunggakan = tunggakan.data ?? [];

  return {
    penyewa: p,
    fotoUrl: p.avatar_url ? (url[p.avatar_url] ?? null) : null,
    ktpUrl: p.id_card_url ? (url[p.id_card_url] ?? null) : null,
    simUrl: p.driving_license_url ? (url[p.driving_license_url] ?? null) : null,
    kontrak: daftarKontrak,
    kontrakBerjalan:
      daftarKontrak.find((k) => k.status === "aktif" || k.status === "terlambat") ?? null,
    pembayaran,
    deposit: daftarDeposit,
    tunggakan: daftarTunggakan,
    catatan: catatan.data ?? [],
    ringkasanUang: {
      totalPembayaran: pembayaran
        .filter((b) => b.status === "lunas")
        .reduce((a, b) => a + Number(b.amount), 0),
      tunggakan: daftarTunggakan
        .filter((t) => t.status !== "lunas")
        .reduce((a, t) => a + Math.max(0, Number(t.amount_due) - Number(t.amount_paid)), 0),
      totalDeposit: daftarDeposit.reduce((a, d) => a + Number(d.amount), 0),
      depositDikembalikan: daftarDeposit.reduce((a, d) => a + Number(d.refund_amount ?? 0), 0),
    },
  };
}

function pesanGalatPenyewa(pesan: string): string {
  const p = pesan.toLowerCase();
  if (p.includes("renters_phone_unique")) return "Nomor telepon sudah terdaftar pada penyewa lain.";
  if (p.includes("renters_id_card_unique")) return "Nomor KTP sudah terdaftar pada penyewa lain.";
  if (p.includes("renters_license_unique")) return "Nomor SIM sudah terdaftar pada penyewa lain.";
  return pesanGalat(pesan);
}

export async function buatPenyewa(nilai: MasukanPenyewa): Promise<string> {
  const { data, error } = await supabase
    .from("renters")
    .insert(nilai)
    .select(sel("id"))
    .single()
    .returns<{ id: string }>();
  if (error) throw new Error(pesanGalatPenyewa(error.message));
  return data.id;
}

export async function perbaruiPenyewa(id: string, nilai: MasukanPenyewa): Promise<void> {
  const { error } = await supabase.from("renters").update(nilai).eq("id", id);
  if (error) throw new Error(pesanGalatPenyewa(error.message));
}

export async function verifikasiPenyewa(
  id: string,
  status: StatusVerifikasi,
  alasan: string | null,
): Promise<void> {
  const { data: sesi } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("renters")
    .update({
      verification_status: status,
      verification_reason: status === "ditolak" ? alasan : null,
      verified_at: status === "belum_diverifikasi" ? null : new Date().toISOString(),
      verified_by: status === "belum_diverifikasi" ? null : (sesi.user?.id ?? null),
    })
    .eq("id", id);
  if (error) throw new Error(pesanGalatPenyewa(error.message));
}

/** Hapus lunak: cek kontrak aktif dan tunggakan sebelum menonaktifkan. */
export async function nonaktifkanPenyewa(id: string): Promise<void> {
  const [kontrak, tunggakan] = await Promise.all([
    supabase
      .from("contracts")
      .select(sel("contract_number"))
      .eq("renter_id", id)
      .in("status", ["aktif", "terlambat"])
      .limit(1)
      .returns<{ contract_number: string }[]>(),
    supabase
      .from("outstanding_payments")
      .select(sel("amount_due, amount_paid"))
      .eq("renter_id", id)
      .neq("status", "lunas")
      .returns<{ amount_due: number; amount_paid: number }[]>(),
  ]);

  if (kontrak.data && kontrak.data.length > 0) {
    throw new Error(
      `Penyewa masih memiliki kontrak berjalan (${kontrak.data[0].contract_number}). Selesaikan kontrak terlebih dahulu.`,
    );
  }
  const sisa = (tunggakan.data ?? []).reduce(
    (a, t) => a + Math.max(0, Number(t.amount_due) - Number(t.amount_paid)),
    0,
  );
  if (sisa > 0) {
    throw new Error("Penyewa masih memiliki tunggakan pembayaran. Lunasi terlebih dahulu.");
  }

  const { error } = await supabase.from("renters").update({ is_active: false }).eq("id", id);
  if (error) throw new Error(pesanGalatPenyewa(error.message));
}

export async function aktifkanPenyewa(id: string): Promise<void> {
  const { error } = await supabase.from("renters").update({ is_active: true }).eq("id", id);
  if (error) throw new Error(pesanGalatPenyewa(error.message));
}

export async function tambahCatatanPenyewa(renterId: string, note: string): Promise<void> {
  const { data: sesi } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("renter_notes")
    .insert({ renter_id: renterId, note, created_by: sesi.user?.id ?? null });
  if (error) throw new Error(pesanGalatPenyewa(error.message));
}

export async function hapusCatatanPenyewa(id: string): Promise<void> {
  const { error } = await supabase.from("renter_notes").delete().eq("id", id);
  if (error) throw new Error(pesanGalatPenyewa(error.message));
}

export type JenisBerkasPenyewa = "foto" | "ktp" | "sim";

const kolomBerkas: Record<JenisBerkasPenyewa, "avatar_url" | "id_card_url" | "driving_license_url"> =
  {
    foto: "avatar_url",
    ktp: "id_card_url",
    sim: "driving_license_url",
  };

function ekstensi(nama: string): string {
  const bagian = nama.split(".");
  return bagian.length > 1 ? bagian.pop()!.toLowerCase() : "bin";
}

/** Unggah berkas penyewa ke bucket privat lalu simpan path-nya. */
export async function unggahBerkasPenyewa(
  renterId: string,
  jenis: JenisBerkasPenyewa,
  file: File,
): Promise<string> {
  const path = `${renterId}/${jenis}-${crypto.randomUUID()}.${ekstensi(file.name)}`;
  const { error } = await supabase.storage.from(BUCKET_PENYEWA).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw new Error(`Gagal mengunggah berkas: ${error.message}`);

  const { error: galatBaris } = await supabase
    .from("renters")
    .update({ [kolomBerkas[jenis]]: path } as UbahPenyewa)
    .eq("id", renterId);
  if (galatBaris) throw new Error(pesanGalatPenyewa(galatBaris.message));
  return path;
}

export async function hapusBerkasPenyewa(
  renterId: string,
  jenis: JenisBerkasPenyewa,
  path: string | null,
): Promise<void> {
  if (path && !path.startsWith("http")) {
    await supabase.storage.from(BUCKET_PENYEWA).remove([path]);
  }
  const { error } = await supabase
    .from("renters")
    .update({ [kolomBerkas[jenis]]: null } as UbahPenyewa)
    .eq("id", renterId);
  if (error) throw new Error(pesanGalatPenyewa(error.message));
}

/** Status dokumen: kedaluwarsa / segera habis / aman / belum ada. */
export function statusDokumenPenyewa(p: Penyewa): {
  ktpAda: boolean;
  simAda: boolean;
  fotoAda: boolean;
  simKedaluwarsa: boolean;
  simSegera: boolean;
  dokumenKurang: string[];
} {
  const ktpAda = Boolean(p.id_card_url && p.id_card_number);
  const simAda = Boolean(p.driving_license_url && p.driving_license_number);
  const fotoAda = Boolean(p.avatar_url);
  let simKedaluwarsa = false;
  let simSegera = false;
  if (p.driving_license_expiry) {
    const selisih = Math.round(
      (new Date(p.driving_license_expiry).getTime() - Date.now()) / 86_400_000,
    );
    simKedaluwarsa = selisih < 0;
    simSegera = selisih >= 0 && selisih <= 30;
  }
  const dokumenKurang: string[] = [];
  if (!ktpAda) dokumenKurang.push("KTP");
  if (!simAda) dokumenKurang.push("SIM");
  if (!fotoAda) dokumenKurang.push("Foto profil");
  return { ktpAda, simAda, fotoAda, simKedaluwarsa, simSegera, dokumenKurang };
}

/** Aturan bisnis: hanya penyewa terverifikasi & aktif yang boleh membuat kontrak baru. */
export function bolehBuatKontrak(p: Penyewa): boolean {
  return p.is_active && p.verification_status === "terverifikasi";
}