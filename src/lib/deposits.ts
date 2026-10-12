import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { pesanGalat } from "@/lib/vehicles";

export type Deposit = Database["public"]["Tables"]["deposits"]["Row"];
export type PotonganDeposit = Database["public"]["Tables"]["deposit_deductions"]["Row"];
export type StatusDeposit = Database["public"]["Enums"]["deposit_status"];
export type LogAuditDeposit = Database["public"]["Tables"]["audit_logs"]["Row"];

export const NOMINAL_DEPOSIT = 500000;
export const BUCKET_INVOICE = "payment-proofs";

const sel = (s: string): string => s;

export const OPSI_STATUS_DEPOSIT: { value: StatusDeposit; label: string }[] = [
  { value: "menunggu_penerimaan", label: "Menunggu Penerimaan" },
  { value: "ditahan", label: "Ditahan" },
  { value: "sebagian_dikembalikan", label: "Dikembalikan Sebagian" },
  { value: "dikembalikan", label: "Sudah Dikembalikan" },
  { value: "disita", label: "Disita" },
  { value: "dibatalkan", label: "Dibatalkan" },
];

export const OPSI_JENIS_POTONGAN = [
  { value: "tunggakan", label: "Tunggakan Pembayaran" },
  { value: "kerusakan", label: "Kerusakan / Kecelakaan" },
  { value: "denda", label: "Denda" },
  { value: "bahan_bakar", label: "Kekurangan Bahan Bakar" },
  { value: "lainnya", label: "Lainnya" },
];

export const labelJenisPotongan = (v: string | null | undefined): string =>
  OPSI_JENIS_POTONGAN.find((o) => o.value === v)?.label ?? "Lainnya";

export const OPSI_METODE_TERIMA = [
  { value: "tunai", label: "Tunai" },
  { value: "transfer", label: "Transfer Bank" },
  { value: "qris", label: "QRIS" },
];

/* ============================ Berkas ============================ */

export async function unggahInvoiceBengkel(file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `invoice-bengkel/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET_INVOICE).upload(path, file, {
    upsert: false,
  });
  if (error) throw new Error(pesanGalat(error.message));
  return path;
}

/* ============================ Daftar ============================ */

export type BarisDeposit = Deposit & {
  contracts: {
    contract_number: string;
    status: string;
    start_date: string;
    end_date: string;
  } | null;
  renters: { id: string; full_name: string; phone: string } | null;
  total_potongan: number;
};

export type FilterDeposit = {
  cari: string;
  status: StatusDeposit | "semua";
};

export const filterDepositAwal: FilterDeposit = { cari: "", status: "semua" };

const KOLOM_DEPOSIT = sel(
  "*, contracts(contract_number, status, start_date, end_date), renters(id, full_name, phone)",
);

export async function ambilDaftarDeposit(filter: FilterDeposit): Promise<BarisDeposit[]> {
  let q = supabase.from("deposits").select(KOLOM_DEPOSIT).order("created_at", { ascending: false });
  if (filter.status !== "semua") q = q.eq("status", filter.status);

  const { data, error } = await q.returns<BarisDeposit[]>();
  if (error) throw new Error(pesanGalat(error.message));

  const baris = data ?? [];
  const potongan = await totalPotonganPerDeposit(baris.map((b) => b.id));
  const cari = filter.cari.trim().toLowerCase();

  return baris
    .map((b) => ({ ...b, total_potongan: potongan[b.id] ?? 0 }))
    .filter((b) => {
      if (!cari) return true;
      return (
        (b.renters?.full_name ?? "").toLowerCase().includes(cari) ||
        (b.contracts?.contract_number ?? "").toLowerCase().includes(cari) ||
        (b.renters?.phone ?? "").includes(cari)
      );
    });
}

async function totalPotonganPerDeposit(ids: string[]): Promise<Record<string, number>> {
  if (ids.length === 0) return {};
  const { data, error } = await supabase
    .from("deposit_deductions")
    .select(sel("deposit_id, amount"))
    .in("deposit_id", ids)
    .returns<{ deposit_id: string; amount: number }[]>();
  if (error) throw new Error(pesanGalat(error.message));
  const hasil: Record<string, number> = {};
  for (const p of data ?? []) {
    hasil[p.deposit_id] = (hasil[p.deposit_id] ?? 0) + Number(p.amount);
  }
  return hasil;
}

export type RingkasanDeposit = {
  ditahanNominal: number;
  ditahanJumlah: number;
  menungguJumlah: number;
  dikembalikanBulanIni: number;
  disitaJumlah: number;
};

export async function ambilRingkasanDeposit(): Promise<RingkasanDeposit> {
  const { data, error } = await supabase
    .from("deposits")
    .select(sel("amount, status, refund_amount, refund_date"))
    .returns<
      { amount: number; status: StatusDeposit; refund_amount: number | null; refund_date: string | null }[]
    >();
  if (error) throw new Error(pesanGalat(error.message));

  const awalBulan = new Date();
  awalBulan.setDate(1);
  const batas = awalBulan.toISOString().slice(0, 10);

  const baris = data ?? [];
  return {
    ditahanNominal: baris
      .filter((d) => d.status === "ditahan")
      .reduce((t, d) => t + Number(d.amount), 0),
    ditahanJumlah: baris.filter((d) => d.status === "ditahan").length,
    menungguJumlah: baris.filter((d) => d.status === "menunggu_penerimaan").length,
    dikembalikanBulanIni: baris
      .filter((d) => d.refund_date !== null && d.refund_date >= batas)
      .reduce((t, d) => t + Number(d.refund_amount ?? 0), 0),
    disitaJumlah: baris.filter((d) => d.status === "disita").length,
  };
}

/* ============================ Detail ============================ */

export type PratinjauPenyelesaian = {
  deposit: number;
  potongan: number;
  sisa: number;
  tunggakan: number;
  usulan_potongan_tunggakan: number;
  nominal_pengembalian: number;
};

export type DetailDeposit = {
  deposit: BarisDeposit;
  potongan: PotonganDeposit[];
  pratinjau: PratinjauPenyelesaian;
  audit: LogAuditDeposit[];
};

export async function ambilDetailDeposit(id: string): Promise<DetailDeposit> {
  const { data, error } = await supabase
    .from("deposits")
    .select(KOLOM_DEPOSIT)
    .eq("id", id)
    .maybeSingle()
    .returns<BarisDeposit>();
  if (error) throw new Error(pesanGalat(error.message));
  if (!data) throw new Error("Deposit tidak ditemukan.");

  const [potongan, pratinjau, audit] = await Promise.all([
    supabase
      .from("deposit_deductions")
      .select("*")
      .eq("deposit_id", id)
      .order("created_at", { ascending: false })
      .returns<PotonganDeposit[]>(),
    supabase.rpc("deposit_settlement_preview", { _deposit_id: id }),
    supabase
      .from("audit_logs")
      .select("*")
      .eq("entity_id", id)
      .order("created_at", { ascending: false })
      .limit(30)
      .returns<LogAuditDeposit[]>(),
  ]);

  if (potongan.error) throw new Error(pesanGalat(potongan.error.message));
  if (pratinjau.error) throw new Error(pesanGalat(pratinjau.error.message));

  const daftar = potongan.data ?? [];
  const total = daftar.reduce((t, p) => t + Number(p.amount), 0);

  return {
    deposit: { ...data, total_potongan: total },
    potongan: daftar,
    pratinjau: (pratinjau.data as unknown as PratinjauPenyelesaian) ?? {
      deposit: Number(data.amount),
      potongan: total,
      sisa: Math.max(0, Number(data.amount) - total),
      tunggakan: 0,
      usulan_potongan_tunggakan: 0,
      nominal_pengembalian: Math.max(0, Number(data.amount) - total),
    },
    audit: audit.data ?? [],
  };
}

/* ============================ Aksi ============================ */

export async function terimaDeposit(
  id: string,
  nilai: { received_date: string; received_method: string; proof_url: string | null; catatan: string | null },
): Promise<void> {
  const { data: sesi } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("deposits")
    .update({
      status: "ditahan",
      received_date: nilai.received_date,
      received_method: nilai.received_method,
      proof_url: nilai.proof_url,
      notes: nilai.catatan,
      handled_by: sesi.user?.id ?? null,
    })
    .eq("id", id);
  if (error) throw new Error(pesanGalatDeposit(error.message));
}

export async function tambahPotongan(
  depositId: string,
  nilai: {
    reason: string;
    description: string | null;
    amount: number;
    deduction_type: string;
    workshop_invoice_url?: string | null;
    workshop_name?: string | null;
    invoice_number?: string | null;
    invoice_date?: string | null;
  },
): Promise<void> {
  const { data: sesi } = await supabase.auth.getUser();
  const { error } = await supabase.from("deposit_deductions").insert({
    deposit_id: depositId,
    reason: nilai.reason,
    description: nilai.description,
    amount: nilai.amount,
    deduction_type: nilai.deduction_type,
    workshop_invoice_url: nilai.workshop_invoice_url ?? null,
    workshop_name: nilai.workshop_name ?? null,
    invoice_number: nilai.invoice_number ?? null,
    invoice_date: nilai.invoice_date ?? null,
    created_by: sesi.user?.id ?? null,
  });
  if (error) throw new Error(pesanGalatDeposit(error.message));
}

export async function catatBiayaKerusakan(
  depositId: string,
  nilai: {
    reason: string;
    description: string | null;
    amount: number;
    workshop_invoice_url: string;
    workshop_name: string | null;
    invoice_number: string | null;
    invoice_date: string | null;
  },
): Promise<{ dipotong: number; luapan_tunggakan: number }> {
  const { data, error } = await supabase.rpc("apply_deposit_damage_deduction", {
    _deposit_id: depositId,
    _reason: nilai.reason,
    _description: nilai.description ?? "",
    _amount: nilai.amount,
    _workshop_invoice_url: nilai.workshop_invoice_url,
    _workshop_name: nilai.workshop_name ?? "",
    _invoice_number: nilai.invoice_number ?? "",
    _invoice_date: nilai.invoice_date ?? new Date().toISOString().slice(0, 10),
  });
  if (error) throw new Error(pesanGalatDeposit(error.message));
  return data as unknown as { dipotong: number; luapan_tunggakan: number };
}

export async function hapusPotongan(id: string): Promise<void> {
  const { error } = await supabase.from("deposit_deductions").delete().eq("id", id);
  if (error) throw new Error(pesanGalatDeposit(error.message));
}

export type MasukanPengembalian = {
  refund_date: string;
  refund_bank_name: string;
  refund_account_number: string;
  refund_account_holder: string;
  refund_proof_url: string;
  catatan: string | null;
};

export async function prosesPengembalian(
  id: string,
  nilai: MasukanPengembalian,
): Promise<void> {
  const detail = await ambilDetailDeposit(id);
  const dep = detail.deposit;

  if (dep.status === "menunggu_penerimaan" || dep.status === "dibatalkan") {
    throw new Error("Deposit belum diterima sehingga tidak dapat dikembalikan.");
  }
  if (dep.refund_date) throw new Error("Deposit ini sudah dikembalikan.");
  if (dep.contracts && dep.contracts.status !== "selesai" && dep.contracts.status !== "dibatalkan") {
    throw new Error("Kontrak harus selesai sebelum deposit dikembalikan.");
  }
  if (!nilai.refund_proof_url) throw new Error("Bukti transfer wajib diunggah.");
  if (!nilai.refund_bank_name.trim() || !nilai.refund_account_number.trim() || !nilai.refund_account_holder.trim()) {
    throw new Error("Data rekening tujuan wajib dilengkapi.");
  }

  const nominal = Math.max(0, Number(dep.amount) - detail.deposit.total_potongan);
  const { data: sesi } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("deposits")
    .update({
      refund_amount: nominal,
      refund_method: "transfer",
      refund_date: nilai.refund_date,
      refund_bank_name: nilai.refund_bank_name.trim(),
      refund_account_number: nilai.refund_account_number.trim(),
      refund_account_holder: nilai.refund_account_holder.trim(),
      refund_proof_url: nilai.refund_proof_url,
      status: nominal <= 0 ? "disita" : detail.deposit.total_potongan > 0 ? "sebagian_dikembalikan" : "dikembalikan",
      handled_by: sesi.user?.id ?? null,
      notes: nilai.catatan,
    })
    .eq("id", id);
  if (error) throw new Error(pesanGalatDeposit(error.message));
}

export async function balikkanPengembalian(id: string, alasan: string): Promise<void> {
  if (!alasan.trim()) throw new Error("Alasan pembalikan wajib diisi.");
  const { error } = await supabase
    .from("deposits")
    .update({
      refund_date: null,
      refund_method: null,
      refund_amount: null,
      refund_proof_url: null,
      status: "ditahan",
      reversal_reason: alasan.trim(),
    })
    .eq("id", id);
  if (error) throw new Error(pesanGalatDeposit(error.message));
}

export async function batalkanDeposit(id: string, alasan: string): Promise<void> {
  const { error } = await supabase
    .from("deposits")
    .update({ status: "dibatalkan", notes: alasan })
    .eq("id", id);
  if (error) throw new Error(pesanGalatDeposit(error.message));
}

/* ============================ Portal penyewa ============================ */

export async function ambilDepositSaya(): Promise<
  { deposit: BarisDeposit; potongan: PotonganDeposit[] }[]
> {
  const { data, error } = await supabase
    .from("deposits")
    .select(KOLOM_DEPOSIT)
    .order("created_at", { ascending: false })
    .returns<BarisDeposit[]>();
  if (error) throw new Error(pesanGalat(error.message));

  const baris = data ?? [];
  if (baris.length === 0) return [];

  const { data: potongan, error: galatPotongan } = await supabase
    .from("deposit_deductions")
    .select("*")
    .in(
      "deposit_id",
      baris.map((b) => b.id),
    )
    .order("created_at", { ascending: false })
    .returns<PotonganDeposit[]>();
  if (galatPotongan) throw new Error(pesanGalat(galatPotongan.message));

  return baris.map((b) => {
    const milik = (potongan ?? []).filter((p) => p.deposit_id === b.id);
    return {
      deposit: { ...b, total_potongan: milik.reduce((t, p) => t + Number(p.amount), 0) },
      potongan: milik,
    };
  });
}

export function pesanGalatDeposit(pesan: string): string {
  const p = pesan.toLowerCase();
  if (p.includes("deposits_amount_fixed_check")) {
    return "Nominal deposit harus Rp 500.000.";
  }
  if (
    p.includes("deposit") ||
    p.includes("potongan") ||
    p.includes("invoice bengkel") ||
    p.includes("pengembalian")
  ) {
    return pesan;
  }
  return pesanGalat(pesan);
}