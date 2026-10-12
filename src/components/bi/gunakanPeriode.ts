import { useMemo, useState } from "react";

import { periodeDari, tanggalLokal, type KunciPeriode, type Periode } from "@/lib/analytics";

export function gunakanPeriode(awal: KunciPeriode = "bulan_ini") {
  const kini = new Date();
  const [kunci, setKunci] = useState<KunciPeriode>(awal);
  const [dari, setDari] = useState(tanggalLokal(new Date(kini.getFullYear(), kini.getMonth(), 1)));
  const [sampai, setSampai] = useState(tanggalLokal(kini));

  const periode: Periode = useMemo(
    () => periodeDari(kunci, dari, sampai),
    [kunci, dari, sampai],
  );

  return { kunci, setKunci, dari, setDari, sampai, setSampai, periode };
}