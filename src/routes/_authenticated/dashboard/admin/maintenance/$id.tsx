import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { RoleGate } from "@/components/dashboard/RoleGate";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatAngka, formatRupiah, formatTanggalSingkat, formatWaktu } from "@/lib/format";
import { statusPerawatan } from "@/lib/labels";
import {
  ambilDaftarBengkel,
  ambilDetailPerawatan,
  batalkanPerawatan,
  hapusItemPerawatan,
  labelJenisPekerjaan,
  labelKategori,
  mulaiPerawatan,
  selesaikanPerawatan,
  tambahInvoicePerawatan,
  tambahItemPerawatan,
  unggahInvoicePerawatan,
  urlInvoicePerawatan,
} from "@/lib/maintenance";

export const Route = createFileRoute("/_authenticated/dashboard/admin/maintenance/$id")({
  head: () => ({
    meta: [
      { title: "Detail Perawatan | Okta Car Rent" },
      {
        name: "description",
        content:
          "Kelola satu pekerjaan perawatan kendaraan: mulai pengerjaan, catat suku cadang, unggah invoice bengkel, dan selesaikan pekerjaan.",
      },
      { property: "og:title", content: "Detail Perawatan | Okta Car Rent" },
      {
        property: "og:description",
        content: "Rincian pekerjaan perawatan armada beserta biaya dan riwayat perubahan.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RoleGate allow={["owner", "admin"]}>
      <DashboardShell peran="Perawatan Armada" judul="Detail Perawatan">
        <DetailPerawatanHalaman />
      </DashboardShell>
    </RoleGate>
  ),
});

function Bagian({ judul, children }: { judul: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-card p-5">
      <h2 className="font-heading text-xl font-bold text-foreground">{judul}</h2>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

function DetailPerawatanHalaman() {
  const { id } = Route.useParams();
  const qc = useQueryClient();

  const detail = useQuery({
    queryKey: ["perawatan-detail", id],
    queryFn: () => ambilDetailPerawatan(id),
  });
  const bengkel = useQuery({ queryKey: ["bengkel-aktif"], queryFn: () => ambilDaftarBengkel() });

  const [alasanPaksa, setAlasanPaksa] = useState("");
  const [tglSelesai, setTglSelesai] = useState(new Date().toISOString().slice(0, 10));
  const [odometer, setOdometer] = useState("");
  const [biaya, setBiaya] = useState("");
  const [catatanMekanik, setCatatanMekanik] = useState("");
  const [invoiceMenyusul, setInvoiceMenyusul] = useState(false);
  const [alasanBatal, setAlasanBatal] = useState("");

  const [namaItem, setNamaItem] = useState("");
  const [qty, setQty] = useState("1");
  const [hargaItem, setHargaItem] = useState("");

  const [noInvoice, setNoInvoice] = useState("");
  const [tglInvoice, setTglInvoice] = useState(new Date().toISOString().slice(0, 10));
  const [nominalInvoice, setNominalInvoice] = useState("");
  const [bengkelInvoice, setBengkelInvoice] = useState("");
  const [berkas, setBerkas] = useState<File | null>(null);

  function segarkan() {
    void qc.invalidateQueries({ queryKey: ["perawatan-detail", id] });
    void qc.invalidateQueries({ queryKey: ["perawatan-ringkasan"] });
    void qc.invalidateQueries({ queryKey: ["perawatan-daftar"] });
    void qc.invalidateQueries({ queryKey: ["perawatan-jatuh-tempo"] });
  }

  const mulai = useMutation({
    mutationFn: () => mulaiPerawatan(id, alasanPaksa),
    onSuccess: () => {
      toast.success("Pekerjaan dimulai. Kendaraan berstatus Dalam Perawatan.");
      setAlasanPaksa("");
      segarkan();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Gagal memulai pekerjaan."),
  });

  const selesai = useMutation({
    mutationFn: () =>
      selesaikanPerawatan(id, {
        completed_date: tglSelesai,
        odometer: Number(odometer),
        cost: Number(biaya || 0),
        mechanic_notes: catatanMekanik.trim() || null,
        invoice_pending: invoiceMenyusul,
      }),
    onSuccess: () => {
      toast.success("Perawatan diselesaikan.");
      segarkan();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Gagal menyelesaikan perawatan."),
  });

  const batal = useMutation({
    mutationFn: () => batalkanPerawatan(id, alasanBatal),
    onSuccess: () => {
      toast.success("Perawatan dibatalkan.");
      setAlasanBatal("");
      segarkan();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Gagal membatalkan perawatan."),
  });

  const tambahItem = useMutation({
    mutationFn: () =>
      tambahItemPerawatan(id, {
        item_name: namaItem,
        qty: Number(qty || 1),
        unit_cost: Number(hargaItem || 0),
      }),
    onSuccess: () => {
      toast.success("Item ditambahkan.");
      setNamaItem("");
      setQty("1");
      setHargaItem("");
      segarkan();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Gagal menambah item."),
  });

  const hapusItem = useMutation({
    mutationFn: (itemId: string) => hapusItemPerawatan(itemId),
    onSuccess: () => {
      toast.success("Item dihapus.");
      segarkan();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Gagal menghapus item."),
  });

  const simpanInvoice = useMutation({
    mutationFn: async () => {
      if (!berkas) throw new Error("Berkas invoice wajib diunggah.");
      const path = await unggahInvoicePerawatan(berkas);
      await tambahInvoicePerawatan(id, {
        workshop_id: bengkelInvoice || detail.data?.perawatan.workshop_id || null,
        invoice_number: noInvoice,
        invoice_date: tglInvoice,
        amount: Number(nominalInvoice || 0),
        file_url: path,
        notes: null,
      });
    },
    onSuccess: () => {
      toast.success("Invoice bengkel tersimpan.");
      setNoInvoice("");
      setNominalInvoice("");
      setBerkas(null);
      segarkan();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Gagal menyimpan invoice."),
  });

  if (detail.isPending) return <Skeleton className="h-96 w-full rounded-lg" />;
  if (detail.isError)
    return (
      <p role="alert" className="text-base text-destructive">
        {(detail.error as Error).message}
      </p>
    );

  const d = detail.data!;
  const m = d.perawatan;
  const totalItem = d.item.reduce((t, i) => t + Number(i.qty) * Number(i.unit_cost), 0);
  const bisaMulai = m.status === "dijadwalkan";
  const bisaSelesai = m.status === "dikerjakan";
  const terbuka = m.status === "dijadwalkan" || m.status === "dikerjakan";

  return (
    <div className="space-y-6">
      <Button asChild size="lg" variant="outline" className="text-base">
        <Link to="/dashboard/admin/maintenance">Kembali ke Daftar Perawatan</Link>
      </Button>

      <div className="rounded-lg border border-border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-heading text-2xl font-bold text-foreground">
              {m.vehicles
                ? `${m.vehicles.brand} ${m.vehicles.model} • ${m.vehicles.plate_number}`
                : "-"}
            </p>
            <p className="mt-1 text-base text-muted-foreground">
              {labelKategori(m.category)} • {labelJenisPekerjaan(m.maintenance_type)}
            </p>
          </div>
          <StatusBadge map={statusPerawatan} value={m.status} />
        </div>
        <div className="mt-4 grid gap-2 text-base sm:grid-cols-2 lg:grid-cols-3">
          <p>Rencana: {formatTanggalSingkat(m.scheduled_date)}</p>
          <p>Mulai dikerjakan: {m.started_at ? formatWaktu(m.started_at) : "Belum"}</p>
          <p>Selesai: {m.completed_date ? formatTanggalSingkat(m.completed_date) : "Belum"}</p>
          <p>Bengkel: {m.workshops?.name ?? m.workshop_name ?? "-"}</p>
          <p>Kilometer: {m.odometer ? `${formatAngka(m.odometer)} KM` : "-"}</p>
          <p>Biaya: {formatRupiah(Number(m.cost))}</p>
        </div>
        {m.description && (
          <p className="mt-3 text-base text-foreground">Keluhan: {m.description}</p>
        )}
        {m.mechanic_notes && (
          <p className="mt-1 text-base text-muted-foreground">
            Catatan mekanik: {m.mechanic_notes}
          </p>
        )}
        {m.cancel_reason && (
          <p className="mt-1 text-base text-destructive">Dibatalkan: {m.cancel_reason}</p>
        )}
        {m.forced_reason && (
          <p className="mt-1 text-base text-destructive">
            Dipaksa oleh pemilik: {m.forced_reason}
          </p>
        )}
        {m.invoice_pending && (
          <p className="mt-1 text-base text-primary">Invoice bengkel masih menyusul.</p>
        )}
        {d.kendaraanDisewa && terbuka && (
          <p className="mt-3 rounded-md bg-secondary p-3 text-base text-foreground">
            Kendaraan masih terikat kontrak berjalan {d.kendaraanDisewa}. Pengerjaan hanya dapat
            dipaksa oleh pemilik dengan alasan.
          </p>
        )}
      </div>

      {bisaMulai && (
        <Bagian judul="Mulai Pengerjaan">
          <p className="text-base text-muted-foreground">
            Saat pekerjaan dimulai, kendaraan otomatis berstatus Dalam Perawatan dan tidak dapat
            disewakan.
          </p>
          {d.kendaraanDisewa && (
            <div className="space-y-2">
              <Label htmlFor="alasan-paksa" className="text-base">
                Alasan Pemaksaan (khusus pemilik)
              </Label>
              <Textarea
                id="alasan-paksa"
                className="min-h-20 text-base"
                value={alasanPaksa}
                onChange={(e) => setAlasanPaksa(e.target.value)}
              />
            </div>
          )}
          <Button
            size="lg"
            className="text-base"
            disabled={mulai.isPending}
            onClick={() => mulai.mutate()}
          >
            {mulai.isPending ? "Memproses…" : "Mulai Dikerjakan"}
          </Button>
        </Bagian>
      )}

      {terbuka && (
        <Bagian judul="Suku Cadang & Jasa">
          {d.item.length === 0 ? (
            <p className="text-base text-muted-foreground">Belum ada item dicatat.</p>
          ) : (
            <ul className="space-y-2">
              {d.item.map((i) => (
                <li
                  key={i.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-3 text-base"
                >
                  <span className="text-foreground">
                    {i.item_name} × {formatAngka(i.qty)} = {formatRupiah(Number(i.qty) * Number(i.unit_cost))}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-sm text-destructive"
                    disabled={hapusItem.isPending}
                    onClick={() => hapusItem.mutate(i.id)}
                  >
                    Hapus
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <p className="text-base font-semibold text-foreground">
            Total item: {formatRupiah(totalItem)}
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="nama-item" className="text-base">
                Nama Item
              </Label>
              <Input
                id="nama-item"
                className="h-11 text-base"
                value={namaItem}
                onChange={(e) => setNamaItem(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="qty-item" className="text-base">
                Jumlah
              </Label>
              <Input
                id="qty-item"
                type="number"
                min={1}
                className="h-11 text-base"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="harga-item" className="text-base">
                Harga Satuan
              </Label>
              <Input
                id="harga-item"
                type="number"
                min={0}
                className="h-11 text-base"
                value={hargaItem}
                onChange={(e) => setHargaItem(e.target.value)}
              />
            </div>
          </div>
          <Button
            size="lg"
            variant="outline"
            className="text-base"
            disabled={tambahItem.isPending}
            onClick={() => tambahItem.mutate()}
          >
            Tambah Item
          </Button>
        </Bagian>
      )}

      <Bagian judul="Invoice Bengkel">
        {d.invoice.length === 0 ? (
          <p className="text-base text-muted-foreground">Belum ada invoice terunggah.</p>
        ) : (
          <ul className="space-y-2">
            {d.invoice.map((inv) => (
              <li key={inv.id} className="rounded-md border border-border p-3 text-base">
                <p className="font-semibold text-foreground">
                  {inv.invoice_number} • {formatRupiah(Number(inv.amount))}
                </p>
                <p className="text-sm text-muted-foreground">
                  {formatTanggalSingkat(inv.invoice_date)}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2 text-sm"
                  onClick={async () => {
                    const url = await urlInvoicePerawatan(inv.file_url);
                    if (url) window.open(url, "_blank", "noopener");
                    else toast.error("Berkas invoice tidak dapat dibuka.");
                  }}
                >
                  Lihat Berkas
                </Button>
              </li>
            ))}
          </ul>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="no-invoice" className="text-base">
              Nomor Invoice
            </Label>
            <Input
              id="no-invoice"
              className="h-11 text-base"
              value={noInvoice}
              onChange={(e) => setNoInvoice(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tgl-invoice" className="text-base">
              Tanggal Invoice
            </Label>
            <Input
              id="tgl-invoice"
              type="date"
              className="h-11 text-base"
              value={tglInvoice}
              onChange={(e) => setTglInvoice(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nominal-invoice" className="text-base">
              Nominal Invoice
            </Label>
            <Input
              id="nominal-invoice"
              type="number"
              min={0}
              className="h-11 text-base"
              value={nominalInvoice}
              onChange={(e) => setNominalInvoice(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-base">Bengkel Penerbit</Label>
            <Select value={bengkelInvoice} onValueChange={setBengkelInvoice}>
              <SelectTrigger className="h-11 text-base">
                <SelectValue placeholder="Pilih bengkel" />
              </SelectTrigger>
              <SelectContent>
                {(bengkel.data ?? []).map((b) => (
                  <SelectItem key={b.id} value={b.id} className="text-base">
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="berkas-invoice" className="text-base">
            Berkas Invoice (foto atau PDF)
          </Label>
          <Input
            id="berkas-invoice"
            type="file"
            accept="image/*,application/pdf"
            className="h-11 text-base"
            onChange={(e) => setBerkas(e.target.files?.[0] ?? null)}
          />
        </div>
        <Button
          size="lg"
          className="text-base"
          disabled={simpanInvoice.isPending}
          onClick={() => simpanInvoice.mutate()}
        >
          {simpanInvoice.isPending ? "Menyimpan…" : "Simpan Invoice"}
        </Button>
      </Bagian>

      {bisaSelesai && (
        <Bagian judul="Selesaikan Perawatan">
          <p className="text-base text-muted-foreground">
            Isi tanggal selesai, kilometer, dan biaya akhir. Invoice bengkel wajib ada bila biaya
            lebih dari nol.
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="tgl-selesai" className="text-base">
                Tanggal Selesai
              </Label>
              <Input
                id="tgl-selesai"
                type="date"
                className="h-11 text-base"
                value={tglSelesai}
                onChange={(e) => setTglSelesai(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="odometer-selesai" className="text-base">
                Kilometer Saat Servis
              </Label>
              <Input
                id="odometer-selesai"
                type="number"
                min={0}
                className="h-11 text-base"
                value={odometer}
                onChange={(e) => setOdometer(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="biaya-selesai" className="text-base">
                Biaya Total
              </Label>
              <Input
                id="biaya-selesai"
                type="number"
                min={0}
                className="h-11 text-base"
                value={biaya || String(totalItem || "")}
                onChange={(e) => setBiaya(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="catatan-mekanik" className="text-base">
              Catatan Mekanik
            </Label>
            <Textarea
              id="catatan-mekanik"
              className="min-h-20 text-base"
              value={catatanMekanik}
              onChange={(e) => setCatatanMekanik(e.target.value)}
            />
          </div>
          <label className="flex items-center gap-2 text-base text-foreground">
            <input
              type="checkbox"
              className="size-4"
              checked={invoiceMenyusul}
              onChange={(e) => setInvoiceMenyusul(e.target.checked)}
            />
            Invoice menyusul (hanya pemilik)
          </label>
          <Button
            size="lg"
            className="text-base"
            disabled={selesai.isPending}
            onClick={() => selesai.mutate()}
          >
            {selesai.isPending ? "Memproses…" : "Selesaikan Perawatan"}
          </Button>
        </Bagian>
      )}

      {terbuka && (
        <Bagian judul="Batalkan Perawatan">
          <div className="space-y-2">
            <Label htmlFor="alasan-batal" className="text-base">
              Alasan Pembatalan
            </Label>
            <Textarea
              id="alasan-batal"
              className="min-h-20 text-base"
              value={alasanBatal}
              onChange={(e) => setAlasanBatal(e.target.value)}
            />
          </div>
          <Button
            size="lg"
            variant="outline"
            className="text-base text-destructive"
            disabled={batal.isPending}
            onClick={() => batal.mutate()}
          >
            Batalkan Perawatan
          </Button>
        </Bagian>
      )}

      <Bagian judul="Riwayat Perubahan">
        {d.audit.length === 0 ? (
          <p className="text-base text-muted-foreground">Belum ada riwayat perubahan.</p>
        ) : (
          <ul className="space-y-2">
            {d.audit.map((a) => (
              <li key={a.id} className="rounded-md border border-border p-3 text-base">
                <p className="text-foreground">{a.summary ?? a.action}</p>
                <p className="text-sm text-muted-foreground">
                  {formatWaktu(a.created_at)} • {a.actor_role ?? "sistem"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Bagian>
    </div>
  );
}