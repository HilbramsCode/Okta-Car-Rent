import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { RoleGate } from "@/components/dashboard/RoleGate";
import { Button } from "@/components/ui/button";
import { ambilInfoPerawatanSaya } from "@/lib/maintenance";

function InfoPerawatan() {
  const info = useQuery({
    queryKey: ["perawatan-info-penyewa"],
    queryFn: ambilInfoPerawatanSaya,
  });

  if (info.isError) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <p role="alert" className="text-base text-muted-foreground">
          Informasi perawatan belum dapat dimuat.
        </p>
      </div>
    );
  }
  if (!info.data || info.data.length === 0) return null;

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h2 className="font-heading text-xl font-bold text-foreground">Info Perbaikan Unit</h2>
      <ul className="mt-2 space-y-2">
        {info.data.map((i) => (
          <li key={i.contract_number} className="text-base text-muted-foreground">
            {i.kendaraan} (kontrak {i.contract_number}) — {i.status}. Kami akan mengabari begitu
            unit siap kembali.
          </li>
        ))}
      </ul>
    </div>
  );
}

export const Route = createFileRoute("/_authenticated/dashboard/renter")({
  component: () => (
    <RoleGate allow="renter">
      <DashboardShell peran="Penyewa" judul="Dashboard Penyewa">
        <div className="space-y-4">
        <InfoPerawatan />
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="font-heading text-xl font-bold text-foreground">Kontrak Saya</h2>
          <p className="mt-1 text-base text-muted-foreground">
            Lihat kontrak sewa Anda: unit yang disewa, periode sewa, status kontrak, dan sisa
            pembayaran.
          </p>
          <Button asChild size="lg" className="mt-4 text-base">
            <Link to="/dashboard/renter/contracts">Buka Kontrak Saya</Link>
          </Button>
        </div>
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="font-heading text-xl font-bold text-foreground">Pembayaran Saya</h2>
          <p className="mt-1 text-base text-muted-foreground">
            Lihat riwayat pembayaran sewa Anda dan kirim bukti transfer untuk diverifikasi admin.
          </p>
          <Button asChild size="lg" className="mt-4 text-base">
            <Link to="/dashboard/renter/payments">Buka Pembayaran Saya</Link>
          </Button>
        </div>
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="font-heading text-xl font-bold text-foreground">Deposit Saya</h2>
          <p className="mt-1 text-base text-muted-foreground">
            Pantau uang jaminan Rp 500.000 Anda: status penahanan, rincian potongan, dan bukti
            pengembalian.
          </p>
          <Button asChild size="lg" className="mt-4 text-base">
            <Link to="/dashboard/renter/deposits">Buka Deposit Saya</Link>
          </Button>
        </div>
        </div>
      </DashboardShell>
    </RoleGate>
  ),
});