import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { RoleGate } from "@/components/dashboard/RoleGate";
import { PratinjauBukti } from "@/components/payments/PratinjauBukti";
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
import { Route as AuthRoute } from "@/routes/_authenticated/route";
import { useUserRole } from "@/lib/auth";
import { formatRupiah, formatTanggalSingkat } from "@/lib/format";
import { statusDeposit } from "@/lib/labels";
import { unggahBukti } from "@/lib/payments";
import {
  ambilDetailDeposit,
  balikkanPengembalian,
  catatBiayaKerusakan,
  labelJenisPotongan,
  OPSI_METODE_TERIMA,
  prosesPengembalian,
  tambahPotongan,
  terimaDeposit,
  unggahInvoiceBengkel,
  type DetailDeposit,
} from "@/lib/deposits";

export const Route = createFileRoute("/_authenticated/dashboard/admin/deposits/$id")({
  head: () => ({
    meta: [
      { title: "Detail Deposit | Okta Car Rent" },
      {
        name: "description",
        content:
          "Kelola satu deposit: catat penerimaan, potongan tunggakan dan kerusakan bengkel, lalu proses pengembalian transfer bank.",
      },
      { property: "og:title", content: "Detail Deposit | Okta Car Rent" },
      {
        property: "og:description",
        content: "Penyelesaian deposit kontrak sewa beserta riwayat potongan dan jejak audit.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RoleGate allow={["owner", "admin"]}>
      <DashboardShell peran="Manajemen Deposit" judul="Detail Deposit">
        <HalamanDetailDeposit />
      </DashboardShell>
    </RoleGate>
  ),
});

function Kotak({ judul, children }: { judul: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 rounded-lg border border-border bg-card p-5">
      <h2 className="font-heading text-xl font-bold text-foreground">{judul}</h2>
      {children}
    </section>
  );
}

function Info({ label, nilai }: { label: string; nilai: string }) {
  return (
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-base font-semibold text-foreground">{nilai}</p>
    </div>
  );
}

function HalamanDetailDeposit() {
  const { id } = useParams({ from: "/_authenticated/dashboard/admin/deposits/$id" });
  const qc = useQueryClient();
  const { user } = AuthRoute.useRouteContext();
  const { role } = useUserRole(user?.id);

  const detail = useQuery({
    queryKey: ["deposit-detail", id],
    queryFn: () => ambilDetailDeposit(id),
  });

  const segarkan = () => {
    qc.invalidateQueries({ queryKey: ["deposit-detail", id] });
    qc.invalidateQueries({ queryKey: ["deposit-daftar"] });
    qc.invalidateQueries({ queryKey: ["deposit-ringkasan"] });
  };

  if (detail.isPending) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (detail.isError || !detail.data) {
    return (
      <p role="alert" className="text-base text-destructive">
        {(detail.error as Error)?.message ?? "Deposit tidak ditemukan."}
      </p>
    );
  }

  const d = detail.data;
  const dep = d.deposit;

  return (
    <div className="space-y-6">
      <Kotak judul="Ringkasan Deposit">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Info label="Penyewa" nilai={dep.renters?.full_name ?? "-"} />
          <Info label="Nomor Kontrak" nilai={dep.contracts?.contract_number ?? "-"} />
          <Info label="Nominal Deposit" nilai={formatRupiah(dep.amount)} />
          <Info label="Total Potongan" nilai={formatRupiah(dep.total_potongan)} />
          <Info label="Sisa Deposit" nilai={formatRupiah(d.pratinjau.sisa)} />
          <Info label="Tunggakan Penyewa" nilai={formatRupiah(d.pratinjau.tunggakan)} />
          <Info
            label="Diterima"
            nilai={dep.received_date ? formatTanggalSingkat(dep.received_date) : "Belum diterima"}
          />
          <div>
            <p className="text-sm text-muted-foreground">Status</p>
            <StatusBadge map={statusDeposit} value={dep.status} />
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button asChild size="lg" variant="outline" className="text-base">
            <Link to="/dashboard/admin/deposits">Kembali ke Daftar Deposit</Link>
          </Button>
          {dep.contract_id && (
            <Button asChild size="lg" variant="outline" className="text-base">
              <Link to="/dashboard/admin/contracts/$id" params={{ id: dep.contract_id }}>
                Buka Kontrak
              </Link>
            </Button>
          )}
        </div>
      </Kotak>

      {dep.status === "menunggu_penerimaan" && <PanelPenerimaan id={id} onSelesai={segarkan} />}

      {dep.status !== "menunggu_penerimaan" && dep.status !== "dibatalkan" && (
        <>
          <PanelPotongan detail={d} onSelesai={segarkan} />
          <PanelPengembalian detail={d} bolehMembalik={role === "owner"} onSelesai={segarkan} />
        </>
      )}

      <Kotak judul="Jejak Audit">
        {d.audit.length === 0 ? (
          <p className="text-base text-muted-foreground">Belum ada perubahan tercatat.</p>
        ) : (
          <ul className="space-y-2">
            {d.audit.map((a) => (
              <li key={a.id} className="rounded-md border border-border p-3">
                <p className="text-base text-foreground">
                  {a.summary ?? `${a.entity_type} ${a.action}`}
                </p>
                <p className="text-sm text-muted-foreground">
                  {formatTanggalSingkat(a.created_at)} • {a.actor_role ?? "sistem"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Kotak>
    </div>
  );
}

function PanelPenerimaan({ id, onSelesai }: { id: string; onSelesai: () => void }) {
  const hariIni = new Date().toISOString().slice(0, 10);
  const [tanggal, setTanggal] = useState(hariIni);
  const [metode, setMetode] = useState("tunai");
  const [catatan, setCatatan] = useState("");
  const [berkas, setBerkas] = useState<File | null>(null);

  const simpan = useMutation({
    mutationFn: async () => {
      const path = berkas ? await unggahBukti(berkas) : null;
      await terimaDeposit(id, {
        received_date: tanggal,
        received_method: metode,
        proof_url: path,
        catatan: catatan.trim() || null,
      });
    },
    onSuccess: () => {
      toast.success("Deposit dicatat sebagai diterima dan ditahan.");
      setBerkas(null);
      onSelesai();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Kotak judul="Catat Penerimaan Deposit">
      <p className="text-base text-muted-foreground">
        Deposit Rp 500.000 tercatat saat kontrak dibuat. Tandai diterima setelah uang jaminan benar
        benar masuk pada serah terima unit.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="tgl-terima" className="text-base">
            Tanggal Penerimaan
          </Label>
          <Input
            id="tgl-terima"
            type="date"
            max={hariIni}
            className="h-11 text-base"
            value={tanggal}
            onChange={(e) => setTanggal(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-base">Metode Penerimaan</Label>
          <Select value={metode} onValueChange={setMetode}>
            <SelectTrigger className="h-11 text-base">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {OPSI_METODE_TERIMA.map((o) => (
                <SelectItem key={o.value} value={o.value} className="text-base">
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="bukti-terima" className="text-base">
            Bukti Penerimaan (opsional)
          </Label>
          <Input
            id="bukti-terima"
            type="file"
            accept="image/*,application/pdf"
            className="h-11 text-base"
            onChange={(e) => setBerkas(e.target.files?.[0] ?? null)}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="catatan-terima" className="text-base">
            Catatan
          </Label>
          <Textarea
            id="catatan-terima"
            rows={2}
            className="text-base"
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
          />
        </div>
      </div>
      <Button
        size="lg"
        className="text-base"
        disabled={simpan.isPending}
        onClick={() => simpan.mutate()}
      >
        {simpan.isPending ? "Menyimpan…" : "Tandai Deposit Diterima"}
      </Button>
    </Kotak>
  );
}

function PanelPotongan({
  detail,
  onSelesai,
}: {
  detail: DetailDeposit;
  onSelesai: () => void;
}) {
  const dep = detail.deposit;
  const sisa = detail.pratinjau.sisa;
  const usulan = detail.pratinjau.usulan_potongan_tunggakan;
  const terkunci = Boolean(dep.refund_date);

  const [alasan, setAlasan] = useState("Kerusakan kendaraan");
  const [nominal, setNominal] = useState("");
  const [bengkel, setBengkel] = useState("");
  const [noInvoice, setNoInvoice] = useState("");
  const [tglInvoice, setTglInvoice] = useState(new Date().toISOString().slice(0, 10));
  const [invoice, setInvoice] = useState<File | null>(null);

  const potongTunggakan = useMutation({
    mutationFn: () =>
      tambahPotongan(dep.id, {
        reason: "Pelunasan tunggakan dari deposit",
        description: `Potongan otomatis untuk tunggakan penyewa sebesar ${formatRupiah(usulan)}.`,
        amount: usulan,
        deduction_type: "tunggakan",
      }),
    onSuccess: () => {
      toast.success("Potongan tunggakan dicatat.");
      onSelesai();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const potongKerusakan = useMutation({
    mutationFn: async () => {
      const angka = Number(nominal.replace(/[^\d]/g, ""));
      if (!angka || angka <= 0) throw new Error("Nominal biaya perbaikan harus lebih dari nol.");
      if (!invoice) throw new Error("Invoice bengkel wajib diunggah.");
      const path = await unggahInvoiceBengkel(invoice);
      return catatBiayaKerusakan(dep.id, {
        reason: alasan,
        description: null,
        amount: angka,
        workshop_invoice_url: path,
        workshop_name: bengkel.trim() || null,
        invoice_number: noInvoice.trim() || null,
        invoice_date: tglInvoice,
      });
    },
    onSuccess: (hasil) => {
      toast.success(
        hasil.luapan_tunggakan > 0
          ? `Potongan ${formatRupiah(hasil.dipotong)} dicatat. Kelebihan ${formatRupiah(hasil.luapan_tunggakan)} menjadi tunggakan baru.`
          : `Potongan ${formatRupiah(hasil.dipotong)} dicatat.`,
      );
      setNominal("");
      setInvoice(null);
      onSelesai();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Kotak judul="Potongan Deposit">
      <div className="grid gap-3 text-base sm:grid-cols-3">
        <Info label="Sisa Deposit" nilai={formatRupiah(sisa)} />
        <Info label="Tunggakan Berjalan" nilai={formatRupiah(detail.pratinjau.tunggakan)} />
        <Info label="Perkiraan Pengembalian" nilai={formatRupiah(detail.pratinjau.nominal_pengembalian)} />
      </div>

      {detail.potongan.length > 0 && (
        <ul className="space-y-2">
          {detail.potongan.map((p) => (
            <li key={p.id} className="rounded-md border border-border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-base font-semibold text-foreground">
                  {formatRupiah(p.amount)} • {p.reason}
                </p>
                <p className="text-sm text-muted-foreground">
                  {labelJenisPotongan(p.deduction_type)} • {formatTanggalSingkat(p.created_at)}
                </p>
              </div>
              {p.workshop_name && (
                <p className="mt-1 text-sm text-muted-foreground">
                  Bengkel {p.workshop_name}
                  {p.invoice_number ? ` • invoice ${p.invoice_number}` : ""}
                </p>
              )}
              {p.workshop_invoice_url && (
                <div className="mt-2">
                  <PratinjauBukti path={p.workshop_invoice_url} tinggi="h-56" />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {terkunci ? (
        <p className="text-base text-muted-foreground">
          Deposit sudah dikembalikan sehingga potongan baru tidak dapat dicatat.
        </p>
      ) : (
        <>
          {usulan > 0 && (
            <div className="rounded-md border border-border p-4">
              <p className="text-base text-foreground">
                Penyewa memiliki tunggakan. Usulan potongan dari deposit:{" "}
                <span className="font-semibold">{formatRupiah(usulan)}</span>
              </p>
              <Button
                size="lg"
                className="mt-3 text-base"
                disabled={potongTunggakan.isPending}
                onClick={() => potongTunggakan.mutate()}
              >
                {potongTunggakan.isPending ? "Menyimpan…" : "Setujui Potongan Tunggakan"}
              </Button>
            </div>
          )}

          <div className="space-y-4 rounded-md border border-border p-4">
            <h3 className="text-base font-semibold text-foreground">
              Potongan Kerusakan / Kecelakaan
            </h3>
            <p className="text-base text-muted-foreground">
              Wajib menyertakan invoice bengkel resmi. Kelebihan biaya di atas deposit otomatis
              menjadi tunggakan penyewa.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="alasan-potong" className="text-base">
                  Keterangan Kerusakan
                </Label>
                <Input
                  id="alasan-potong"
                  className="h-11 text-base"
                  value={alasan}
                  onChange={(e) => setAlasan(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nominal-potong" className="text-base">
                  Nominal Invoice Bengkel
                </Label>
                <Input
                  id="nominal-potong"
                  type="number"
                  min={0}
                  step={1000}
                  className="h-11 text-base"
                  value={nominal}
                  onChange={(e) => setNominal(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bengkel" className="text-base">
                  Nama Bengkel
                </Label>
                <Input
                  id="bengkel"
                  className="h-11 text-base"
                  value={bengkel}
                  onChange={(e) => setBengkel(e.target.value)}
                />
              </div>
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
                <Label htmlFor="berkas-invoice" className="text-base">
                  Berkas Invoice Bengkel
                </Label>
                <Input
                  id="berkas-invoice"
                  type="file"
                  accept="image/*,application/pdf"
                  className="h-11 text-base"
                  onChange={(e) => setInvoice(e.target.files?.[0] ?? null)}
                />
              </div>
            </div>
            <Button
              size="lg"
              className="text-base"
              disabled={potongKerusakan.isPending}
              onClick={() => potongKerusakan.mutate()}
            >
              {potongKerusakan.isPending ? "Menyimpan…" : "Catat Potongan Kerusakan"}
            </Button>
          </div>
        </>
      )}
    </Kotak>
  );
}

function PanelPengembalian({
  detail,
  bolehMembalik,
  onSelesai,
}: {
  detail: DetailDeposit;
  bolehMembalik: boolean;
  onSelesai: () => void;
}) {
  const dep = detail.deposit;
  const hariIni = new Date().toISOString().slice(0, 10);
  const [tanggal, setTanggal] = useState(hariIni);
  const [bank, setBank] = useState("");
  const [rekening, setRekening] = useState("");
  const [pemilik, setPemilik] = useState(dep.renters?.full_name ?? "");
  const [catatan, setCatatan] = useState("");
  const [bukti, setBukti] = useState<File | null>(null);
  const [alasanBalik, setAlasanBalik] = useState("");

  const kontrakSelesai =
    dep.contracts?.status === "selesai" || dep.contracts?.status === "dibatalkan";

  const proses = useMutation({
    mutationFn: async () => {
      if (!bukti) throw new Error("Bukti transfer wajib diunggah.");
      const path = await unggahBukti(bukti);
      await prosesPengembalian(dep.id, {
        refund_date: tanggal,
        refund_bank_name: bank,
        refund_account_number: rekening,
        refund_account_holder: pemilik,
        refund_proof_url: path,
        catatan: catatan.trim() || null,
      });
    },
    onSuccess: () => {
      toast.success("Pengembalian deposit diproses.");
      setBukti(null);
      onSelesai();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const balikkan = useMutation({
    mutationFn: () => balikkanPengembalian(dep.id, alasanBalik),
    onSuccess: () => {
      toast.success("Pengembalian dibalik. Deposit kembali berstatus ditahan.");
      setAlasanBalik("");
      onSelesai();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (dep.refund_date) {
    return (
      <Kotak judul="Pengembalian Deposit">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Info label="Tanggal Transfer" nilai={formatTanggalSingkat(dep.refund_date)} />
          <Info label="Nominal Dikembalikan" nilai={formatRupiah(dep.refund_amount ?? 0)} />
          <Info label="Bank Tujuan" nilai={dep.refund_bank_name ?? "-"} />
          <Info
            label="Rekening"
            nilai={`${dep.refund_account_number ?? "-"} (${dep.refund_account_holder ?? "-"})`}
          />
        </div>
        <PratinjauBukti path={dep.refund_proof_url} tinggi="h-64" />
        {bolehMembalik ? (
          <div className="space-y-3 rounded-md border border-destructive/30 bg-destructive/5 p-4">
            <Label htmlFor="alasan-balik" className="text-base">
              Alasan Pembalikan Pengembalian
            </Label>
            <Textarea
              id="alasan-balik"
              rows={2}
              className="text-base"
              value={alasanBalik}
              onChange={(e) => setAlasanBalik(e.target.value)}
            />
            <Button
              size="lg"
              variant="destructive"
              className="text-base"
              disabled={balikkan.isPending}
              onClick={() => balikkan.mutate()}
            >
              {balikkan.isPending ? "Memproses…" : "Balikkan Pengembalian"}
            </Button>
          </div>
        ) : (
          <p className="text-base text-muted-foreground">
            Pengembalian bersifat final. Hanya pemilik yang dapat membalik pengembalian.
          </p>
        )}
      </Kotak>
    );
  }

  return (
    <Kotak judul="Proses Pengembalian Deposit">
      {!kontrakSelesai ? (
        <p className="text-base text-muted-foreground">
          Pengembalian deposit hanya dapat diproses setelah kontrak selesai atau dibatalkan.
        </p>
      ) : detail.pratinjau.nominal_pengembalian <= 0 ? (
        <p className="text-base text-muted-foreground">
          Sisa deposit sudah habis terpakai untuk potongan. Tidak ada nominal yang dikembalikan.
        </p>
      ) : (
        <>
          <p className="text-base text-foreground">
            Nominal yang akan ditransfer:{" "}
            <span className="font-semibold">{formatRupiah(detail.pratinjau.sisa)}</span>
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="tgl-refund" className="text-base">
                Tanggal Transfer
              </Label>
              <Input
                id="tgl-refund"
                type="date"
                max={hariIni}
                className="h-11 text-base"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bank-refund" className="text-base">
                Nama Bank
              </Label>
              <Input
                id="bank-refund"
                className="h-11 text-base"
                value={bank}
                onChange={(e) => setBank(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rek-refund" className="text-base">
                Nomor Rekening
              </Label>
              <Input
                id="rek-refund"
                className="h-11 text-base"
                value={rekening}
                onChange={(e) => setRekening(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pemilik-refund" className="text-base">
                Nama Pemilik Rekening
              </Label>
              <Input
                id="pemilik-refund"
                className="h-11 text-base"
                value={pemilik}
                onChange={(e) => setPemilik(e.target.value)}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="bukti-refund" className="text-base">
                Bukti Transfer
              </Label>
              <Input
                id="bukti-refund"
                type="file"
                accept="image/*,application/pdf"
                className="h-11 text-base"
                onChange={(e) => setBukti(e.target.files?.[0] ?? null)}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="catatan-refund" className="text-base">
                Catatan
              </Label>
              <Textarea
                id="catatan-refund"
                rows={2}
                className="text-base"
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
              />
            </div>
          </div>
          <Button
            size="lg"
            className="text-base"
            disabled={proses.isPending}
            onClick={() => proses.mutate()}
          >
            {proses.isPending ? "Memproses…" : "Proses Pengembalian Deposit"}
          </Button>
        </>
      )}
    </Kotak>
  );
}