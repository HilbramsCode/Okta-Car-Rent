import { supabase } from "@/integrations/supabase/client";

export type RingkasanOwner = {
  pendapatanHariIni: number;
  pendapatanBulanIni: number;
  kontrakAktif: number;
  kontrakTerlambat: number;
  kendaraanTersedia: number;
  kendaraanTotal: number;
  kendaraanPerawatan: number;
  tunggakanJumlah: number;
  tunggakanNominal: number;
  depositDitahanJumlah: number;
  depositDitahanNominal: number;
};

function tanggalLokal(d: Date): string {
  const bulan = `${d.getMonth() + 1}`.padStart(2, "0");
  const hari = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${bulan}-${hari}`;
}

export async function ambilRingkasanOwner(): Promise<RingkasanOwner> {
  const sekarang = new Date();
  const hariIni = tanggalLokal(sekarang);
  const awalBulan = tanggalLokal(new Date(sekarang.getFullYear(), sekarang.getMonth(), 1));

  const [pembayaran, kontrak, kendaraan, tunggakan, deposit] = await Promise.all([
    supabase
      .from("payments")
      .select("amount, payment_date")
      .eq("status", "lunas")
      .gte("payment_date", awalBulan),
    supabase.from("contracts").select("status").in("status", ["aktif", "terlambat"]),
    supabase.from("vehicles").select("status"),
    supabase
      .from("outstanding_payments")
      .select("amount_due, amount_paid")
      .in("status", ["belum_lunas", "sebagian"]),
    supabase.from("deposits").select("amount").in("status", ["diterima", "ditahan"]),
  ]);

  const galat =
    pembayaran.error ?? kontrak.error ?? kendaraan.error ?? tunggakan.error ?? deposit.error;
  if (galat) throw new Error(galat.message);

  const barisPembayaran = pembayaran.data ?? [];
  const barisKontrak = kontrak.data ?? [];
  const barisKendaraan = kendaraan.data ?? [];
  const barisTunggakan = tunggakan.data ?? [];
  const barisDeposit = deposit.data ?? [];

  return {
    pendapatanHariIni: barisPembayaran
      .filter((p) => p.payment_date === hariIni)
      .reduce((t, p) => t + Number(p.amount ?? 0), 0),
    pendapatanBulanIni: barisPembayaran.reduce((t, p) => t + Number(p.amount ?? 0), 0),
    kontrakAktif: barisKontrak.length,
    kontrakTerlambat: barisKontrak.filter((k) => k.status === "terlambat").length,
    kendaraanTersedia: barisKendaraan.filter((k) => k.status === "tersedia").length,
    kendaraanTotal: barisKendaraan.length,
    kendaraanPerawatan: barisKendaraan.filter((k) => k.status === "perawatan").length,
    tunggakanJumlah: barisTunggakan.length,
    tunggakanNominal: barisTunggakan.reduce(
      (t, r) => t + (Number(r.amount_due ?? 0) - Number(r.amount_paid ?? 0)),
      0,
    ),
    depositDitahanJumlah: barisDeposit.length,
    depositDitahanNominal: barisDeposit.reduce((t, d) => t + Number(d.amount ?? 0), 0),
  };
}
