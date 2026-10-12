import { useQuery } from "@tanstack/react-query";
import { FileText } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { urlBukti } from "@/lib/payments";

export function PratinjauBukti({
  path,
  tinggi = "h-64",
}: {
  path: string | null | undefined;
  tinggi?: string;
}) {
  const { data, isPending } = useQuery({
    queryKey: ["bukti-bayar", path],
    queryFn: () => urlBukti(path),
    enabled: Boolean(path),
  });

  if (!path) {
    return (
      <div className="flex h-32 items-center justify-center rounded-md border border-dashed border-border text-base text-muted-foreground">
        Tidak ada bukti pembayaran
      </div>
    );
  }

  if (isPending) return <Skeleton className={`w-full rounded-md ${tinggi}`} />;
  if (!data) {
    return (
      <p className="rounded-md border border-border p-3 text-base text-muted-foreground">
        Bukti tidak dapat dibuka.
      </p>
    );
  }

  const pdf = path.toLowerCase().endsWith(".pdf");

  return (
    <div className="space-y-2">
      {pdf ? (
        <a
          href={data}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 rounded-md border border-border p-4 text-base font-semibold text-primary"
        >
          <FileText className="size-5" /> Buka bukti pembayaran (PDF)
        </a>
      ) : (
        <a href={data} target="_blank" rel="noreferrer">
          <img
            src={data}
            alt="Bukti pembayaran yang diunggah penyewa"
            className={`w-full rounded-md border border-border object-contain ${tinggi}`}
            loading="lazy"
          />
        </a>
      )}
      <p className="text-sm text-muted-foreground">Klik gambar untuk melihat ukuran penuh.</p>
    </div>
  );
}
