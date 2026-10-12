import { formatRupiah } from "@/lib/format";

export function TabelAngka({
  judul,
  kolomLabel = "Keterangan",
  kolomNilai = "Nilai",
  baris,
  uang = true,
  kosong = "Tidak ada data pada periode ini.",
}: {
  judul?: string;
  kolomLabel?: string;
  kolomNilai?: string;
  baris: { label: string; nilai: number; catatan?: string }[];
  uang?: boolean;
  kosong?: string;
}) {
  return (
    <section className="rounded-lg border border-border bg-card p-4">
      {judul ? <h2 className="font-heading text-xl font-bold text-foreground">{judul}</h2> : null}
      {baris.length === 0 ? (
        <p className="mt-3 text-base text-muted-foreground">{kosong}</p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[420px] border-collapse text-base">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="py-2 pr-3 font-medium text-muted-foreground">{kolomLabel}</th>
                <th className="py-2 text-right font-medium text-muted-foreground">{kolomNilai}</th>
              </tr>
            </thead>
            <tbody>
              {baris.map((b) => (
                <tr key={b.label} className="border-b border-border last:border-0">
                  <td className="py-2 pr-3 text-foreground">
                    {b.label}
                    {b.catatan ? (
                      <span className="block text-sm text-muted-foreground">{b.catatan}</span>
                    ) : null}
                  </td>
                  <td className="py-2 text-right font-medium text-foreground">
                    {uang ? formatRupiah(b.nilai) : new Intl.NumberFormat("id-ID").format(b.nilai)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}