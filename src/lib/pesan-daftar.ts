export const PESAN_DAFTAR_GENERIK =
  "Pendaftaran belum berhasil. Periksa data Anda (termasuk nomor telepon) atau coba lagi nanti.";
export const PESAN_SANDI_LEMAH =
  "Kata sandi ini terlalu umum atau pernah ditemukan dalam kebocoran data. Coba gunakan kata sandi unik yang belum pernah Anda pakai di akun lain.";
export const PESAN_EMAIL_TERDAFTAR = "Email sudah terdaftar. Silakan masuk.";
export const PESAN_RATE_LIMIT = "Terlalu banyak percobaan. Coba lagi beberapa saat lagi.";

type ErrorLike = { message?: unknown; status?: unknown } | null | undefined;

/** Maps a sign-up error to a user-facing Indonesian message. Never returns raw server text. */
export function pesanGagalDaftar(error: unknown): string {
  const e = (error && typeof error === "object" ? error : {}) as ErrorLike;
  const status = typeof e?.status === "number" ? e.status : undefined;
  const msg = typeof e?.message === "string" ? e.message.trim().toLowerCase() : "";

  if (status !== undefined && status >= 500) return PESAN_DAFTAR_GENERIK;
  if (!msg || msg === "{}" || msg.includes("database error")) return PESAN_DAFTAR_GENERIK;
  if ((msg.includes("weak") && msg.includes("guess")) || msg.includes("pwned") || msg.includes("leaked"))
    return PESAN_SANDI_LEMAH;
  if (msg.includes("already")) return PESAN_EMAIL_TERDAFTAR;
  if (msg.includes("rate limit")) return PESAN_RATE_LIMIT;
  return PESAN_DAFTAR_GENERIK;
}
