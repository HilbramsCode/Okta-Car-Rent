import { useState } from "react";
import { toast } from "sonner";
import { FileText, Trash2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatTanggalSingkat } from "@/lib/format";
import {
  dokumenKedaluwarsa,
  hapusDokumenKendaraan,
  OPSI_JENIS_DOKUMEN,
  unggahDokumenKendaraan,
  type DokumenKendaraan,
} from "@/lib/vehicles";

const MAKS_MB = 10;

export function PengelolaDokumen({
  vehicleId,
  dokumen,
  onBerubah,
}: {
  vehicleId: string;
  dokumen: (DokumenKendaraan & { url: string | null })[];
  onBerubah: () => void;
}) {
  const [jenis, setJenis] = useState("STNK");
  const [berkas, setBerkas] = useState<File | null>(null);
  const [kedaluwarsa, setKedaluwarsa] = useState("");
  const [catatan, setCatatan] = useState("");
  const [sibuk, setSibuk] = useState(false);

  async function unggah(e: React.FormEvent) {
    e.preventDefault();
    if (!berkas) {
      toast.error("Pilih berkas dokumen terlebih dahulu.");
      return;
    }
    if (berkas.size > MAKS_MB * 1024 * 1024) {
      toast.error(`Ukuran dokumen maksimal ${MAKS_MB} MB.`);
      return;
    }
    setSibuk(true);
    try {
      await unggahDokumenKendaraan(
        vehicleId,
        berkas,
        jenis,
        kedaluwarsa || null,
        catatan.trim() || null,
      );
      toast.success("Dokumen berhasil diunggah.");
      setBerkas(null);
      setKedaluwarsa("");
      setCatatan("");
      (document.getElementById("unggah-dokumen") as HTMLInputElement | null)?.value &&
        ((document.getElementById("unggah-dokumen") as HTMLInputElement).value = "");
      onBerubah();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengunggah dokumen.");
    } finally {
      setSibuk(false);
    }
  }

  async function hapus(dok: DokumenKendaraan) {
    setSibuk(true);
    try {
      await hapusDokumenKendaraan(dok);
      toast.success("Dokumen dihapus.");
      onBerubah();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus dokumen.");
    } finally {
      setSibuk(false);
    }
  }

  return (
    <div className="space-y-5">
      <form onSubmit={unggah} className="grid gap-4 rounded-lg border border-border bg-secondary p-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="jenis-dokumen" className="text-base">
            Jenis dokumen
          </Label>
          <Select value={jenis} onValueChange={setJenis}>
            <SelectTrigger id="jenis-dokumen" className="h-11 text-base">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {OPSI_JENIS_DOKUMEN.map((o) => (
                <SelectItem key={o} value={o} className="text-base">
                  {o}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="unggah-dokumen" className="text-base">
            Berkas
          </Label>
          <Input
            id="unggah-dokumen"
            type="file"
            accept="application/pdf,image/*"
            className="h-11 text-base"
            onChange={(e) => setBerkas(e.target.files?.[0] ?? null)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="kedaluwarsa-dokumen" className="text-base">
            Tanggal kedaluwarsa
          </Label>
          <Input
            id="kedaluwarsa-dokumen"
            type="date"
            value={kedaluwarsa}
            onChange={(e) => setKedaluwarsa(e.target.value)}
            className="h-11 text-base"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="catatan-dokumen" className="text-base">
            Catatan
          </Label>
          <Input
            id="catatan-dokumen"
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
            maxLength={200}
            className="h-11 text-base"
          />
        </div>
        <div className="sm:col-span-2">
          <Button type="submit" size="lg" className="text-base" disabled={sibuk}>
            <Upload className="mr-2 size-4" /> {sibuk ? "Mengunggah…" : "Unggah Dokumen"}
          </Button>
        </div>
      </form>

      {dokumen.length === 0 ? (
        <p className="text-base text-muted-foreground">Belum ada dokumen kendaraan.</p>
      ) : (
        <ul className="space-y-3">
          {dokumen.map((d) => {
            const kondisi = dokumenKedaluwarsa(d.expiry_date);
            return (
              <li
                key={d.id}
                className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4 ${
                  kondisi === "kedaluwarsa"
                    ? "border-destructive/40 bg-destructive/5"
                    : "border-border bg-card"
                }`}
              >
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-base font-semibold text-foreground">
                    <FileText className="size-4 shrink-0" /> {d.doc_type}
                  </p>
                  <p className="text-base text-muted-foreground">
                    Berlaku sampai: {formatTanggalSingkat(d.expiry_date)}
                    {kondisi === "kedaluwarsa" && (
                      <span className="ml-2 font-semibold text-destructive">Sudah kedaluwarsa</span>
                    )}
                    {kondisi === "segera" && (
                      <span className="ml-2 font-semibold text-warning-foreground">
                        Segera kedaluwarsa
                      </span>
                    )}
                  </p>
                  {d.notes && <p className="text-sm text-muted-foreground">{d.notes}</p>}
                </div>
                <div className="flex gap-2">
                  {d.url && (
                    <Button asChild size="sm" variant="outline" className="text-sm">
                      <a href={d.url} target="_blank" rel="noreferrer">
                        Lihat
                      </a>
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-sm text-destructive"
                    aria-label={`Hapus dokumen ${d.doc_type}`}
                    disabled={sibuk}
                    onClick={() => hapus(d)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}