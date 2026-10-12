# Diagnosis Poin 11 — "Memeriksa kelayakan penyewa…" tidak hilang

## Kesimpulan
Pemeriksaan kelayakan **sudah berjalan otomatis** saat penyewa dipilih. Yang macet adalah **pesan peringatan**, bukan pemeriksaannya. Pesan itu hanya berupa "foto" yang diambil saat tombol Lanjut ditekan, dan tidak pernah diperbarui sendiri.

## Bukti (src/components/contracts/FormKontrak.tsx)
- Baris 105–109: pemeriksaan memakai `useQuery` dengan kunci `renter_id` dan `enabled: renter_id !== ""`. Pemeriksaan langsung berjalan begitu penyewa dipilih, tanpa menunggu tombol Lanjut. **Terbukti.**
- Baris 267–292: kotak hasil (hijau "memenuhi syarat" / merah "belum memenuhi syarat") dibaca langsung dari hasil pemeriksaan, jadi otomatis tampil setelah respons datang.
- Baris 94, 173–181, 237–242: teks "Memeriksa kelayakan penyewa…" berasal dari `validasiLangkah` (baris 151), tetapi hanya disimpan ke state `galat` lewat `setGalat` saat **Lanjut** ditekan. Tidak ada kode lain yang membersihkan atau memperbarui `galat`. Ganti penyewa (`set("renter_id")`, baris 253) juga tidak membersihkannya.
- Akibatnya: kalau Lanjut ditekan saat pemeriksaan belum selesai, teks "Memeriksa…" tetap tampil meski hasilnya sudah ada. Teks baru berubah setelah Lanjut ditekan lagi. Ini persis gejala yang dilaporkan.
- Baris 519: tombol Lanjut tidak dinonaktifkan selama pemeriksaan berjalan. Jadi tombol (yang tetap aktif) dan pesan (yang beku) **tidak membaca sumber state yang sama**.

## Hal yang tidak terbukti jadi penyebab
- Pemeriksaan yang terus loading, error yang tidak ditangani, atau cache basi: tidak ada bukti. Error sudah ditangani di baris 152, dan kunci cache ikut berubah sesuai penyewa dan tanggal.
- Ketergantungan pada tombol Lanjut untuk *menjalankan* pemeriksaan: tidak ada. Tombol hanya dibutuhkan untuk *memperbarui pesan*.
- Belum diuji langsung di browser; diagnosis ini dari membaca kode.

## Perbaikan minimum yang disarankan (hanya FormKontrak.tsx, tanpa database)
1. Tampilkan status pemeriksaan langsung dari hasil pemeriksaan, tidak dari `galat`. Di bawah pilihan penyewa, tampilkan "Memeriksa kelayakan penyewa…" selama pemeriksaan berjalan, dan "Pemeriksaan gagal" + tombol Coba lagi (`kelayakan.refetch()`) kalau gagal.
2. Bersihkan `galat` setiap kali penyewa diganti, dan setiap kali hasil pemeriksaan berubah.
3. Nonaktifkan tombol Lanjut di langkah 1 selama pemeriksaan berjalan atau gagal.

Yang tidak diubah: pengamanan database Poin 11, aturan penimpaan khusus Owner, alasan minimal 10 karakter, validasi saat kirim (baris 183–192), dan perilaku edit draft.

## Tes setelah perbaikan
- Pilih penyewa: status berubah sendiri dari "Memeriksa…" ke hijau/merah tanpa menekan Lanjut.
- Tekan Lanjut secepat mungkin: tombol nonaktif sampai hasil keluar, dan tidak ada pesan yang beku.
- Admin + penyewa belum terverifikasi: tetap tertahan. Owner: alasan kurang dari 10 karakter tetap ditolak.
- Edit draft: data penyewa awal langsung diperiksa seperti biasa.
