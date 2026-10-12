/** Kunci React Query untuk data notifikasi. */
export const KUNCI_NOTIFIKASI = {
  ringkas: ["notifikasi", "ringkas"] as const,
  belumDibaca: ["notifikasi", "belum-dibaca"] as const,
  daftar: (filter: "semua" | "belum-dibaca") => ["notifikasi", "daftar", filter] as const,
  semua: ["notifikasi"] as const,
};
