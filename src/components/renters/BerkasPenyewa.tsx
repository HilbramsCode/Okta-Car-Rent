import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FileText, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  hapusBerkasPenyewa,
  unggahBerkasPenyewa,
  type JenisBerkasPenyewa,
} from "@/lib/renters";

const MAKS_BYTE = 5 * 1024 * 1024;
const TIPE_DIIZINKAN = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

export function BerkasPenyewa({
  renterId,
  jenis,
  judul,
  path,
  url,
}: {
  renterId: string;
  jenis: JenisBerkasPenyewa;
  judul: string;
  path: string | null;
  url: string | null;
}) {
  const queryClient = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const [pesan, setPesan] = useState<string | null>(null);

  const segarkan = () => {
    queryClient.invalidateQueries({ queryKey: ["penyewa", renterId] });
    queryClient.invalidateQueries({ queryKey: ["penyewa-daftar"] });
  };

  const unggah = useMutation({
    mutationFn: (file: File) => unggahBerkasPenyewa(renterId, jenis, file),
    onSuccess: () => {
      toast.success(`${judul} berhasil diunggah.`);
      segarkan();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const hapus = useMutation({
    mutationFn: () => hapusBerkasPenyewa(renterId, jenis, path),
    onSuccess: () => {
      toast.success(`${judul} dihapus.`);
      segarkan();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function pilih(file: File | undefined) {
    setPesan(null);
    if (!file) return;
    if (!TIPE_DIIZINKAN.includes(file.type)) {
      setPesan("Format berkas harus JPG, PNG, WEBP, atau PDF.");
      return;
    }
    if (file.size > MAKS_BYTE) {
      setPesan("Ukuran berkas maksimal 5 MB.");
      return;
    }
    unggah.mutate(file);
  }

  const gambar = url && !url.toLowerCase().includes(".pdf");

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="font-heading text-base font-bold text-foreground">{judul}</p>
      <div className="mt-3 flex items-center gap-4">
        {url ? (
          gambar ? (
            <img
              src={url}
              alt={judul}
              loading="lazy"
              className={
                jenis === "foto"
                  ? "size-20 rounded-full object-cover"
                  : "h-20 w-28 rounded-md object-cover"
              }
            />
          ) : (
            <div className="flex h-20 w-28 items-center justify-center rounded-md bg-muted">
              <FileText className="size-6 text-muted-foreground" aria-hidden />
            </div>
          )
        ) : (
          <div
            className={
              jenis === "foto"
                ? "flex size-20 items-center justify-center rounded-full bg-muted"
                : "flex h-20 w-28 items-center justify-center rounded-md bg-muted"
            }
          >
            {jenis === "foto" ? (
              <UserRound className="size-6 text-muted-foreground" aria-hidden />
            ) : (
              <FileText className="size-6 text-muted-foreground" aria-hidden />
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <input
            ref={input}
            type="file"
            accept=".jpg,.jpeg,.png,.webp,.pdf"
            className="hidden"
            onChange={(e) => {
              pilih(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <Button
            size="sm"
            variant="outline"
            className="text-sm"
            disabled={unggah.isPending}
            onClick={() => input.current?.click()}
          >
            {unggah.isPending ? "Mengunggah…" : url ? "Ganti Berkas" : "Unggah Berkas"}
          </Button>
          {url && (
            <>
              <Button asChild size="sm" variant="outline" className="text-sm">
                <a href={url} target="_blank" rel="noreferrer">
                  Lihat
                </a>
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-sm"
                disabled={hapus.isPending}
                onClick={() => hapus.mutate()}
              >
                Hapus
              </Button>
            </>
          )}
        </div>
      </div>
      {pesan && (
        <p role="alert" className="mt-2 text-sm font-medium text-destructive">
          {pesan}
        </p>
      )}
      <p className="mt-2 text-sm text-muted-foreground">Maksimal 5 MB. Format JPG, PNG, WEBP, PDF.</p>
    </div>
  );
}