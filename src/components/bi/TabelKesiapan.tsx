import { formatAngka } from "@/lib/format";

type Baris = {
  vehicle_id?: string;
  brand?: string;
  model?: string;
  plate_number?: string;
  current_odometer?: number;
  oil_remaining?: number;
  oil_urgency?: string;
  tire_remaining?: number;
  tire_urgency?: string;
};

const LABEL_URGENSI: Record<string, string> = {
  terlambat: "Lewat jadwal",
  segera: "Segera",
  aman: "Aman",
  overdue: "Lewat jadwal",
  warning: "Segera",
  ok: "Aman",
};

function warna(u?: string) {
  if (u === "terlambat" || u === "overdue") return "text-destructive font-semibold";
  if (u === "segera" || u === "warning") return "text-primary font-semibold";
  return "text-muted-foreground";
}

function intervalPenuh(nilai: number[]) {
  const valid = nilai.filter((n) => Number.isFinite(n));
  return valid.length > 0 ? Math.max(...valid) : null;
}

function Sel({
  sisa,
  urgensi,
  perkiraan,
}: {
  sisa: number;
  urgensi?: string;
  perkiraan: boolean;
}) {
  if (perkiraan) {
    return (
      <div className="text-muted-foreground">
        <span className="block font-semibold">Perkiraan</span>
        <span className="block">Ganti lagi ±{formatAngka(sisa)} km</span>
        <span className="mt-1 block text-sm">Belum ada riwayat servis</span>
      </div>
    );
  }
  const terlambat = urgensi === "terlambat" || urgensi === "overdue";
  return (
    <div className={warna(urgensi)}>
      <span className="block">{LABEL_URGENSI[urgensi ?? "aman"] ?? "-"}</span>
      <span className="block font-normal text-foreground">
        {terlambat
          ? `Terlambat ${formatAngka(Math.abs(sisa))} km`
          : `Ganti lagi ${formatAngka(sisa)} km`}
      </span>
    </div>
  );
}

export function TabelKesiapan({
  judul,
  baris,
}: {
  judul: string;
  baris: Record<string, unknown>[];
}) {
  const data = baris as Baris[];
  const intervalOli = intervalPenuh(data.map((b) => Number(b.oil_remaining ?? NaN)));
  const intervalBan = intervalPenuh(data.map((b) => Number(b.tire_remaining ?? NaN)));
  const adaPerkiraan = data.some(
    (b) =>
      (intervalOli !== null && Number(b.oil_remaining ?? NaN) === intervalOli) ||
      (intervalBan !== null && Number(b.tire_remaining ?? NaN) === intervalBan),
  );
  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <h2 className="font-heading text-xl font-bold text-foreground">{judul}</h2>
      {data.length === 0 ? (
        <p className="mt-3 text-base text-muted-foreground">
          Semua kendaraan dalam kondisi terjadwal aman.
        </p>
      ) : (
        <>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-base">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="py-2 pr-3 font-medium text-muted-foreground">Kendaraan</th>
                <th className="py-2 pr-3 font-medium text-muted-foreground">Odometer</th>
                <th className="py-2 pr-3 font-medium text-muted-foreground">Ganti Oli</th>
                <th className="py-2 font-medium text-muted-foreground">Ganti Ban</th>
              </tr>
            </thead>
            <tbody>
              {data.map((b, i) => {
                const oliPerkiraan =
                  intervalOli !== null && Number(b.oil_remaining ?? NaN) === intervalOli;
                const banPerkiraan =
                  intervalBan !== null && Number(b.tire_remaining ?? NaN) === intervalBan;
                return (
                <tr key={b.vehicle_id ?? i} className="border-b border-border last:border-0">
                  <td className="py-2 pr-3 text-foreground">
                    {b.brand} {b.model} · {b.plate_number}
                  </td>
                  <td className="py-2 pr-3 text-foreground">
                    {formatAngka(Number(b.current_odometer ?? 0))} km
                  </td>
                  <td className="py-2 pr-3 align-top">
                    <Sel
                      sisa={Number(b.oil_remaining ?? 0)}
                      urgensi={b.oil_urgency}
                      perkiraan={oliPerkiraan}
                    />
                  </td>
                  <td className="py-2 align-top">
                    <Sel
                      sisa={Number(b.tire_remaining ?? 0)}
                      urgensi={b.tire_urgency}
                      perkiraan={banPerkiraan}
                    />
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {adaPerkiraan ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Unit yang belum memiliki riwayat ganti oli atau ban masih menggunakan estimasi
            berdasarkan odometer saat ini. Setelah servis pertama dicatat, sistem akan menghitung
            sisa kilometer secara akurat berdasarkan riwayat servis.
          </p>
        ) : null}
        </>
      )}
    </section>
  );
}
