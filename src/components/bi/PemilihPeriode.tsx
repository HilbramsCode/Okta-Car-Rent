import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OPSI_PERIODE, type KunciPeriode } from "@/lib/analytics";

export function PemilihPeriode({
  kunci,
  dari,
  sampai,
  onKunci,
  onDari,
  onSampai,
  onMuatUlang,
  diperbaruiPada,
}: {
  kunci: KunciPeriode;
  dari: string;
  sampai: string;
  onKunci: (v: KunciPeriode) => void;
  onDari: (v: string) => void;
  onSampai: (v: string) => void;
  onMuatUlang?: () => void;
  diperbaruiPada?: Date | null;
}) {
  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap gap-2">
        {OPSI_PERIODE.map((o) => (
          <Button
            key={o.value}
            size="lg"
            variant={kunci === o.value ? "default" : "outline"}
            className="text-base"
            onClick={() => onKunci(o.value)}
          >
            {o.label}
          </Button>
        ))}
      </div>

      {kunci === "kustom" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="periode-dari" className="text-base">
              Dari Tanggal
            </Label>
            <Input
              id="periode-dari"
              type="date"
              className="h-11 text-base"
              value={dari}
              onChange={(e) => onDari(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="periode-sampai" className="text-base">
              Sampai Tanggal
            </Label>
            <Input
              id="periode-sampai"
              type="date"
              className="h-11 text-base"
              value={sampai}
              onChange={(e) => onSampai(e.target.value)}
            />
          </div>
        </div>
      ) : null}

      {onMuatUlang ? (
        <div className="flex flex-wrap items-center gap-3">
          <Button size="lg" variant="outline" className="text-base" onClick={onMuatUlang}>
            <RefreshCw className="mr-2 size-4" aria-hidden /> Muat Ulang Data
          </Button>
          {diperbaruiPada ? (
            <p className="text-sm text-muted-foreground">
              Data per{" "}
              {diperbaruiPada.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}