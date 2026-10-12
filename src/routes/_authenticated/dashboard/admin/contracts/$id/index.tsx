import { useState } from "react";
import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Pencil } from "lucide-react";

import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { RoleGate } from "@/components/dashboard/RoleGate";
import { ChecklistInspeksi } from "@/components/contracts/ChecklistInspeksi";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatRupiah, formatTanggal, formatTanggalSingkat, formatWaktu } from "@/lib/format";
import {
  labelMetodeBayar,
  labelTipeSewa,
  statusDeposit,
  statusKontrak,
  statusPembayaran,
} from "@/lib/labels";
import { Route as AuthRoute } from "@/routes/_authenticated/route";
import { useUserRole } from "@/lib/auth";
import {
  aktifkanKontrak,
  ambilDetailKontrak,
  batalkanKontrak,
  catatPembayaran,
  dendaKeterlambatan,
  hapusKontrakDraft,
  OPSI_BBM,
  perpanjangKontrak,
  selesaikanKontrak,
  type DetailKontrak,
} from "@/lib/contracts";

export const Route = createFileRoute("/_authenticated/dashboard/admin/contracts/$id/")({
  head: () => ({
    meta: [
      { title: "Detail Kontrak Sewa | Okta Car Rent" },
      {
        name: "description",
        content:
          "Detail kontrak sewa: serah terima unit, pemeriksaan kendaraan, pembayaran, deposit, perpanjangan, dan riwayat status.",
      },
      { property: "og:title", content: "Detail Kontrak Sewa | Okta Car Rent" },
      {
        property: "og:description",
        content: "Kelola siklus hidup satu kontrak rental mobil dari serah terima sampai pengembalian.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RoleGate allow={["owner", "admin"]}>
      <DashboardShell peran="Manajemen Kontrak" judul="Detail Kontrak">
        <HalamanDetailKontrak />
      </DashboardShell>
    </RoleGate>
  ),
});

function HalamanDetailKontrak() {
  const { id } = useParams({ from: "/_authenticated/dashboard/admin/contracts/$id/" });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = AuthRoute.useRouteContext();
  const { role } = useUserRole(user?.id);

  const detail = useQuery({
    queryKey: ["kontrak-detail", id],
    queryFn: () => ambilDetailKontrak(id),
  });

  function segarkan() {
    queryClient.invalidateQueries({ queryKey: ["kontrak-detail", id] });
    queryClient.invalidateQueries({ queryKey: ["kontrak-daftar"] });
  }

  if (detail.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (detail.isError) {
    return (
      <p role="alert" className="text-base text-destructive">
        {(detail.error as Error).message}
      </p>
    );
  }

  const d = detail.data!;
  const k = d.kontrak;
  const denda = dendaKeterlambatan(k);
  const berjalan = k.status === "aktif" || k.status === "terlambat";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="outline" size="lg" className="text-base w-fit" asChild>
          <Link to="/dashboard/admin/contracts">
            <ArrowLeft className="mr-2 size-4" /> Kembali ke Daftar
          </Link>
        </Button>
        {k.status === "draft" && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="lg" className="text-base" asChild>
              <Link to="/dashboard/admin/contracts/$id/edit" params={{ id }}>
                <Pencil className="mr-2 size-4" /> Ubah Draft
              </Link>
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="text-base text-destructive"
              onClick={async () => {
                if (!confirm("Hapus kontrak draft ini?")) return;
                try {
                  await hapusKontrakDraft(id);
                  toast.success("Draft kontrak dihapus.");
                  navigate({ to: "/dashboard/admin/contracts" });
                } catch (e) {
                  toast.error((e as Error).message);
                }
              }}
            >
              Hapus Draft
            </Button>
          </div>
        )}
      </div>

      {/* Ringkasan */}
      <div className="rounded-lg border border-border bg-card p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="font-heading text-2xl font-bold text-foreground">
              {k.contract_number}
            </h2>
            <p className="mt-1 text-base text-muted-foreground">
              {labelTipeSewa[k.rental_type] ?? k.rental_type} · {k.duration_qty} periode ·{" "}
              {k.driver_option}
            </p>
          </div>
          <StatusBadge map={statusKontrak} value={k.status} />
        </div>

        <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Info label="Penyewa" nilai={d.penyewa?.full_name ?? "-"} sub={d.penyewa?.phone} />
          <Info
            label="Unit"
            nilai={d.kendaraan ? `${d.kendaraan.brand} ${d.kendaraan.model}` : "-"}
            sub={d.kendaraan?.plate_number}
          />
          <Info
            label="Periode"
            nilai={formatTanggalSingkat(k.start_date)}
            sub={`s/d ${formatTanggalSingkat(k.end_date)}`}
          />
          <Info
            label="Total Tagihan"
            nilai={formatRupiah(d.tagihan.total)}
            sub={`Sisa ${formatRupiah(d.tagihan.sisa)}`}
          />
          <Info label="Ambil" nilai={k.pickup_location || "-"} />
          <Info label="Kembali" nilai={k.return_location || "-"} />
          <Info label="Deposit" nilai={formatRupiah(k.deposit_amount)} />
          <Info
            label="Denda Keterlambatan"
            nilai={denda.hari > 0 ? formatRupiah(denda.nominal) : "-"}
            sub={denda.hari > 0 ? `${denda.hari} hari terlambat` : undefined}
            bahaya={denda.hari > 0}
          />
        </dl>

        {k.override_reason && (
          <p className="mt-4 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-base text-destructive">
            Penimpaan ({k.override_type}): {k.override_reason}
          </p>
        )}
      </div>

      {k.status === "draft" && <PanelSerahTerima detail={d} onSelesai={segarkan} />}
      {berjalan && <PanelPengembalian detail={d} onSelesai={segarkan} />}
      {berjalan && <PanelPerpanjangan detail={d} onSelesai={segarkan} />}

      <ChecklistInspeksi
        contractId={id}
        jenis="keluar"
        judul="Pemeriksaan Serah Terima (Keluar)"
        item={d.checklist.filter((c) => c.checklist_type === "keluar")}
        foto={d.fotoChecklist}
        bolehUbah={k.status === "draft" || berjalan}
        onPerbarui={segarkan}
      />

      {(berjalan || k.status === "selesai") && (
        <ChecklistInspeksi
          contractId={id}
          jenis="masuk"
          judul="Pemeriksaan Pengembalian (Masuk)"
          item={d.checklist.filter((c) => c.checklist_type === "masuk")}
          foto={d.fotoChecklist}
          bolehUbah={berjalan}
          onPerbarui={segarkan}
        />
      )}

      <PanelPembayaran detail={d} onSelesai={segarkan} />
      <PanelDeposit detail={d} onSelesai={segarkan} />

      {d.perpanjangan.length > 0 && (
        <Kotak judul="Riwayat Perpanjangan">
          <ul className="space-y-2">
            {d.perpanjangan.map((p) => (
              <li key={p.id} className="text-base text-foreground">
                {formatTanggalSingkat(p.previous_end_date)} →{" "}
                {formatTanggalSingkat(p.new_end_date)} · tambahan{" "}
                {formatRupiah(p.additional_amount)}
              </li>
            ))}
          </ul>
        </Kotak>
      )}

      <Kotak judul="Riwayat Status">
        {d.riwayat.length === 0 ? (
          <p className="text-base text-muted-foreground">Belum ada perubahan status.</p>
        ) : (
          <ul className="space-y-2">
            {d.riwayat.map((r) => (
              <li key={r.id} className="text-base text-foreground">
                {formatWaktu(r.changed_at)} — {r.previous_status ?? "baru"} → {r.new_status}
                {r.reason ? ` (${r.reason})` : ""}
              </li>
            ))}
          </ul>
        )}
      </Kotak>

      {k.status !== "selesai" && k.status !== "dibatalkan" && (
        <PanelPembatalan
          id={id}
          bolehBatal={role === "owner" || k.status === "draft"}
          onSelesai={segarkan}
        />
      )}
    </div>
  );
}

function Info({
  label,
  nilai,
  sub,
  bahaya,
}: {
  label: string;
  nilai: string;
  sub?: string;
  bahaya?: boolean;
}) {
  return (
    <div>
      <dt className="text-base text-muted-foreground">{label}</dt>
      <dd
        className={`text-base font-semibold ${bahaya ? "text-destructive" : "text-foreground"}`}
      >
        {nilai}
        {sub && <span className="block text-sm font-normal text-muted-foreground">{sub}</span>}
      </dd>
    </div>
  );
}

function Kotak({ judul, children }: { judul: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-card p-5">
      <h3 className="font-heading text-lg font-bold text-foreground">{judul}</h3>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function PanelSerahTerima({
  detail,
  onSelesai,
}: {
  detail: DetailKontrak;
  onSelesai: () => void;
}) {
  const [odometer, setOdometer] = useState("");
  const [bbm, setBbm] = useState("Penuh");
  const [depositDiterima, setDepositDiterima] = useState(true);
  const [metode, setMetode] = useState("transfer");
  const [catatan, setCatatan] = useState("");

  const aktifkan = useMutation({
    mutationFn: () =>
      aktifkanKontrak(detail.kontrak.id, {
        odometer_start: Number(odometer || 0),
        fuel_level_start: bbm,
        deposit_diterima: depositDiterima,
        metode_deposit: metode,
        catatan: catatan.trim() === "" ? null : catatan.trim(),
      }),
    onSuccess: () => {
      toast.success("Kontrak diaktifkan. Unit berubah menjadi disewa.");
      onSelesai();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Kotak judul="Serah Terima Unit (Aktifkan Kontrak)">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-2">
          <Label htmlFor="odo-awal" className="text-base">
            Odometer Awal (km)
          </Label>
          <Input
            id="odo-awal"
            type="number"
            min={0}
            className="h-11 text-base"
            value={odometer}
            onChange={(e) => setOdometer(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-base">Level BBM</Label>
          <Select value={bbm} onValueChange={setBbm}>
            <SelectTrigger className="h-11 text-base">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {OPSI_BBM.map((o) => (
                <SelectItem key={o} value={o} className="text-base">
                  {o}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-base">Deposit Diterima</Label>
          <Select
            value={depositDiterima ? "ya" : "tidak"}
            onValueChange={(v) => setDepositDiterima(v === "ya")}
          >
            <SelectTrigger className="h-11 text-base">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ya" className="text-base">
                Ya, sudah diterima
              </SelectItem>
              <SelectItem value="tidak" className="text-base">
                Belum
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-base">Metode Deposit</Label>
          <Select value={metode} onValueChange={setMetode} disabled={!depositDiterima}>
            <SelectTrigger className="h-11 text-base">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(labelMetodeBayar).map(([v, l]) => (
                <SelectItem key={v} value={v} className="text-base">
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2 sm:col-span-2 lg:col-span-4">
          <Label htmlFor="cat-serah" className="text-base">
            Catatan Serah Terima
          </Label>
          <Textarea
            id="cat-serah"
            className="text-base"
            rows={2}
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
          />
        </div>
      </div>
      <Button
        size="lg"
        className="mt-4 text-base"
        onClick={() => aktifkan.mutate()}
        disabled={aktifkan.isPending || odometer === ""}
      >
        {aktifkan.isPending ? "Memproses…" : "Aktifkan Kontrak"}
      </Button>
    </Kotak>
  );
}

function PanelPengembalian({
  detail,
  onSelesai,
}: {
  detail: DetailKontrak;
  onSelesai: () => void;
}) {
  const denda = dendaKeterlambatan(detail.kontrak);
  const [odometer, setOdometer] = useState("");
  const [bbm, setBbm] = useState("Penuh");
  const [tanggal, setTanggal] = useState(new Date().toISOString().slice(0, 10));
  const [tambahan, setTambahan] = useState(String(denda.nominal || 0));
  const [catatan, setCatatan] = useState("");

  const selesai = useMutation({
    mutationFn: () =>
      selesaikanKontrak(detail.kontrak.id, {
        odometer_end: Number(odometer || 0),
        fuel_level_end: bbm,
        actual_return_date: tanggal,
        biaya_tambahan: Number(tambahan || 0),
        catatan: catatan.trim() === "" ? null : catatan.trim(),
      }),
    onSuccess: () => {
      toast.success("Kontrak diselesaikan. Unit kembali tersedia.");
      onSelesai();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Kotak judul="Pengembalian Unit (Selesaikan Kontrak)">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-2">
          <Label htmlFor="odo-akhir" className="text-base">
            Odometer Akhir (km)
          </Label>
          <Input
            id="odo-akhir"
            type="number"
            min={0}
            className="h-11 text-base"
            value={odometer}
            onChange={(e) => setOdometer(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-base">Level BBM</Label>
          <Select value={bbm} onValueChange={setBbm}>
            <SelectTrigger className="h-11 text-base">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {OPSI_BBM.map((o) => (
                <SelectItem key={o} value={o} className="text-base">
                  {o}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="tgl-kembali" className="text-base">
            Tanggal Pengembalian
          </Label>
          <Input
            id="tgl-kembali"
            type="date"
            className="h-11 text-base"
            value={tanggal}
            onChange={(e) => setTanggal(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="biaya-tambahan" className="text-base">
            Biaya Tambahan / Denda
          </Label>
          <Input
            id="biaya-tambahan"
            type="number"
            min={0}
            className="h-11 text-base"
            value={tambahan}
            onChange={(e) => setTambahan(e.target.value)}
          />
          {denda.hari > 0 && (
            <p className="text-sm text-destructive">
              Terlambat {denda.hari} hari — usulan denda {formatRupiah(denda.nominal)}.
            </p>
          )}
        </div>
        <div className="space-y-2 sm:col-span-2 lg:col-span-4">
          <Label htmlFor="cat-kembali" className="text-base">
            Catatan Pengembalian
          </Label>
          <Textarea
            id="cat-kembali"
            rows={2}
            className="text-base"
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
          />
        </div>
      </div>
      <Button
        size="lg"
        className="mt-4 text-base"
        onClick={() => selesai.mutate()}
        disabled={selesai.isPending || odometer === ""}
      >
        {selesai.isPending ? "Memproses…" : "Selesaikan Kontrak"}
      </Button>
    </Kotak>
  );
}

function PanelPerpanjangan({
  detail,
  onSelesai,
}: {
  detail: DetailKontrak;
  onSelesai: () => void;
}) {
  const [tanggal, setTanggal] = useState("");
  const [biaya, setBiaya] = useState("0");

  const perpanjang = useMutation({
    mutationFn: () => perpanjangKontrak(detail.kontrak.id, tanggal, Number(biaya || 0)),
    onSuccess: () => {
      toast.success("Kontrak diperpanjang.");
      setTanggal("");
      onSelesai();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Kotak judul="Perpanjangan Sewa">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="tgl-baru" className="text-base">
            Tanggal Selesai Baru
          </Label>
          <Input
            id="tgl-baru"
            type="date"
            className="h-11 text-base"
            min={detail.kontrak.end_date}
            value={tanggal}
            onChange={(e) => setTanggal(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="biaya-perpanjang" className="text-base">
            Biaya Tambahan
          </Label>
          <Input
            id="biaya-perpanjang"
            type="number"
            min={0}
            className="h-11 text-base"
            value={biaya}
            onChange={(e) => setBiaya(e.target.value)}
          />
        </div>
        <div className="flex items-end">
          <Button
            size="lg"
            className="text-base"
            onClick={() => perpanjang.mutate()}
            disabled={perpanjang.isPending || tanggal === ""}
          >
            {perpanjang.isPending ? "Memproses…" : "Perpanjang"}
          </Button>
        </div>
      </div>
    </Kotak>
  );
}

function PanelPembayaran({
  detail,
  onSelesai,
}: {
  detail: DetailKontrak;
  onSelesai: () => void;
}) {
  const [nominal, setNominal] = useState("");
  const [tanggal, setTanggal] = useState(new Date().toISOString().slice(0, 10));
  const [metode, setMetode] = useState("transfer");
  const [referensi, setReferensi] = useState("");

  const catat = useMutation({
    mutationFn: () =>
      catatPembayaran(detail.kontrak.id, {
        amount: Number(nominal || 0),
        payment_date: tanggal,
        method: metode,
        reference_number: referensi.trim() === "" ? null : referensi.trim(),
        notes: null,
      }),
    onSuccess: () => {
      toast.success("Pembayaran dicatat.");
      setNominal("");
      setReferensi("");
      onSelesai();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Kotak judul="Pembayaran">
      <div className="grid gap-3 sm:grid-cols-3">
        <Info label="Total Tagihan" nilai={formatRupiah(detail.tagihan.total)} />
        <Info label="Sudah Dibayar" nilai={formatRupiah(detail.tagihan.dibayar)} />
        <Info
          label="Sisa Tagihan"
          nilai={formatRupiah(detail.tagihan.sisa)}
          bahaya={detail.tagihan.sisa > 0}
        />
      </div>

      <div className="mt-5 overflow-x-auto">
        {detail.pembayaran.length === 0 ? (
          <p className="text-base text-muted-foreground">Belum ada pembayaran tercatat.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-base">Invoice</TableHead>
                <TableHead className="text-base">Tanggal</TableHead>
                <TableHead className="text-base">Metode</TableHead>
                <TableHead className="text-base">Nominal</TableHead>
                <TableHead className="text-base">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {detail.pembayaran.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="text-base">{p.invoice_number}</TableCell>
                  <TableCell className="text-base">{formatTanggal(p.payment_date)}</TableCell>
                  <TableCell className="text-base">
                    {labelMetodeBayar[p.method] ?? p.method}
                  </TableCell>
                  <TableCell className="text-base">{formatRupiah(p.amount)}</TableCell>
                  <TableCell>
                    <StatusBadge map={statusPembayaran} value={p.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="space-y-2">
          <Label htmlFor="bayar-nominal" className="text-base">
            Nominal
          </Label>
          <Input
            id="bayar-nominal"
            type="number"
            min={0}
            className="h-11 text-base"
            value={nominal}
            onChange={(e) => setNominal(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bayar-tanggal" className="text-base">
            Tanggal
          </Label>
          <Input
            id="bayar-tanggal"
            type="date"
            className="h-11 text-base"
            value={tanggal}
            onChange={(e) => setTanggal(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-base">Metode</Label>
          <Select value={metode} onValueChange={setMetode}>
            <SelectTrigger className="h-11 text-base">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(labelMetodeBayar).map(([v, l]) => (
                <SelectItem key={v} value={v} className="text-base">
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="bayar-ref" className="text-base">
            No. Referensi
          </Label>
          <Input
            id="bayar-ref"
            className="h-11 text-base"
            value={referensi}
            onChange={(e) => setReferensi(e.target.value)}
          />
        </div>
        <div className="flex items-end">
          <Button
            size="lg"
            className="text-base"
            onClick={() => catat.mutate()}
            disabled={catat.isPending || Number(nominal) <= 0}
          >
            {catat.isPending ? "Menyimpan…" : "Catat Pembayaran"}
          </Button>
        </div>
      </div>
    </Kotak>
  );
}

function PanelDeposit({ detail, onSelesai: _onSelesai }: { detail: DetailKontrak; onSelesai: () => void }) {
  const dep = detail.deposit;
  const totalPotongan = detail.potongan.reduce((a, p) => a + Number(p.amount), 0);
  const sisaDeposit = Math.max(0, Number(dep?.amount ?? 0) - totalPotongan);

  if (!dep) {
    return (
      <Kotak judul="Deposit">
        <p className="text-base text-muted-foreground">
          Deposit belum tercatat untuk kontrak ini.
        </p>
      </Kotak>
    );
  }

  return (
    <Kotak judul="Deposit">
      <div className="grid gap-3 sm:grid-cols-4">
        <Info label="Nominal Deposit" nilai={formatRupiah(dep.amount)} />
        <Info label="Total Potongan" nilai={formatRupiah(totalPotongan)} bahaya={totalPotongan > 0} />
        <Info label="Sisa Deposit" nilai={formatRupiah(sisaDeposit)} />
        <div>
          <p className="text-base text-muted-foreground">Status</p>
          <StatusBadge map={statusDeposit} value={dep.status} />
        </div>
      </div>

      {detail.potongan.length > 0 && (
        <ul className="mt-4 space-y-2">
          {detail.potongan.map((p) => (
            <li key={p.id} className="rounded-md border border-border p-3">
              <span className="text-base text-foreground">
                {p.reason} — {formatRupiah(p.amount)}
                {p.description && (
                  <span className="block text-sm text-muted-foreground">{p.description}</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-4 text-base text-muted-foreground">
        Penerimaan deposit, potongan tunggakan dan kerusakan, serta pengembalian dikelola pada modul
        deposit.
      </p>
      <div className="mt-3">
        <Button asChild size="lg" className="text-base">
          <Link to="/dashboard/admin/deposits/$id" params={{ id: dep.id }}>
            Kelola Deposit
          </Link>
        </Button>
      </div>
    </Kotak>
  );
}

function PanelPembatalan({
  id,
  bolehBatal,
  onSelesai,
}: {
  id: string;
  bolehBatal: boolean;
  onSelesai: () => void;
}) {
  const [alasan, setAlasan] = useState("");

  const batal = useMutation({
    mutationFn: () => batalkanKontrak(id, alasan),
    onSuccess: () => {
      toast.success("Kontrak dibatalkan.");
      setAlasan("");
      onSelesai();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Kotak judul="Pembatalan Kontrak">
      {!bolehBatal ? (
        <p className="text-base text-muted-foreground">
          Pembatalan kontrak yang sudah berjalan hanya dapat dilakukan oleh pemilik.
        </p>
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-2">
            <Label htmlFor="alasan-batal" className="text-base">
              Alasan Pembatalan (wajib)
            </Label>
            <Input
              id="alasan-batal"
              className="h-11 text-base"
              value={alasan}
              onChange={(e) => setAlasan(e.target.value)}
            />
          </div>
          <Button
            size="lg"
            variant="outline"
            className="text-base text-destructive"
            onClick={() => batal.mutate()}
            disabled={batal.isPending || alasan.trim() === ""}
          >
            Batalkan Kontrak
          </Button>
        </div>
      )}
    </Kotak>
  );
}