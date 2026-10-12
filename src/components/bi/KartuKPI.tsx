import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { Pembanding } from "@/lib/analytics";

export function KartuKPI({
  ikon: Ikon,
  judul,
  nilai,
  catatan,
  pembanding,
  labelPembanding = "dari bulan lalu",
  naikItuBaik = true,
  aksen,
}: {
  ikon?: LucideIcon;
  judul: string;
  nilai: string;
  catatan?: string;
  pembanding?: Pembanding | null;
  labelPembanding?: string;
  naikItuBaik?: boolean;
  aksen?: "bahaya" | "peringatan";
}) {
  const baik =
    pembanding && pembanding.arah !== "sama"
      ? (pembanding.arah === "naik") === naikItuBaik
      : null;
  const IkonArah =
    pembanding?.arah === "naik" ? ArrowUp : pembanding?.arah === "turun" ? ArrowDown : Minus;

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-base font-medium text-muted-foreground">{judul}</p>
        {Ikon ? (
          <Ikon
            className={`size-5 shrink-0 ${aksen ? "text-destructive" : "text-primary"}`}
            aria-hidden
          />
        ) : null}
      </div>
      <p className="mt-3 font-heading text-2xl font-bold break-words text-foreground sm:text-3xl">
        {nilai}
      </p>
      {pembanding ? (
        <p
          className={`mt-2 flex items-center gap-1 text-sm font-medium ${
            baik === null ? "text-muted-foreground" : baik ? "text-primary" : "text-destructive"
          }`}
        >
          <IkonArah className="size-4 shrink-0" aria-hidden />
          {pembanding.arah === "sama" ? "Sama" : `${pembanding.persen}%`} {labelPembanding}
        </p>
      ) : null}
      {catatan ? <p className="mt-1 text-sm text-muted-foreground">{catatan}</p> : null}
    </div>
  );
}