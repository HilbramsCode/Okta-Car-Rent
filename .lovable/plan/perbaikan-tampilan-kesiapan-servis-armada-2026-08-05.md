# Perbaikan Tampilan "Kesiapan Servis Armada"

Fokus: hanya lapisan tampilan. Tidak ada perubahan RPC, aturan bisnis, arsitektur, atau data.

## Masalah

1. Label urgensi selalu tampil "-" karena database mengirim `terlambat` / `segera` / `aman`, sementara komponen tabel memetakan `overdue` / `warning` / `ok`.
2. Angka 5.000 km dan 40.000 km terlihat seperti fakta, padahal itu hasil perkiraan: seluruh kendaraan belum punya patokan servis oli/ban, jadi sistem memakai odometer saat ini sebagai titik awal.

## Yang akan dikerjakan

Satu file: `src/components/bi/TabelKesiapan.tsx`

- Ganti peta label menjadi: `terlambat` -> "Lewat jadwal" (merah), `segera` -> "Segera" (aksen merah), `aman` -> "Aman" (abu). Kunci Inggris lama tetap diterima agar tidak ada regresi.
- Deteksi baris tanpa patokan servis tanpa menuliskan angka interval di kode: interval aktif disimpulkan dari data yang sudah dikirim RPC, yaitu nilai sisa km terbesar pada tabel (unit tanpa riwayat servis selalu punya sisa km sebesar interval penuh, yang sekaligus nilai maksimum yang mungkin). Baris dengan sisa km sama dengan nilai itu ditandai "Perkiraan · belum ada riwayat servis" di bawah angka km, gaya teks kecil abu.
- Bila Owner mengubah interval oli atau ban di pengaturan perawatan, penandaan menyesuaikan otomatis karena angkanya diturunkan dari data, bukan nilai tetap di UI.
- Tambahkan satu baris catatan di bawah tabel: menjelaskan bahwa unit tanpa riwayat ganti oli/ban dihitung dari odometer saat ini, sehingga angkanya masih perkiraan.

Tampil otomatis di Analitik Armada dan Analitik Perawatan karena keduanya memakai komponen yang sama.

## Catatan teknis

- Field yang dipakai dari RPC `fleet_maintenance_due`: `oil_remaining`, `oil_urgency`, `tire_remaining`, `tire_urgency`, `current_odometer`.
- Tidak ada angka interval yang di-hardcode di komponen; interval disimpulkan dari `oil_remaining` / `tire_remaining` maksimum pada payload RPC yang sama.
- Tidak ada query, RPC, atau prop tambahan; hanya data yang sudah tersedia yang dipakai, sehingga cache 5 menit dan performa halaman tidak berubah.
- Tidak ada migrasi database dan tidak ada penulisan data.
