import { AlertCircle } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";

export function MemuatKartu({ jumlah = 6 }: { jumlah?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: jumlah }).map((_, i) => (
        <Skeleton key={i} className="h-32 w-full rounded-lg" />
      ))}
    </div>
  );
}

export function GalatMuat({ pesan }: { pesan?: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4">
      <AlertCircle className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden />
      <div>
        <p className="text-base font-semibold text-destructive">Data gagal dimuat</p>
        <p className="text-sm text-muted-foreground">
          {pesan || "Silakan coba muat ulang data."}
        </p>
      </div>
    </div>
  );
}