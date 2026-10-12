import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ImagePlus, Star, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  hapusFotoKendaraan,
  jadikanFotoUtama,
  unggahFotoKendaraan,
  type FotoKendaraan,
} from "@/lib/vehicles";

const MAKS_MB = 5;

export function PengelolaFoto({
  vehicleId,
  foto,
  onBerubah,
}: {
  vehicleId: string;
  foto: (FotoKendaraan & { url: string | null })[];
  onBerubah: () => void;
}) {
  const [terpilih, setTerpilih] = useState<File[]>([]);
  const [pratinjau, setPratinjau] = useState<string[]>([]);
  const [sibuk, setSibuk] = useState(false);

  useEffect(() => {
    const urls = terpilih.map((f) => URL.createObjectURL(f));
    setPratinjau(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [terpilih]);

  function pilih(files: FileList | null) {
    if (!files) return;
    const daftar = Array.from(files);
    const salah = daftar.find(
      (f) => !f.type.startsWith("image/") || f.size > MAKS_MB * 1024 * 1024,
    );
    if (salah) {
      toast.error(`Berkas harus berupa gambar dan maksimal ${MAKS_MB} MB.`);
      return;
    }
    setTerpilih(daftar);
  }

  async function unggah() {
    if (terpilih.length === 0) return;
    setSibuk(true);
    try {
      for (const file of terpilih) {
        await unggahFotoKendaraan(vehicleId, file);
      }
      toast.success("Foto berhasil diunggah.");
      setTerpilih([]);
      onBerubah();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal mengunggah foto.");
    } finally {
      setSibuk(false);
    }
  }

  async function jalankan(aksi: () => Promise<void>, sukses: string) {
    setSibuk(true);
    try {
      await aksi();
      toast.success(sukses);
      onBerubah();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Tindakan gagal.");
    } finally {
      setSibuk(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="unggah-foto" className="text-base">
          Tambah foto kendaraan
        </Label>
        <Input
          id="unggah-foto"
          type="file"
          accept="image/*"
          multiple
          className="h-11 text-base"
          onChange={(e) => pilih(e.target.files)}
        />
        <p className="text-sm text-muted-foreground">Format gambar, maksimal {MAKS_MB} MB per foto.</p>
      </div>

      {pratinjau.length > 0 && (
        <div className="rounded-lg border border-border bg-secondary p-4">
          <p className="text-base font-semibold text-foreground">Pratinjau sebelum diunggah</p>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {pratinjau.map((src, i) => (
              <img
                key={src}
                src={src}
                alt={`Pratinjau foto ${i + 1}`}
                className="h-28 w-full rounded-md border border-border object-cover"
              />
            ))}
          </div>
          <div className="mt-3 flex gap-3">
            <Button size="lg" className="text-base" onClick={unggah} disabled={sibuk}>
              <ImagePlus className="mr-2 size-4" /> {sibuk ? "Mengunggah…" : "Unggah Foto"}
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-base"
              onClick={() => setTerpilih([])}
              disabled={sibuk}
            >
              Batal
            </Button>
          </div>
        </div>
      )}

      {foto.length === 0 ? (
        <p className="text-base text-muted-foreground">Belum ada foto kendaraan.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {foto.map((f) => (
            <figure key={f.id} className="rounded-lg border border-border bg-card p-3">
              {f.url ? (
                <img
                  src={f.url}
                  alt={f.caption ?? "Foto kendaraan"}
                  loading="lazy"
                  className="h-40 w-full rounded-md object-cover"
                />
              ) : (
                <div className="flex h-40 items-center justify-center rounded-md bg-muted text-base text-muted-foreground">
                  Foto tidak dapat dimuat
                </div>
              )}
              <figcaption className="mt-3 flex items-center justify-between gap-2">
                <span className="text-base font-medium text-foreground">
                  {f.is_primary ? "Foto utama" : "Foto pendukung"}
                </span>
                <span className="flex gap-2">
                  {!f.is_primary && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-sm"
                      disabled={sibuk}
                      onClick={() => jalankan(() => jadikanFotoUtama(f), "Foto utama diperbarui.")}
                    >
                      <Star className="mr-1 size-4" /> Jadikan utama
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-sm text-destructive"
                    disabled={sibuk}
                    aria-label="Hapus foto"
                    onClick={() => jalankan(() => hapusFotoKendaraan(f), "Foto dihapus.")}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </div>
  );
}