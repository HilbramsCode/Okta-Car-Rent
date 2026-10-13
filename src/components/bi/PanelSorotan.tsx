import { AlertCircle, CheckCircle2, Info } from "lucide-react";

import type { Sorotan } from "@/lib/analytics";

const gaya = {
  bahaya: "border-destructive/40 bg-destructive/10 text-destructive",
  peringatan: "border-primary/40 bg-primary/10 text-foreground",
  sukses: "border-border bg-card text-foreground",
} as const;

export function PanelSorotan({ sorotan }: { sorotan: Sorotan[] }) {
  if (sorotan.length === 0) {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-border bg-card p-4">
        <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
        <p className="text-base text-foreground">
          Tidak ada masalah yang perlu perhatian khusus hari ini.
        </p>
      </div>
    );
  }

  return (
    <section aria-label="Sorotan penting" className="space-y-3">
      {sorotan.slice(0, 4).map((s, i) => {
        const Ikon =
          s.tingkat === "bahaya" ? AlertCircle : s.tingkat === "sukses" ? CheckCircle2 : Info;
        return (
          <div
            key={i}
            className={`flex items-start gap-3 rounded-lg border p-4 ${gaya[s.tingkat]}`}
          >
            <Ikon className="mt-0.5 size-5 shrink-0" aria-hidden />
            <p
              className={`text-base font-medium ${s.tingkat === "peringatan" ? "text-destructive" : ""}`}
            >
              {s.pesan}
            </p>
          </div>
        );
      })}
    </section>
  );
}
