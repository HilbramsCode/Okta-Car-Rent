import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { pesanGalat } from "@/lib/vehicles";

export type Pembayaran = Database["public"]["Tables"]["payments"]["Row"];
export type StatusPembayaran = Database["public"]["Enums"]["payment_status"];
export type SumberPembayaran = Database["public"]["Enums"]["payment_source"];
export type AlokasiPembayaran = Database["public"]["Tables"]["payment_allocations"]["Row"];
export type Tunggakan = Database["public"]["Tables"]["outstanding_payments"]["Row"];
export type LogAudit = Database["public"]["Tables"]["audit_logs"]["Row"];

export const BUCKET_BUKTI = "payment-proofs";

const sel = (s: string): string => s;

export const OPSI_STATUS_PEMBAYARAN: { value: StatusPembayaran; label: string }[] = [
  { value: "menunggu_verifikasi", label: "Menunggu Verifikasi" },
  { value: "lunas", label: "Lunas" },
  { value: "ditolak", label: "Ditolak" },
];

export const OPSI_METODE = [
  { value: "tunai", label: "Tunai" },
  { value: "transfer", label: "Transfer Bank" },
  { value: "qris", label: "QRIS" },
  { value: "kartu_debit", label: "Kartu Debit" },
  { value: "kartu_kredit", label: "Kartu Kredit" },
];

export const OPSI_SUMBER: { value: SumberPembayaran; label: string }[] = [
  { value: "admin_manual", label: "Input Admin" },
  { value: "owner_manual", label: "Input Pemilik" },
  { value: "renter_portal", label: "Portal Penyewa" },
  { value: "outstanding_settlement", label: "Pelunasan Tunggakan" },
  { value: "refund", label: "Pengembalian Dana" },
  { value: "adjustment", label: "Penyesuaian" },
];

export const OPSI_KATEGORI = [
  { value: "sewa", label: "Sewa" },
  { value: "denda", label: "Denda" },
  { value: "tunggakan", label: "Tunggakan" },
  { value: "biaya_tambahan", label: "Biaya Tambahan" },
];

export const labelSumber = (v: string | null | undefined): string =>
  OPSI_SUMBER.find((o) => o.value === v)?.label ?? "-";

export const labelKategori = (v: string | null | undefined): string =>
  OPSI_KATEGORI.find((o) => o.value === v)?.label ?? (v ?? "-");


/* ============================ Berkas bukti ============================ */

export async function urlBukti(path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  const { data } = await supabase.storage.from(BUCKET_BUKTI).createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

export async function unggahBukti(file: File): Promise<string> {
  if (file.size > 5 * 1024 * 1024) throw new Error("Ukuran berkas maksimal 5 MB.");
  const jenis = file.type.toLowerCase();
  if (!jenis.startsWith("image/") && jenis !== "application/pdf") {
    throw new Error("Bukti pembayaran harus berupa gambar atau PDF.");
  }
  const { data: sesi } = await supabase.auth.getUser();
  const uid = sesi.user?.id;
  if (!uid) throw new Error("Sesi berakhir. Silakan masuk kembali.");
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${uid}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET_BUKTI).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) throw new Error(pesanGalat(error.message));
  return path;
}

/* ============================ Daftar pembayaran ============================ */

export type FilterPembayaran = {
  cari: string;
  status: string;
  metode: string;
  sumber: string;
  dariTanggal: string;
  sampaiTanggal: string;
  halaman: number;
  perHalaman: number;
};

export const filterPembayaranAwal: FilterPembayaran = {
  cari: "",
  status: "semua",
  metode: "semua",
  sumber: "semua",
  dariTanggal: "",
  sampaiTanggal: "",
  halaman: 1,
  perHalaman: 10,
};

export type BarisPembayaran = {
  id: string;
  invoice_number: string;
  receipt_number: string | null;
  amount: number;
  payment_date: string;
  method: string;
  status: StatusPembayaran;
  payment_source: SumberPembayaran;
  payment_category: string;
  reference_number: string | null;
  proof_url: string | null;
  reversed_at: string | null;
  contracts: {
    id: string;
    contract_number: string;
    renters: { id: string; full_name: string; phone: string } | null;
  } | null;
};

export type RingkasanPembayaran = {
  hariIni: number;
  bulanIni: number;
  menungguJumlah: number;
  menungguNominal: number;
  ditolak: number;
  totalLunas: number;
};

export type HasilDaftarPembayaran = {
  baris: BarisPembayaran[];
  total: number;
  ringkasan: RingkasanPembayaran;
};

const KOLOM_DAFTAR =
  "id, invoice_number, receipt_number, amount, payment_date, method, status, payment_source, payment_category, reference_number, proof_url, reversed_at, contracts(id, contract_number, renters(id, full_name, phone))";

export async function ambilDaftarPembayaran(
  f: FilterPembayaran,
): Promise<HasilDaftarPembayaran> {
  const { data, error } = await supabase
    .from("payments")
    .select(sel(KOLOM_DAFTAR))
    .order("payment_date", { ascending: false })
    .returns<BarisPembayaran[]>();
  if (error) throw new Error(pesanGalat(error.message));

  const semua = data ?? [];
  const hariIni = new Date().toISOString().slice(0, 10);
  const awalBulan = `${hariIni.slice(0, 7)}-01`;

  const lunas = semua.filter((p) => p.status === "lunas");
  const menunggu = semua.filter((p) => p.status === "menunggu_verifikasi");

  const ringkasan: RingkasanPembayaran = {
    hariIni: lunas
      .filter((p) => p.payment_date === hariIni)
      .reduce((a, p) => a + Number(p.amount), 0),
    bulanIni: lunas
      .filter((p) => p.payment_date >= awalBulan)
      .reduce((a, p) => a + Number(p.amount), 0),
    menungguJumlah: menunggu.length,
    menungguNominal: menunggu.reduce((a, p) => a + Number(p.amount), 0),
    ditolak: semua.filter((p) => p.status === "ditolak").length,
    totalLunas: lunas.reduce((a, p) => a + Number(p.amount), 0),
  };

  const cari = f.cari.trim().toLowerCase();
  const hasil = semua.filter((p) => {
    if (f.status !== "semua" && p.status !== f.status) return false;
    if (f.metode !== "semua" && p.method !== f.metode) return false;
    if (f.sumber !== "semua" && p.payment_source !== f.sumber) return false;
    if (f.dariTanggal && p.payment_date < f.dariTanggal) return false;
    if (f.sampaiTanggal && p.payment_date > f.sampaiTanggal) return false;
    if (cari) {
      const teks = [
        p.invoice_number,
        p.receipt_number ?? "",
        p.reference_number ?? "",
        p.contracts?.contract_number ?? "",
        p.contracts?.renters?.full_name ?? "",
        p.contracts?.renters?.phone ?? "",
      ]
        .join(" ")
        .toLowerCase();
      if (!teks.includes(cari)) return false;
    }
    return true;
  });

  const dari = (f.halaman - 1) * f.perHalaman;
  return {
    baris: hasil.slice(dari, dari + f.perHalaman),
    total: hasil.length,
    ringkasan,
  };
}

export async function ambilAntreanVerifikasi(): Promise<BarisPembayaran[]> {
  const { data, error } = await supabase
    .from("payments")
    .select(sel(KOLOM_DAFTAR))
    .eq("status", "menunggu_verifikasi")
    .order("payment_date", { ascending: true })
    .returns<BarisPembayaran[]>();
  if (error) throw new Error(pesanGalat(error.message));
  return data ?? [];
}

/* ============================ Detail ============================ */

export type DetailPembayaran = {
  pembayaran: Pembayaran;
  kontrak: {
    id: string;
    contract_number: string;
    total_amount: number;
    status: string;
    renter_id: string;
  } | null;
  penyewa: { id: string; full_name: string; phone: string; email: string | null } | null;
  alokasi: (AlokasiPembayaran & { tunggakan: Tunggakan | null })[];
  tagihan: { total: number; dibayar: number; menunggu: number; sisa: number };
  audit: LogAudit[];
};

export async function ambilDetailPembayaran(id: string): Promise<DetailPembayaran> {
  const { data: bayar, error } = await supabase
    .from("payments")
    .select(sel("*"))
    .eq("id", id)
    .maybeSingle()
    .returns<Pembayaran>();
  if (error) throw new Error(pesanGalat(error.message));
  if (!bayar) throw new Error("Pembayaran tidak ditemukan.");

  const [kontrak, alokasi, semuaBayar, audit] = await Promise.all([
    supabase
      .from("contracts")
      .select(sel("id, contract_number, total_amount, status, renter_id"))
      .eq("id", bayar.contract_id)
      .maybeSingle()
      .returns<DetailPembayaran["kontrak"]>(),
    supabase
      .from("payment_allocations")
      .select(sel("*, outstanding_payments(*)"))
      .eq("payment_id", id)
      .order("created_at", { ascending: true })
      .returns<(AlokasiPembayaran & { outstanding_payments: Tunggakan | null })[]>(),
    supabase
      .from("payments")
      .select(sel("amount, status"))
      .eq("contract_id", bayar.contract_id)
      .returns<{ amount: number; status: StatusPembayaran }[]>(),
    supabase
      .from("audit_logs")
      .select(sel("*"))
      .eq("entity_id", id)
      .order("created_at", { ascending: false })
      .returns<LogAudit[]>(),
  ]);

  const penyewa = kontrak.data?.renter_id
    ? await supabase
        .from("renters")
        .select(sel("id, full_name, phone, email"))
        .eq("id", kontrak.data.renter_id)
        .maybeSingle()
        .returns<DetailPembayaran["penyewa"]>()
    : null;

  const daftar = semuaBayar.data ?? [];
  const total = Number(kontrak.data?.total_amount ?? 0);
  const dibayar = daftar
    .filter((p) => p.status === "lunas")
    .reduce((a, p) => a + Number(p.amount), 0);
  const menunggu = daftar
    .filter((p) => p.status === "menunggu_verifikasi")
    .reduce((a, p) => a + Number(p.amount), 0);

  return {
    pembayaran: bayar,
    kontrak: kontrak.data ?? null,
    penyewa: penyewa?.data ?? null,
    alokasi: (alokasi.data ?? []).map((a) => ({
      ...a,
      tunggakan: a.outstanding_payments ?? null,
    })),
    tagihan: { total, dibayar, menunggu, sisa: Math.max(0, total - dibayar) },
    audit: audit.data ?? [],
  };
}

/* ============================ Ringkasan tagihan kontrak ============================ */

export type TagihanKontrak = { total: number; dibayar: number; menunggu: number; sisa: number };

export async function ambilTagihanKontrak(contractId: string): Promise<TagihanKontrak> {
  const [kontrak, bayar] = await Promise.all([
    supabase
      .from("contracts")
      .select(sel("total_amount"))
      .eq("id", contractId)
      .maybeSingle()
      .returns<{ total_amount: number }>(),
    supabase
      .from("payments")
      .select(sel("amount, status"))
      .eq("contract_id", contractId)
      .returns<{ amount: number; status: StatusPembayaran }[]>(),
  ]);
  const total = Number(kontrak.data?.total_amount ?? 0);
  const daftar = bayar.data ?? [];
  const dibayar = daftar
    .filter((p) => p.status === "lunas")
    .reduce((a, p) => a + Number(p.amount), 0);
  const menunggu = daftar
    .filter((p) => p.status === "menunggu_verifikasi")
    .reduce((a, p) => a + Number(p.amount), 0);
  return { total, dibayar, menunggu, sisa: Math.max(0, total - dibayar) };
}

/* ============================ Pencatatan ============================ */

export type MasukanPembayaran = {
  contract_id: string;
  amount: number;
  payment_date: string;
  method: string;
  reference_number: string | null;
  notes: string | null;
  proof_url: string | null;
  payment_category: string;
  payment_source: SumberPembayaran;
  izinkanLebih?: boolean;
};

export async function deteksiDuplikat(
  contractId: string,
  referensi: string | null,
  nominal: number,
  tanggal: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("payments")
    .select(sel("invoice_number, amount, payment_date, reference_number, status"))
    .eq("contract_id", contractId)
    .neq("status", "ditolak")
    .returns<
      {
        invoice_number: string;
        amount: number;
        payment_date: string;
        reference_number: string | null;
        status: StatusPembayaran;
      }[]
    >();
  const ref = (referensi ?? "").trim();
  for (const p of data ?? []) {
    if (ref && (p.reference_number ?? "").trim() === ref) {
      return `Nomor referensi sudah dipakai pada invoice ${p.invoice_number}.`;
    }
    if (Number(p.amount) === nominal && p.payment_date === tanggal) {
      return `Sudah ada pembayaran dengan nominal dan tanggal sama (${p.invoice_number}). Pastikan ini bukan bukti ganda.`;
    }
  }
  return null;
}

async function validasiNominal(nilai: MasukanPembayaran): Promise<void> {
  if (nilai.amount <= 0) throw new Error("Nominal pembayaran harus lebih dari nol.");
  const hariIni = new Date().toISOString().slice(0, 10);
  if (nilai.payment_date > hariIni) throw new Error("Tanggal bayar tidak boleh di masa depan.");
  if (!nilai.izinkanLebih) {
    const tagihan = await ambilTagihanKontrak(nilai.contract_id);
    if (nilai.amount > tagihan.sisa && tagihan.sisa >= 0) {
      throw new Error(
        "Nominal melebihi sisa tagihan kontrak. Centang kelebihan bayar bila memang disengaja.",
      );
    }
  }
}

/** Catat pembayaran oleh staf: langsung terverifikasi lunas. */
export async function catatPembayaranStaf(nilai: MasukanPembayaran): Promise<string> {
  await validasiNominal(nilai);
  const { data: nomor, error: galatNomor } = await supabase.rpc("generate_invoice_number");
  if (galatNomor) throw new Error(pesanGalat(galatNomor.message));
  const { data: sesi } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("payments")
    .insert({
      contract_id: nilai.contract_id,
      invoice_number: nomor as unknown as string,
      amount: nilai.amount,
      payment_date: nilai.payment_date,
      method: nilai.method,
      reference_number: (nilai.reference_number ?? "").trim() || null,
      notes: nilai.notes,
      proof_url: nilai.proof_url,
      payment_category: nilai.payment_category,
      payment_source: nilai.payment_source,
      status: "lunas",
      verified_by: sesi.user?.id ?? null,
      verified_at: new Date().toISOString(),
      created_by: sesi.user?.id ?? null,
    })
    .select(sel("id"))
    .maybeSingle()
    .returns<{ id: string }>();
  if (error) throw new Error(pesanGalatPembayaran(error.message));
  const id = data?.id ?? "";
  if (id) await alokasiOtomatis(id);
  return id;
}

/** Pengajuan pembayaran oleh penyewa: menunggu verifikasi staf. */
export async function ajukanPembayaranPenyewa(nilai: {
  contract_id: string;
  amount: number;
  payment_date: string;
  method: string;
  reference_number: string | null;
  notes: string | null;
  proof_url: string;
}): Promise<void> {
  if (nilai.amount <= 0) throw new Error("Nominal pembayaran harus lebih dari nol.");
  if (!nilai.proof_url) throw new Error("Bukti pembayaran wajib diunggah.");
  const { data: nomor, error: galatNomor } = await supabase.rpc("generate_invoice_number");
  if (galatNomor) throw new Error(pesanGalat(galatNomor.message));
  const { data: sesi } = await supabase.auth.getUser();
  const { error } = await supabase.from("payments").insert({
    contract_id: nilai.contract_id,
    invoice_number: nomor as unknown as string,
    amount: nilai.amount,
    payment_date: nilai.payment_date,
    method: nilai.method,
    reference_number: (nilai.reference_number ?? "").trim() || null,
    notes: nilai.notes,
    proof_url: nilai.proof_url,
    payment_category: "sewa",
    payment_source: "renter_portal",
    status: "menunggu_verifikasi",
    created_by: sesi.user?.id ?? null,
  });
  if (error) throw new Error(pesanGalatPembayaran(error.message));
}

/* ============================ Verifikasi & pembalikan ============================ */

export async function setujuiPembayaran(id: string): Promise<void> {
  const { data: sesi } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("payments")
    .update({
      status: "lunas",
      verified_by: sesi.user?.id ?? null,
      verified_at: new Date().toISOString(),
      rejection_reason: null,
    })
    .eq("id", id)
    .eq("status", "menunggu_verifikasi")
    .select(sel("id"))
    .returns<{ id: string }[]>();
  if (error) throw new Error(pesanGalatPembayaran(error.message));
  if ((data ?? []).length === 0) {
    throw new Error("Pembayaran ini sudah diverifikasi sebelumnya.");
  }
  await alokasiOtomatis(id);
}

export async function tolakPembayaran(id: string, alasan: string): Promise<void> {
  if (!alasan.trim()) throw new Error("Alasan penolakan wajib diisi.");
  const { data: sesi } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("payments")
    .update({
      status: "ditolak",
      verified_by: sesi.user?.id ?? null,
      verified_at: new Date().toISOString(),
      rejection_reason: alasan.trim(),
    })
    .eq("id", id)
    .eq("status", "menunggu_verifikasi")
    .select(sel("id"))
    .returns<{ id: string }[]>();
  if (error) throw new Error(pesanGalatPembayaran(error.message));
  if ((data ?? []).length === 0) {
    throw new Error("Pembayaran ini sudah diproses sebelumnya.");
  }
}

/** Pembalikan pembayaran lunas (khusus pemilik). Alokasi ikut dibalik otomatis. */
export async function balikkanPembayaran(id: string, alasan: string): Promise<void> {
  if (!alasan.trim()) throw new Error("Alasan pembalikan wajib diisi.");
  const { data: sesi } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("payments")
    .update({
      status: "ditolak",
      reversal_reason: alasan.trim(),
      reversed_at: new Date().toISOString(),
      reversed_by: sesi.user?.id ?? null,
      rejection_reason: `Dibalik: ${alasan.trim()}`,
    })
    .eq("id", id)
    .eq("status", "lunas")
    .select(sel("id"))
    .returns<{ id: string }[]>();
  if (error) throw new Error(pesanGalatPembayaran(error.message));
  if ((data ?? []).length === 0) {
    throw new Error("Hanya pembayaran berstatus lunas yang dapat dibalik.");
  }
}

/* ============================ Alokasi ke tunggakan ============================ */

export async function sisaAlokasiPembayaran(paymentId: string): Promise<number> {
  const [bayar, alokasi] = await Promise.all([
    supabase
      .from("payments")
      .select(sel("amount"))
      .eq("id", paymentId)
      .maybeSingle()
      .returns<{ amount: number }>(),
    supabase
      .from("payment_allocations")
      .select(sel("allocated_amount"))
      .eq("payment_id", paymentId)
      .returns<{ allocated_amount: number }[]>(),
  ]);
  const terpakai = (alokasi.data ?? []).reduce((a, x) => a + Number(x.allocated_amount), 0);
  return Math.max(0, Number(bayar.data?.amount ?? 0) - terpakai);
}

export async function alokasikan(
  paymentId: string,
  outstandingId: string,
  nominal: number,
  catatan?: string | null,
): Promise<void> {
  if (nominal <= 0) throw new Error("Nominal alokasi harus lebih dari nol.");
  const { data: sesi } = await supabase.auth.getUser();
  const { error } = await supabase.from("payment_allocations").insert({
    payment_id: paymentId,
    outstanding_payment_id: outstandingId,
    allocated_amount: nominal,
    note: catatan ?? null,
    created_by: sesi.user?.id ?? null,
  });
  if (error) throw new Error(pesanGalatPembayaran(error.message));
}

/** Alokasikan sisa pembayaran ke tunggakan penyewa, jatuh tempo terlama dulu. */
export async function alokasiOtomatis(paymentId: string): Promise<void> {
  const sisa = await sisaAlokasiPembayaran(paymentId);
  if (sisa <= 0) return;

  const { data: bayar } = await supabase
    .from("payments")
    .select(sel("contract_id"))
    .eq("id", paymentId)
    .maybeSingle()
    .returns<{ contract_id: string }>();
  if (!bayar) return;

  const { data: kontrak } = await supabase
    .from("contracts")
    .select(sel("renter_id"))
    .eq("id", bayar.contract_id)
    .maybeSingle()
    .returns<{ renter_id: string }>();
  if (!kontrak) return;

  const { data: tunggakan } = await supabase
    .from("outstanding_payments")
    .select(sel("id, amount_due, amount_paid, status"))
    .eq("renter_id", kontrak.renter_id)
    .neq("status", "lunas")
    .order("due_date", { ascending: true })
    .returns<{ id: string; amount_due: number; amount_paid: number }[]>();

  let tersisa = sisa;
  for (const t of tunggakan ?? []) {
    if (tersisa <= 0) break;
    const kurang = Math.max(0, Number(t.amount_due) - Number(t.amount_paid));
    if (kurang <= 0) continue;
    const nominal = Math.min(kurang, tersisa);
    await alokasikan(paymentId, t.id, nominal, "Alokasi otomatis saat verifikasi");
    tersisa -= nominal;
  }
}

/* ============================ Tunggakan ============================ */

export type FilterTunggakan = {
  cari: string;
  status: string;
  hanyaJatuhTempo: boolean;
};

export const filterTunggakanAwal: FilterTunggakan = {
  cari: "",
  status: "belum",
  hanyaJatuhTempo: false,
};

export type BarisTunggakan = Tunggakan & {
  renters: { id: string; full_name: string; phone: string } | null;
  contracts: { id: string; contract_number: string } | null;
  sisa: number;
  umurHari: number;
};

export async function ambilDaftarTunggakan(f: FilterTunggakan): Promise<{
  baris: BarisTunggakan[];
  totalSisa: number;
  jumlahJatuhTempo: number;
}> {
  const { data, error } = await supabase
    .from("outstanding_payments")
    .select(sel("*, renters(id, full_name, phone), contracts(id, contract_number)"))
    .order("due_date", { ascending: true })
    .returns<BarisTunggakan[]>();
  if (error) throw new Error(pesanGalat(error.message));

  const hariIni = new Date().toISOString().slice(0, 10);
  const semua = (data ?? []).map((t) => ({
    ...t,
    sisa: Math.max(0, Number(t.amount_due) - Number(t.amount_paid)),
    umurHari: Math.max(
      0,
      Math.round((Date.now() - new Date(t.due_date).getTime()) / 86_400_000),
    ),
  }));

  const cari = f.cari.trim().toLowerCase();
  const baris = semua.filter((t) => {
    if (f.status === "belum" && t.status === "lunas") return false;
    if (f.status !== "belum" && f.status !== "semua" && t.status !== f.status) return false;
    if (f.hanyaJatuhTempo && !(t.due_date < hariIni && t.status !== "lunas")) return false;
    if (cari) {
      const teks = [t.description, t.renters?.full_name ?? "", t.contracts?.contract_number ?? ""]
        .join(" ")
        .toLowerCase();
      if (!teks.includes(cari)) return false;
    }
    return true;
  });

  return {
    baris,
    totalSisa: semua
      .filter((t) => t.status !== "lunas")
      .reduce((a, t) => a + t.sisa, 0),
    jumlahJatuhTempo: semua.filter((t) => t.status !== "lunas" && t.due_date < hariIni).length,
  };
}

export async function buatTunggakanManual(nilai: {
  renter_id: string;
  contract_id: string | null;
  description: string;
  amount_due: number;
  due_date: string;
}): Promise<void> {
  if (nilai.amount_due <= 0) throw new Error("Nominal tunggakan harus lebih dari nol.");
  if (!nilai.description.trim()) throw new Error("Keterangan tunggakan wajib diisi.");
  const { error } = await supabase.from("outstanding_payments").insert({
    renter_id: nilai.renter_id,
    contract_id: nilai.contract_id,
    description: nilai.description.trim(),
    amount_due: nilai.amount_due,
    amount_paid: 0,
    due_date: nilai.due_date,
    status: "belum_lunas",
  });
  if (error) throw new Error(pesanGalatPembayaran(error.message));
}

/**
 * Pelunasan tunggakan: membuat pembayaran terverifikasi dengan sumber
 * "pelunasan tunggakan" lalu mengalokasikannya ke tunggakan terkait.
 */
export async function lunasiTunggakan(
  tunggakanId: string,
  nilai: {
    amount: number;
    payment_date: string;
    method: string;
    reference_number: string | null;
    notes: string | null;
  },
): Promise<void> {
  const { data: t, error: galatT } = await supabase
    .from("outstanding_payments")
    .select(sel("id, contract_id, amount_due, amount_paid"))
    .eq("id", tunggakanId)
    .maybeSingle()
    .returns<{ id: string; contract_id: string | null; amount_due: number; amount_paid: number }>();
  if (galatT) throw new Error(pesanGalat(galatT.message));
  if (!t) throw new Error("Tunggakan tidak ditemukan.");
  if (!t.contract_id) {
    throw new Error("Tunggakan ini belum terhubung ke kontrak, catat pembayaran dari kontrak terkait.");
  }
  const sisa = Math.max(0, Number(t.amount_due) - Number(t.amount_paid));
  if (nilai.amount <= 0) throw new Error("Nominal pembayaran harus lebih dari nol.");
  if (nilai.amount > sisa) throw new Error("Nominal melebihi sisa tunggakan.");

  const idBayar = await catatPembayaranStaf({
    contract_id: t.contract_id,
    amount: nilai.amount,
    payment_date: nilai.payment_date,
    method: nilai.method,
    reference_number: nilai.reference_number,
    notes: nilai.notes,
    proof_url: null,
    payment_category: "tunggakan",
    payment_source: "outstanding_settlement",
    izinkanLebih: true,
  });

  const sisaAlokasi = await sisaAlokasiPembayaran(idBayar);
  if (sisaAlokasi > 0) {
    await alokasikan(idBayar, tunggakanId, Math.min(sisaAlokasi, sisa), "Pelunasan tunggakan");
  }
}

export async function kirimPengingatTunggakan(tunggakanId: string): Promise<void> {
  // Notifikasi dibuat lewat fungsi internal berhak (SECURITY DEFINER),
  // klien tidak lagi menulis langsung ke tabel notifications.
  const { error } = await supabase.rpc("kirim_pengingat_tunggakan" as never, {
    _outstanding_id: tunggakanId,
  } as never);
  if (error) throw new Error(pesanGalat(error.message));
}

/* ============================ Ringkasan keuangan ============================ */

export type RingkasanKeuangan = {
  hariIni: number;
  bulanIni: number;
  menungguNominal: number;
  menungguJumlah: number;
  tunggakanNominal: number;
  tunggakanJumlah: number;
  depositDitahan: number;
  perMetode: { metode: string; nominal: number }[];
  perSumber: { sumber: string; nominal: number }[];
};

export async function ringkasanKeuangan(): Promise<RingkasanKeuangan> {
  const [bayar, tunggakan, deposit] = await Promise.all([
    supabase
      .from("payments")
      .select(sel("amount, status, method, payment_source, payment_date"))
      .returns<
        {
          amount: number;
          status: StatusPembayaran;
          method: string;
          payment_source: SumberPembayaran;
          payment_date: string;
        }[]
      >(),
    supabase
      .from("outstanding_payments")
      .select(sel("amount_due, amount_paid, status"))
      .neq("status", "lunas")
      .returns<{ amount_due: number; amount_paid: number }[]>(),
    supabase
      .from("deposits")
      .select(sel("amount, status"))
      .in("status", ["diterima", "ditahan"])
      .returns<{ amount: number }[]>(),
  ]);

  const semua = bayar.data ?? [];
  const hariIni = new Date().toISOString().slice(0, 10);
  const awalBulan = `${hariIni.slice(0, 7)}-01`;
  const lunas = semua.filter((p) => p.status === "lunas");
  const menunggu = semua.filter((p) => p.status === "menunggu_verifikasi");

  const petaMetode = new Map<string, number>();
  const petaSumber = new Map<string, number>();
  for (const p of lunas.filter((x) => x.payment_date >= awalBulan)) {
    petaMetode.set(p.method, (petaMetode.get(p.method) ?? 0) + Number(p.amount));
    petaSumber.set(p.payment_source, (petaSumber.get(p.payment_source) ?? 0) + Number(p.amount));
  }

  return {
    hariIni: lunas
      .filter((p) => p.payment_date === hariIni)
      .reduce((a, p) => a + Number(p.amount), 0),
    bulanIni: lunas
      .filter((p) => p.payment_date >= awalBulan)
      .reduce((a, p) => a + Number(p.amount), 0),
    menungguNominal: menunggu.reduce((a, p) => a + Number(p.amount), 0),
    menungguJumlah: menunggu.length,
    tunggakanNominal: (tunggakan.data ?? []).reduce(
      (a, t) => a + Math.max(0, Number(t.amount_due) - Number(t.amount_paid)),
      0,
    ),
    tunggakanJumlah: (tunggakan.data ?? []).length,
    depositDitahan: (deposit.data ?? []).reduce((a, d) => a + Number(d.amount), 0),
    perMetode: [...petaMetode.entries()].map(([metode, nominal]) => ({ metode, nominal })),
    perSumber: [...petaSumber.entries()].map(([sumber, nominal]) => ({ sumber, nominal })),
  };
}

/* ============================ Kontrak untuk pilihan ============================ */

export type PilihanKontrak = {
  id: string;
  contract_number: string;
  total_amount: number;
  status: string;
  renters: { id: string; full_name: string } | null;
};

export async function ambilKontrakUntukPembayaran(): Promise<PilihanKontrak[]> {
  const { data, error } = await supabase
    .from("contracts")
    .select(sel("id, contract_number, total_amount, status, renters(id, full_name)"))
    .neq("status", "dibatalkan")
    .order("start_date", { ascending: false })
    .returns<PilihanKontrak[]>();
  if (error) throw new Error(pesanGalat(error.message));
  return data ?? [];
}

export function pesanGalatPembayaran(pesan: string): string {
  const p = pesan.toLowerCase();
  if (p.includes("payments_contract_reference_key") || p.includes("reference"))
    return "Nomor referensi ini sudah pernah dicatat pada kontrak yang sama.";
  if (p.includes("tidak dapat diubah") || p.includes("wajib diisi") || p.includes("melebihi"))
    return pesan;
  return pesanGalat(pesan);
}

/* ===================== Pemeriksaan tunggakan harian (Phase 3B) ==================== */

export type HasilPemeriksaanTunggakan = {
  tunggakan_jatuh_tempo: number;
  pengingat_dibuat: number;
};

/**
 * Memeriksa tunggakan yang sudah melewati tanggal jatuh tempo dan membuat
 * pengingat untuk staf serta penyewa terkait. Aman dijalankan berulang karena
 * notifikasi memakai `dedupe_key`. Hanya staf (dijaga di dalam fungsi database).
 */
export async function periksaTunggakanHarian(): Promise<HasilPemeriksaanTunggakan> {
  const { data, error } = await supabase.rpc("periksa_tunggakan_harian");
  if (error) throw new Error(pesanGalat(error.message));
  return (data as unknown as HasilPemeriksaanTunggakan) ?? {
    tunggakan_jatuh_tempo: 0,
    pengingat_dibuat: 0,
  };
}
