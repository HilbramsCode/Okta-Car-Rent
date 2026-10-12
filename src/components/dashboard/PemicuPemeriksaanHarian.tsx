import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { KUNCI_NOTIFIKASI } from "@/components/notifikasi/kunci-notifikasi";
import { periksaKontrakHarian } from "@/lib/contracts";
import { periksaPerawatanHarian } from "@/lib/maintenance";
import { periksaTunggakanHarian } from "@/lib/payments";

const KUNCI_SIMPAN = "okta:pemeriksaan-harian";

/**
 * Menjalankan pemeriksaan harian (kontrak terlambat, pengingat H-7, tunggakan
 * jatuh tempo, serta kesiapan/jadwal perawatan) maksimal sekali per hari per
 * perangkat, saat staf membuka dashboard. Tidak menampilkan apa pun dan tidak
 * memblokir tampilan.
 */
export function PemicuPemeriksaanHarian() {
  const queryClient = useQueryClient();
  const sudahJalan = useRef(false);

  useEffect(() => {
    if (sudahJalan.current) return;
    sudahJalan.current = true;

    const hariIni = new Date().toISOString().slice(0, 10);
    let terakhir: string | null = null;
    try {
      terakhir = window.localStorage.getItem(KUNCI_SIMPAN);
    } catch {
      terakhir = null;
    }
    if (terakhir === hariIni) return;

    void (async () => {
      // Setiap pemeriksaan diisolasi: kegagalan satu pemeriksaan tidak
      // menghentikan pemeriksaan berikutnya.
      let adaPerubahan = false;

      try {
        const hasil = await periksaKontrakHarian();
        adaPerubahan =
          adaPerubahan || hasil.kontrak_terlambat > 0 || hasil.pengingat_dibuat > 0;
      } catch {
        console.error("[PemicuPemeriksaanHarian] Pemeriksaan kontrak gagal");
      }

      try {
        const hasilTunggakan = await periksaTunggakanHarian();
        adaPerubahan = adaPerubahan || hasilTunggakan.pengingat_dibuat > 0;
      } catch {
        console.error("[PemicuPemeriksaanHarian] Pemeriksaan tunggakan gagal");
      }

      try {
        const hasilPerawatan = await periksaPerawatanHarian();
        adaPerubahan = adaPerubahan || hasilPerawatan.pengingat_dibuat > 0;
      } catch {
        console.error("[PemicuPemeriksaanHarian] Pemeriksaan perawatan gagal");
      }

      try {
        window.localStorage.setItem(KUNCI_SIMPAN, hariIni);
      } catch {
        /* penyimpanan lokal tidak tersedia, cukup lanjut */
      }

      if (adaPerubahan) {
        void queryClient.invalidateQueries({ queryKey: KUNCI_NOTIFIKASI.semua });
      }
    })();
  }, [queryClient]);

  return null;
}
