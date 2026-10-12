import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { RoleGate } from "@/components/dashboard/RoleGate";
import { PratinjauBukti } from "@/components/payments/PratinjauBukti";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRupiah, formatTanggalSingkat } from "@/lib/format";
import { statusDeposit } from "@/lib/labels";
import { ambilDepositSaya, labelJenisPotongan } from "@/lib/deposits";

export const Route = createFileRoute("/_authenticated/dashboard/renter_/deposits")({
  head: () => ({
    meta: [
      { title: "Deposit Saya | Okta Car Rent" },
      {
        name: "description",
        content:
          "Pantau uang jaminan Rp500.000 Anda di Okta Car Rent: status penahanan, rincian potongan, dan bukti pengembalian.",
      },
      { property: "og:title", content: "Deposit Saya | Okta Car Rent" },
      {
        property: "og:description",
        content: "Informasi deposit penyewa Okta Car Rent beserta rincian potongan dan pengembalian.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RoleGate allow={["renter", "admin", "owner"]}>
      <DashboardShell peran="Penyewa" judul="Deposit Saya">
        <PortalDeposit />
      </DashboardShell>
    </RoleGate>
  ),
});

function PortalDeposit() {
  const daftar = useQuery({ queryKey: ["deposit-saya"], queryFn: ambilDepositSaya });

  return (
    <div className="space-y-6">
      <p className="text-base text-muted-foreground">
        Deposit adalah uang jaminan Rp 500.000 per kontrak. Deposit dikembalikan penuh bila tidak ada
        tunggakan dan tidak ada kerusakan kendaraan.
      </p>

      {daftar.isPending ? (
        <Skeleton className="h-48 w-full rounded-lg" />
      ) : daftar.isError ? (
        <p role="alert" className="text-base text-destructive">
          {(daftar.error as Error).message}
        </p>
      ) : (daftar.data ?? []).length === 0 ? (
        <p className="rounded-md border border-border bg-card p-4 text-base text-muted-foreground">
          Belum ada deposit tercatat.
        </p>
      ) : (
        <ul className="space-y-4">
          {(daftar.data ?? []).map(({ deposit: d, potongan }) => (
            <li key={d.id} className="space-y-3 rounded-lg border border-border bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-foreground">
                    Kontrak {d.contracts?.contract_number ?? "-"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {d.contracts
                      ? `${formatTanggalSingkat(d.contracts.start_date)} – ${formatTanggalSingkat(d.contracts.end_date)}`
                      : "-"}
                  </p>
                </div>
                <StatusBadge map={statusDeposit} value={d.status} />
              </div>

              <div className="grid gap-3 text-base sm:grid-cols-3">
                <p>
                  Deposit:{" "}
                  <span className="font-semibold text-foreground">{formatRupiah(d.amount)}</span>
                </p>
                <p>
                  Total potongan:{" "}
                  <span className="font-semibold text-foreground">
                    {formatRupiah(d.total_potongan)}
                  </span>
                </p>
                <p>
                  Sisa:{" "}
                  <span className="font-semibold text-foreground">
                    {formatRupiah(Math.max(0, Number(d.amount) - d.total_potongan))}
                  </span>
                </p>
              </div>

              {potongan.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-base font-semibold text-foreground">Rincian Potongan</h3>
                  <ul className="space-y-2">
                    {potongan.map((p) => (
                      <li key={p.id} className="rounded-md border border-border p-3">
                        <p className="text-base text-foreground">
                          {formatRupiah(p.amount)} • {p.reason}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {labelJenisPotongan(p.deduction_type)} •{" "}
                          {formatTanggalSingkat(p.created_at)}
                          {p.workshop_name ? ` • bengkel ${p.workshop_name}` : ""}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {d.refund_date && (
                <div className="space-y-2 rounded-md border border-border p-3">
                  <p className="text-base text-foreground">
                    Dikembalikan {formatRupiah(d.refund_amount ?? 0)} pada{" "}
                    {formatTanggalSingkat(d.refund_date)} ke {d.refund_bank_name ?? "-"}{" "}
                    {d.refund_account_number ?? ""}
                  </p>
                  <PratinjauBukti path={d.refund_proof_url} tinggi="h-56" />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap gap-3">
        <Button asChild size="lg" variant="outline" className="text-base">
          <Link to="/dashboard/renter">Kembali ke Dasbor</Link>
        </Button>
        <Button asChild size="lg" variant="outline" className="text-base">
          <Link to="/dashboard/renter/payments">Pembayaran Saya</Link>
        </Button>
      </div>
    </div>
  );
}