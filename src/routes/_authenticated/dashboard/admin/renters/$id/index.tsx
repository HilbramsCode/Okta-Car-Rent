import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Pencil, UserRound } from "lucide-react";

import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { RoleGate } from "@/components/dashboard/RoleGate";
import { BerkasPenyewa } from "@/components/renters/BerkasPenyewa";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatRupiah, formatTanggal, formatTanggalSingkat } from "@/lib/format";
import {
  statusDeposit,
  statusKontrak,
  statusPembayaran,
  statusTunggakan,
  statusVerifikasi,
} from "@/lib/labels";
import {
  aktifkanPenyewa,
  ambilDetailPenyewa,
  bolehBuatKontrak,
  hapusCatatanPenyewa,
  nonaktifkanPenyewa,
  statusDokumenPenyewa,
  tambahCatatanPenyewa,
  verifikasiPenyewa,
  type DetailPenyewa,
  type StatusVerifikasi,
} from "@/lib/renters";

export const Route = createFileRoute("/_authenticated/dashboard/admin/renters/$id/")({
  head: () => ({
    meta: [
      { title: "Detail Penyewa | Okta Car Rent" },
      {
        name: "description",
        content:
          "Profil lengkap penyewa: dokumen identitas, status verifikasi, riwayat sewa, pembayaran, deposit, dan catatan internal.",
      },
      { property: "og:title", content: "Detail Penyewa | Okta Car Rent" },
      {
        property: "og:description",
        content: "Ringkasan data penyewa rental mobil beserta riwayat transaksi dan verifikasi dokumen.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RoleGate allow={["owner", "admin"]}>
      <DashboardShell peran="Manajemen Penyewa" judul="Detail Penyewa">
        <HalamanDetailPenyewa />
      </DashboardShell>
    </RoleGate>
  ),
});

function HalamanDetailPenyewa() {
  const { id } = Route.useParams();
  const navigate = useNavigate();

  const detail = useQuery({
    queryKey: ["penyewa", id],
    queryFn: () => ambilDetailPenyewa(id),
  });

  if (detail.isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  if (detail.isError || !detail.data) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-6">
        <p className="text-base font-semibold text-destructive">Data penyewa tidak dapat dimuat.</p>
        <p className="mt-1 text-base text-muted-foreground">
          {detail.error instanceof Error ? detail.error.message : "Terjadi kesalahan."}
        </p>
        <Button size="lg" className="mt-4 text-base" onClick={() => detail.refetch()}>
          Coba lagi
        </Button>
      </div>
    );
  }

  const d = detail.data;

  return (
    <div className="space-y-6">
      <Profil detail={d} />
      <Verifikasi detail={d} />
      <Dokumen detail={d} />
      <Keuangan detail={d} />
      <RiwayatSewa detail={d} />
      <RiwayatPembayaran detail={d} />
      <Deposit detail={d} />
      <Tunggakan detail={d} />
      <Catatan detail={d} />
      <StatusAkun detail={d} />

      <Button
        variant="outline"
        size="lg"
        className="text-base"
        onClick={() => navigate({ to: "/dashboard/admin/renters" })}
      >
        ← Kembali ke daftar penyewa
      </Button>
    </div>
  );
}

function Kotak({ judul, children }: { judul: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-card p-5">
      <h2 className="font-heading text-xl font-bold text-foreground">{judul}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Baris({ label, nilai }: { label: string; nilai: React.ReactNode }) {
  return (
    <div>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-base text-foreground">{nilai || "-"}</dd>
    </div>
  );
}

function Profil({ detail }: { detail: DetailPenyewa }) {
  const p = detail.penyewa;
  const dok = statusDokumenPenyewa(p);
  return (
    <section className="rounded-lg border border-border bg-card p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4">
          {detail.fotoUrl ? (
            <img
              src={detail.fotoUrl}
              alt={p.full_name}
              className="size-20 rounded-full object-cover"
            />
          ) : (
            <div className="flex size-20 items-center justify-center rounded-full bg-muted">
              <UserRound className="size-8 text-muted-foreground" aria-hidden />
            </div>
          )}
          <div>
            <h1 className="font-heading text-2xl font-bold text-foreground">{p.full_name}</h1>
            <p className="text-base text-muted-foreground">{p.phone}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <StatusBadge map={statusVerifikasi} value={p.verification_status} />
              {!p.is_active && (
                <span className="rounded-md bg-muted px-2 py-1 text-sm text-muted-foreground">
                  Nonaktif
                </span>
              )}
            </div>
          </div>
        </div>
        <Button asChild size="lg" className="text-base">
          <Link to="/dashboard/admin/renters/$id/edit" params={{ id: p.id }}>
            <Pencil className="mr-2 size-4" /> Ubah Data
          </Link>
        </Button>
      </div>

      {!bolehBuatKontrak(p) && (
        <p className="mt-4 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-base text-destructive">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          Penyewa belum dapat membuat kontrak baru. Pastikan status verifikasi
          &ldquo;Terverifikasi&rdquo; dan akun masih aktif.
        </p>
      )}
      {dok.dokumenKurang.length > 0 && (
        <p className="mt-3 text-base text-muted-foreground">
          Dokumen belum lengkap: {dok.dokumenKurang.join(", ")}.
        </p>
      )}
      {dok.simKedaluwarsa && (
        <p className="mt-2 text-base font-semibold text-destructive">
          SIM sudah kedaluwarsa ({formatTanggalSingkat(p.driving_license_expiry)}).
        </p>
      )}
      {dok.simSegera && (
        <p className="mt-2 text-base font-semibold text-foreground">
          SIM akan habis masa berlaku pada {formatTanggalSingkat(p.driving_license_expiry)}.
        </p>
      )}

      <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Baris label="Email" nilai={p.email} />
        <Baris label="Pekerjaan" nilai={p.occupation} />
        <Baris label="Kota" nilai={p.city} />
        <Baris label="Alamat" nilai={p.address} />
        <Baris label="Nomor KTP" nilai={p.id_card_number} />
        <Baris label="Nomor SIM" nilai={p.driving_license_number} />
        <Baris label="Masa Berlaku SIM" nilai={formatTanggalSingkat(p.driving_license_expiry)} />
        <Baris label="Kontak Darurat" nilai={p.emergency_contact_name} />
        <Baris label="Nomor Kontak Darurat" nilai={p.emergency_contact_phone} />
        <Baris label="Terdaftar Sejak" nilai={formatTanggal(p.created_at)} />
        <Baris
          label="Kontrak Berjalan"
          nilai={detail.kontrakBerjalan ? detail.kontrakBerjalan.contract_number : "Tidak ada"}
        />
        <Baris label="Catatan Umum" nilai={p.notes} />
      </dl>
    </section>
  );
}

function Verifikasi({ detail }: { detail: DetailPenyewa }) {
  const p = detail.penyewa;
  const queryClient = useQueryClient();
  const [alasan, setAlasan] = useState("");
  const dok = statusDokumenPenyewa(p);

  const ubah = useMutation({
    mutationFn: (arg: { status: StatusVerifikasi; alasan: string | null }) =>
      verifikasiPenyewa(p.id, arg.status, arg.alasan),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["penyewa", p.id] });
      queryClient.invalidateQueries({ queryKey: ["penyewa-daftar"] });
      toast.success("Status verifikasi diperbarui.");
      setAlasan("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Kotak judul="Verifikasi Dokumen">
      <div className="space-y-4">
        <p className="text-base text-muted-foreground">
          Status saat ini: <StatusBadge map={statusVerifikasi} value={p.verification_status} />
          {p.verified_at && ` · diperbarui ${formatTanggal(p.verified_at)}`}
        </p>
        {p.verification_status === "ditolak" && p.verification_reason && (
          <p className="text-base text-destructive">Alasan penolakan: {p.verification_reason}</p>
        )}

        <div className="space-y-2">
          <Label htmlFor="alasan-tolak" className="text-base">
            Alasan penolakan (wajib jika menolak)
          </Label>
          <Textarea
            id="alasan-tolak"
            rows={2}
            value={alasan}
            onChange={(e) => setAlasan(e.target.value)}
            className="text-base"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            size="lg"
            className="text-base"
            disabled={ubah.isPending || !dok.ktpAda || !dok.simAda}
            onClick={() => ubah.mutate({ status: "terverifikasi", alasan: null })}
          >
            Setujui Verifikasi
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="text-base"
            disabled={ubah.isPending}
            onClick={() => {
              if (alasan.trim().length < 5) {
                toast.error("Isi alasan penolakan minimal 5 karakter.");
                return;
              }
              ubah.mutate({ status: "ditolak", alasan: alasan.trim() });
            }}
          >
            Tolak Verifikasi
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="text-base"
            disabled={ubah.isPending}
            onClick={() => ubah.mutate({ status: "belum_diverifikasi", alasan: null })}
          >
            Setel Ulang ke Belum Diverifikasi
          </Button>
        </div>
        {(!dok.ktpAda || !dok.simAda) && (
          <p className="text-base text-muted-foreground">
            Verifikasi hanya dapat disetujui setelah nomor dan berkas KTP serta SIM lengkap.
          </p>
        )}
      </div>
    </Kotak>
  );
}

function Dokumen({ detail }: { detail: DetailPenyewa }) {
  const p = detail.penyewa;
  return (
    <Kotak judul="Berkas Penyewa">
      <div className="grid gap-4 lg:grid-cols-3">
        <BerkasPenyewa
          renterId={p.id}
          jenis="foto"
          judul="Foto Profil"
          path={p.avatar_url}
          url={detail.fotoUrl}
        />
        <BerkasPenyewa
          renterId={p.id}
          jenis="ktp"
          judul="Foto KTP"
          path={p.id_card_url}
          url={detail.ktpUrl}
        />
        <BerkasPenyewa
          renterId={p.id}
          jenis="sim"
          judul="Foto SIM"
          path={p.driving_license_url}
          url={detail.simUrl}
        />
      </div>
    </Kotak>
  );
}

function Keuangan({ detail }: { detail: DetailPenyewa }) {
  const r = detail.ringkasanUang;
  const item = [
    { label: "Total Pembayaran Lunas", nilai: formatRupiah(r.totalPembayaran) },
    { label: "Total Tunggakan", nilai: formatRupiah(r.tunggakan) },
    { label: "Total Deposit", nilai: formatRupiah(r.totalDeposit) },
    { label: "Deposit Dikembalikan", nilai: formatRupiah(r.depositDikembalikan) },
  ];
  return (
    <section aria-label="Ringkasan keuangan" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {item.map((i) => (
        <div key={i.label} className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">{i.label}</p>
          <p className="mt-1 font-heading text-xl font-bold text-foreground">{i.nilai}</p>
        </div>
      ))}
    </section>
  );
}

function Kosong({ pesan }: { pesan: string }) {
  return <p className="text-base text-muted-foreground">{pesan}</p>;
}

function RiwayatSewa({ detail }: { detail: DetailPenyewa }) {
  return (
    <Kotak judul="Riwayat Sewa">
      {detail.kontrak.length === 0 ? (
        <Kosong pesan="Belum ada kontrak sewa untuk penyewa ini." />
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-base">Nomor Kontrak</TableHead>
                <TableHead className="text-base">Kendaraan</TableHead>
                <TableHead className="text-base">Mulai</TableHead>
                <TableHead className="text-base">Selesai</TableHead>
                <TableHead className="text-base">Total</TableHead>
                <TableHead className="text-base">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {detail.kontrak.map((k) => (
                <TableRow key={k.id}>
                  <TableCell className="text-base font-semibold">{k.contract_number}</TableCell>
                  <TableCell className="text-base">
                    {k.vehicles
                      ? `${k.vehicles.brand} ${k.vehicles.model} · ${k.vehicles.plate_number}`
                      : "-"}
                  </TableCell>
                  <TableCell className="text-base">{formatTanggalSingkat(k.start_date)}</TableCell>
                  <TableCell className="text-base">{formatTanggalSingkat(k.end_date)}</TableCell>
                  <TableCell className="text-base">{formatRupiah(k.total_amount)}</TableCell>
                  <TableCell>
                    <StatusBadge map={statusKontrak} value={k.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </Kotak>
  );
}

function RiwayatPembayaran({ detail }: { detail: DetailPenyewa }) {
  return (
    <Kotak judul="Riwayat Pembayaran">
      {detail.pembayaran.length === 0 ? (
        <Kosong pesan="Belum ada pembayaran tercatat." />
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-base">Nomor Invoice</TableHead>
                <TableHead className="text-base">Tanggal</TableHead>
                <TableHead className="text-base">Metode</TableHead>
                <TableHead className="text-base">Nominal</TableHead>
                <TableHead className="text-base">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {detail.pembayaran.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="text-base font-semibold">{b.invoice_number}</TableCell>
                  <TableCell className="text-base">{formatTanggalSingkat(b.payment_date)}</TableCell>
                  <TableCell className="text-base">{b.method}</TableCell>
                  <TableCell className="text-base">{formatRupiah(b.amount)}</TableCell>
                  <TableCell>
                    <StatusBadge map={statusPembayaran} value={b.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </Kotak>
  );
}

function Deposit({ detail }: { detail: DetailPenyewa }) {
  return (
    <Kotak judul="Riwayat Deposit">
      {detail.deposit.length === 0 ? (
        <Kosong pesan="Belum ada deposit tercatat." />
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-base">Tanggal Diterima</TableHead>
                <TableHead className="text-base">Nominal</TableHead>
                <TableHead className="text-base">Dikembalikan</TableHead>
                <TableHead className="text-base">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {detail.deposit.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="text-base">{formatTanggalSingkat(d.received_date)}</TableCell>
                  <TableCell className="text-base">{formatRupiah(d.amount)}</TableCell>
                  <TableCell className="text-base">{formatRupiah(d.refund_amount ?? 0)}</TableCell>
                  <TableCell>
                    <StatusBadge map={statusDeposit} value={d.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </Kotak>
  );
}

function Tunggakan({ detail }: { detail: DetailPenyewa }) {
  return (
    <Kotak judul="Tunggakan Pembayaran">
      {detail.tunggakan.length === 0 ? (
        <Kosong pesan="Tidak ada tunggakan." />
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-base">Keterangan</TableHead>
                <TableHead className="text-base">Jatuh Tempo</TableHead>
                <TableHead className="text-base">Tagihan</TableHead>
                <TableHead className="text-base">Dibayar</TableHead>
                <TableHead className="text-base">Sisa</TableHead>
                <TableHead className="text-base">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {detail.tunggakan.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="text-base">{t.description}</TableCell>
                  <TableCell className="text-base">{formatTanggalSingkat(t.due_date)}</TableCell>
                  <TableCell className="text-base">{formatRupiah(t.amount_due)}</TableCell>
                  <TableCell className="text-base">{formatRupiah(t.amount_paid)}</TableCell>
                  <TableCell className="text-base font-semibold">
                    {formatRupiah(Math.max(0, Number(t.amount_due) - Number(t.amount_paid)))}
                  </TableCell>
                  <TableCell>
                    <StatusBadge map={statusTunggakan} value={t.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </Kotak>
  );
}

function Catatan({ detail }: { detail: DetailPenyewa }) {
  const queryClient = useQueryClient();
  const [teks, setTeks] = useState("");
  const segarkan = () => queryClient.invalidateQueries({ queryKey: ["penyewa", detail.penyewa.id] });

  const tambah = useMutation({
    mutationFn: () => tambahCatatanPenyewa(detail.penyewa.id, teks.trim()),
    onSuccess: () => {
      setTeks("");
      toast.success("Catatan ditambahkan.");
      segarkan();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const hapus = useMutation({
    mutationFn: (idCatatan: string) => hapusCatatanPenyewa(idCatatan),
    onSuccess: () => {
      toast.success("Catatan dihapus.");
      segarkan();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Kotak judul="Catatan Internal">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="catatan-baru" className="text-base">
            Tambah catatan
          </Label>
          <Textarea
            id="catatan-baru"
            rows={3}
            value={teks}
            onChange={(e) => setTeks(e.target.value)}
            placeholder="Contoh: penyewa selalu mengembalikan mobil tepat waktu."
            className="text-base"
          />
        </div>
        <Button
          size="lg"
          className="text-base"
          disabled={tambah.isPending || teks.trim().length < 3}
          onClick={() => tambah.mutate()}
        >
          {tambah.isPending ? "Menyimpan…" : "Simpan Catatan"}
        </Button>

        {detail.catatan.length === 0 ? (
          <Kosong pesan="Belum ada catatan internal." />
        ) : (
          <ul className="space-y-3">
            {detail.catatan.map((c) => (
              <li key={c.id} className="rounded-md border border-border p-4">
                <p className="text-base text-foreground">{c.note}</p>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <span className="text-sm text-muted-foreground">{formatTanggal(c.created_at)}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-sm"
                    disabled={hapus.isPending}
                    onClick={() => hapus.mutate(c.id)}
                  >
                    Hapus
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Kotak>
  );
}

function StatusAkun({ detail }: { detail: DetailPenyewa }) {
  const p = detail.penyewa;
  const queryClient = useQueryClient();
  const segarkan = () => {
    queryClient.invalidateQueries({ queryKey: ["penyewa", p.id] });
    queryClient.invalidateQueries({ queryKey: ["penyewa-daftar"] });
  };

  const nonaktif = useMutation({
    mutationFn: () => nonaktifkanPenyewa(p.id),
    onSuccess: () => {
      toast.success("Penyewa dinonaktifkan.");
      segarkan();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const aktif = useMutation({
    mutationFn: () => aktifkanPenyewa(p.id),
    onSuccess: () => {
      toast.success("Penyewa diaktifkan kembali.");
      segarkan();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Kotak judul="Status Akun Penyewa">
      <p className="text-base text-muted-foreground">
        Penyewa tidak dihapus permanen. Menonaktifkan hanya bisa dilakukan bila tidak ada kontrak
        berjalan dan tidak ada tunggakan.
      </p>
      <div className="mt-4">
        {p.is_active ? (
          <Button
            size="lg"
            variant="destructive"
            className="text-base"
            disabled={nonaktif.isPending}
            onClick={() => nonaktif.mutate()}
          >
            {nonaktif.isPending ? "Memproses…" : "Nonaktifkan Penyewa"}
          </Button>
        ) : (
          <Button
            size="lg"
            className="text-base"
            disabled={aktif.isPending}
            onClick={() => aktif.mutate()}
          >
            {aktif.isPending ? "Memproses…" : "Aktifkan Kembali"}
          </Button>
        )}
      </div>
    </Kotak>
  );
}