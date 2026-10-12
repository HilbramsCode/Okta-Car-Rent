const LABEL_RIWAYAT: Record<string, string> = {
  kontrak: "kontrak",
  deposit: "deposit",
  tunggakan: "tunggakan",
  catatan: "catatan penyewa",
};

/** Turns a refusal code from promote_renter_to_admin into a friendly Indonesian message. */
export function pesanGagalPromosi(raw: string): string {
  if (raw.includes("TIDAK_LOGIN")) return "Sesi Anda berakhir. Silakan masuk kembali.";
  if (raw.includes("BUKAN_PEMILIK")) return "Hanya Pemilik yang dapat menjadikan akun sebagai Admin.";
  if (raw.includes("TARGET_DIRI_SENDIRI")) return "Anda tidak dapat mengubah peran akun Anda sendiri.";
  if (raw.includes("TARGET_BUKAN_PENYEWA"))
    return "Hanya akun dengan satu peran Penyewa yang dapat dijadikan Admin.";
  if (raw.includes("DATA_PENYEWA_TIDAK_ADA")) return "Data penyewa untuk akun ini tidak ditemukan.";
  const m = raw.match(/PUNYA_RIWAYAT:([a-z,]+)/);
  if (m) {
    const daftar = m[1].split(",").map((k) => LABEL_RIWAYAT[k] ?? k);
    return `Akun ini sudah memiliki riwayat (${daftar.join(", ")}), sehingga tidak dapat dijadikan Admin.`;
  }
  return "Gagal menjadikan Admin. Silakan coba lagi.";
}
