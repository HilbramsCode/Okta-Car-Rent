import { useMemo, useState } from "react";
import { ArrowDownUp, Download, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatRupiah } from "@/lib/format";
import {
  eksporCSV,
  eksporExcel,
  tampilkanSel,
  totalKolomUang,
  type BarisLaporan,
  type DefinisiLaporan,
  type FilterLaporan,
} from "@/lib/reports";

const PER_HALAMAN = 25;

export function TabelLaporan({
  definisi,
  baris,
  filter,
  periodeLabel,
  onCari,
  onStatus,
}: {
  definisi: DefinisiLaporan;
  baris: BarisLaporan[];
  filter: FilterLaporan;
  periodeLabel: string;
  onCari: (v: string) => void;
  onStatus: (v: string) => void;
}) {
  const [urutKolom, setUrutKolom] = useState<string | null>(null);
  const [naik, setNaik] = useState(false);
  const [halaman, setHalaman] = useState(1);

  const terurut = useMemo(() => {
    if (!urutKolom) return baris;
    const salinan = [...baris];
    salinan.sort((a, b) => {
      const x = a[urutKolom] ?? "";
      const y = b[urutKolom] ?? "";
      if (typeof x === "number" && typeof y === "number") return naik ? x - y : y - x;
      return naik ? String(x).localeCompare(String(y)) : String(y).localeCompare(String(x));
    });
    return salinan;
  }, [baris, urutKolom, naik]);

  const totalHalaman = Math.max(1, Math.ceil(terurut.length / PER_HALAMAN));
  const halamanAman = Math.min(halaman, totalHalaman);
  const tampil = terurut.slice((halamanAman - 1) * PER_HALAMAN, halamanAman * PER_HALAMAN);
  const total = totalKolomUang(definisi, terurut);

  async function ekspor(jenis: "csv" | "xlsx") {
    try {
      if (jenis === "csv") await eksporCSV(definisi, terurut, periodeLabel, filter);
      else await eksporExcel(definisi, terurut, periodeLabel, filter);
      toast.success(`Laporan diekspor (${terurut.length} baris).`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ekspor gagal.");
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 rounded-lg border border-border bg-card p-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="cari-laporan" className="text-base">
            Cari
          </Label>
          <Input
            id="cari-laporan"
            className="h-11 text-base"
            placeholder="Nama penyewa, nomor, atau kendaraan"
            value={filter.cari}
            onChange={(e) => {
              onCari(e.target.value);
              setHalaman(1);
            }}
          />
        </div>
        {definisi.opsiStatus.length > 0 ? (
          <div className="space-y-2">
            <Label className="text-base">Status</Label>
            <Select
              value={filter.status || "semua"}
              onValueChange={(v) => {
                onStatus(v === "semua" ? "" : v);
                setHalaman(1);
              }}
            >
              <SelectTrigger className="h-11 text-base">
                <SelectValue placeholder="Semua status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="semua">Semua Status</SelectItem>
                {definisi.opsiStatus.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button size="lg" variant="outline" className="text-base" onClick={() => ekspor("csv")}>
          <Download className="mr-2 size-4" aria-hidden /> Ekspor CSV
        </Button>
        <Button size="lg" variant="outline" className="text-base" onClick={() => ekspor("xlsx")}>
          <FileSpreadsheet className="mr-2 size-4" aria-hidden /> Ekspor Excel
        </Button>
        <p className="text-base text-muted-foreground">{terurut.length} baris</p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full border-collapse text-base">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left">
              {definisi.kolom.map((k) => (
                <th key={k.key} className="whitespace-nowrap px-3 py-3 font-medium text-muted-foreground">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1"
                    onClick={() => {
                      setNaik(urutKolom === k.key ? !naik : false);
                      setUrutKolom(k.key);
                    }}
                  >
                    {k.label}
                    <ArrowDownUp className="size-3.5" aria-hidden />
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tampil.length === 0 ? (
              <tr>
                <td colSpan={definisi.kolom.length} className="px-3 py-6 text-muted-foreground">
                  Tidak ada data yang cocok dengan filter.
                </td>
              </tr>
            ) : (
              tampil.map((b, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  {definisi.kolom.map((k) => (
                    <td
                      key={k.key}
                      className={`whitespace-nowrap px-3 py-3 ${
                        k.tipe === "uang" || k.tipe === "angka"
                          ? "text-right tabular-nums"
                          : "text-foreground"
                      }`}
                    >
                      {tampilkanSel(b[k.key] ?? null, k.tipe)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
          {Object.keys(total).length > 0 && tampil.length > 0 ? (
            <tfoot>
              <tr className="border-t border-border bg-muted/40">
                {definisi.kolom.map((k, i) => (
                  <td key={k.key} className="whitespace-nowrap px-3 py-3 text-right font-semibold">
                    {i === 0 ? "Total" : k.key in total ? formatRupiah(total[k.key]) : ""}
                  </td>
                ))}
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>

      {totalHalaman > 1 ? (
        <div className="flex flex-wrap items-center gap-3">
          <Button
            size="lg"
            variant="outline"
            className="text-base"
            disabled={halamanAman <= 1}
            onClick={() => setHalaman(halamanAman - 1)}
          >
            Sebelumnya
          </Button>
          <p className="text-base text-muted-foreground">
            Halaman {halamanAman} dari {totalHalaman}
          </p>
          <Button
            size="lg"
            variant="outline"
            className="text-base"
            disabled={halamanAman >= totalHalaman}
            onClick={() => setHalaman(halamanAman + 1)}
          >
            Berikutnya
          </Button>
        </div>
      ) : null}
    </div>
  );
}