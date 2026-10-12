import { Fuel, Settings2, Users } from "lucide-react";

import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { formatRupiah } from "@/lib/format";
import { statusKendaraan } from "@/lib/labels";
import type { ArmadaPublik } from "@/lib/public.functions";

export function KartuArmada({ mobil }: { mobil: ArmadaPublik }) {
  return (
    <Card className="h-full">
      <CardHeader className="gap-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-heading text-xl font-bold">
              {mobil.brand} {mobil.model}
            </h3>
            <p className="text-base text-muted-foreground">
              {mobil.variant ? `${mobil.variant} · ` : ""}
              {mobil.year}
              {mobil.category ? ` · ${mobil.category}` : ""}
            </p>
          </div>
          <StatusBadge map={statusKendaraan} value={mobil.status} />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <ul className="grid grid-cols-3 gap-2 text-base text-muted-foreground">
          <li className="flex items-center gap-1.5">
            <Users className="size-4 text-primary" /> {mobil.seat_capacity} kursi
          </li>
          <li className="flex items-center gap-1.5 capitalize">
            <Settings2 className="size-4 text-primary" /> {mobil.transmission}
          </li>
          <li className="flex items-center gap-1.5 capitalize">
            <Fuel className="size-4 text-primary" /> {mobil.fuel_type}
          </li>
        </ul>

        <div className="rounded-md border border-border bg-secondary/60 p-3">
          <dl className="space-y-1.5 text-base">
            <div className="flex items-baseline justify-between">
              <dt className="text-muted-foreground">Harian</dt>
              <dd className="font-heading text-xl font-bold text-primary">
                {formatRupiah(mobil.daily_rate)}
              </dd>
            </div>
            {mobil.weekly_rate ? (
              <div className="flex items-baseline justify-between">
                <dt className="text-muted-foreground">Mingguan</dt>
                <dd className="font-semibold">{formatRupiah(mobil.weekly_rate)}</dd>
              </div>
            ) : null}
            {mobil.monthly_rate ? (
              <div className="flex items-baseline justify-between">
                <dt className="text-muted-foreground">Bulanan</dt>
                <dd className="font-semibold">{formatRupiah(mobil.monthly_rate)}</dd>
              </div>
            ) : null}
            <div className="flex items-baseline justify-between border-t border-border pt-1.5">
              <dt className="text-muted-foreground">Jaminan / deposit</dt>
              <dd className="font-semibold">{formatRupiah(mobil.deposit_amount)}</dd>
            </div>
          </dl>
        </div>
      </CardContent>
    </Card>
  );
}