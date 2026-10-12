export type Tone = "netral" | "sukses" | "peringatan" | "bahaya" | "info";

type Entry = { label: string; tone: Tone };

export const statusKendaraan: Record<string, Entry> = {
  tersedia: { label: "Tersedia", tone: "sukses" },
  disewa: { label: "Sedang Disewa", tone: "info" },
  perawatan: { label: "Dalam Perawatan", tone: "peringatan" },
  tidak_aktif: { label: "Tidak Aktif", tone: "netral" },
};

export const statusKontrak: Record<string, Entry> = {
  draft: { label: "Draft", tone: "netral" },
  aktif: { label: "Aktif", tone: "sukses" },
  terlambat: { label: "Terlambat", tone: "bahaya" },
  selesai: { label: "Selesai", tone: "info" },
  dibatalkan: { label: "Dibatalkan", tone: "netral" },
};

export const statusPembayaran: Record<string, Entry> = {
  menunggu_verifikasi: { label: "Menunggu Verifikasi", tone: "peringatan" },
  lunas: { label: "Lunas", tone: "sukses" },
  ditolak: { label: "Ditolak", tone: "bahaya" },
};

export const statusTunggakan: Record<string, Entry> = {
  belum_lunas: { label: "Belum Lunas", tone: "bahaya" },
  sebagian: { label: "Dibayar Sebagian", tone: "peringatan" },
  lunas: { label: "Lunas", tone: "sukses" },
};

export const statusDeposit: Record<string, Entry> = {
  menunggu_penerimaan: { label: "Menunggu Penerimaan", tone: "peringatan" },
  diterima: { label: "Diterima", tone: "info" },
  ditahan: { label: "Ditahan", tone: "peringatan" },
  sebagian_dikembalikan: { label: "Dikembalikan Sebagian", tone: "info" },
  dikembalikan: { label: "Sudah Dikembalikan", tone: "sukses" },
  disita: { label: "Disita", tone: "bahaya" },
  dibatalkan: { label: "Dibatalkan", tone: "bahaya" },
};

export const statusPerawatan: Record<string, Entry> = {
  dijadwalkan: { label: "Dijadwalkan", tone: "info" },
  dikerjakan: { label: "Sedang Dikerjakan", tone: "peringatan" },
  selesai: { label: "Selesai", tone: "sukses" },
  dibatalkan: { label: "Dibatalkan", tone: "netral" },
};

export const statusVerifikasi: Record<string, Entry> = {
  belum_diverifikasi: { label: "Belum Diverifikasi", tone: "peringatan" },
  terverifikasi: { label: "Terverifikasi", tone: "sukses" },
  ditolak: { label: "Ditolak", tone: "bahaya" },
};

export const labelPeran: Record<string, string> = {
  owner: "Pemilik",
  admin: "Admin",
  renter: "Penyewa",
};

export const labelTipeSewa: Record<string, string> = {
  harian: "Harian",
  mingguan: "Mingguan",
  bulanan: "Bulanan",
};

export const labelTipePerawatan: Record<string, string> = {
  servis_rutin: "Servis Rutin",
  perbaikan: "Perbaikan",
  ganti_oli: "Ganti Oli",
  ganti_ban: "Ganti Ban",
  perpanjangan_stnk: "Perpanjangan STNK",
  lainnya: "Lainnya",
};

export const labelMetodeBayar: Record<string, string> = {
  tunai: "Tunai",
  transfer: "Transfer Bank",
  qris: "QRIS",
  kartu_debit: "Kartu Debit",
  kartu_kredit: "Kartu Kredit",
};

export function ambilLabel(map: Record<string, Entry>, key: string | null | undefined): Entry {
  if (!key) return { label: "-", tone: "netral" };
  return map[key] ?? { label: key.replace(/_/g, " "), tone: "netral" };
}