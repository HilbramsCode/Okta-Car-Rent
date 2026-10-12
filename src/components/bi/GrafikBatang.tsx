import { formatRupiahShort } from "@/lib/format";

export type BatangData = { label: string; nilai: number };

export function GrafikBatang({
  judul,
  data,
  uang = true,
}: {
  judul: string;
  data: BatangData[];
  uang?: boolean;
}) {
  const maks = Math.max(1, ...data.map((d) => d.nilai));

  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <h2 className="font-heading text-xl font-bold text-foreground">{judul}</h2>
      {data.length === 0 ? (
        <p className="mt-3 text-base text-muted-foreground">Tidak ada data pada periode ini.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {data.map((d) => (
            <li key={d.label} className="space-y-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-base text-foreground">{d.label}</span>
                <span className="text-base font-medium text-muted-foreground">
                  {uang ? formatRupiahShort(d.nilai) : new Intl.NumberFormat("id-ID").format(d.nilai)}
                </span>
              </div>
              <div className="h-3 w-full rounded-sm bg-muted">
                <div
                  className="h-3 rounded-sm bg-primary"
                  style={{ width: `${Math.max(2, (d.nilai / maks) * 100)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}