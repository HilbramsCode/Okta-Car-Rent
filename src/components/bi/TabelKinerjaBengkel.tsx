import { formatAngka, formatRupiah } from "@/lib/format";

export type BarisKinerjaBengkel = {
  workshop_id: string;
  name: string;
  kunjungan: number;
  total_biaya: number;
  rata_biaya: number;
  rata_hari: number;
};

const angka = (v: number | null | undefined) => formatAngka(Number(v ?? 0));
const hari = (v: number | null | undefined) => {
  const n = Number(v ?? 0);
  return `${formatAngka(Number.isFinite(n) ? Math.round(n) : 0)} hari`;
};
const rupiah = (v: number | null | undefined) => formatRupiah(Number(v ?? 0));

export function TabelKinerjaBengkel({ baris }: { baris: BarisKinerjaBengkel[] }) {
  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <h2 className="font-heading text-xl font-bold text-foreground">Kinerja Bengkel</h2>
      {baris.length === 0 ? (
        <div className="mt-3">
          <p className="text-base text-muted-foreground">Belum ada data bengkel</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Belum ada bengkel yang terdaftar atau pekerjaan perawatan yang terhubung ke bengkel.
          </p>
        </div>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-base">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="py-2 pr-3 font-medium text-muted-foreground">Bengkel</th>
                <th className="py-2 pr-3 text-right font-medium text-muted-foreground">
                  Kunjungan
                </th>
                <th className="py-2 pr-3 text-right font-medium text-muted-foreground">
                  Total Biaya
                </th>
                <th className="py-2 pr-3 text-right font-medium text-muted-foreground">
                  Rata-rata Biaya
                </th>
                <th className="py-2 text-right font-medium text-muted-foreground">
                  Rata-rata Lama Pengerjaan
                </th>
              </tr>
            </thead>
            <tbody>
              {baris.map((b) => (
                <tr key={b.workshop_id} className="border-b border-border last:border-0">
                  <td className="py-2 pr-3 text-foreground">{b.name}</td>
                  <td className="py-2 pr-3 text-right text-foreground">{angka(b.kunjungan)}</td>
                  <td className="py-2 pr-3 text-right font-medium text-foreground">
                    {rupiah(b.total_biaya)}
                  </td>
                  <td className="py-2 pr-3 text-right text-foreground">{rupiah(b.rata_biaya)}</td>
                  <td className="py-2 text-right text-foreground">{hari(b.rata_hari)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
