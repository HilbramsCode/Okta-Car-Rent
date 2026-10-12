import { createFileRoute, Link } from "@tanstack/react-router";

import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { RoleGate } from "@/components/dashboard/RoleGate";
import { NavAnalitik } from "@/components/bi/NavAnalitik";
import { Route as AuthRoute } from "@/routes/_authenticated/route";
import { useUserRole } from "@/lib/auth";
import { LAPORAN } from "@/lib/reports";

export const Route = createFileRoute("/_authenticated/dashboard/laporan/")({
  head: () => ({
    meta: [
      { title: "Pusat Laporan | Okta Car Rent" },
      {
        name: "description",
        content:
          "Kumpulan laporan rental mobil: pendapatan, kontrak, kendaraan, pembayaran, deposit, tunggakan, perawatan, bengkel, dan pelanggan.",
      },
      { property: "og:title", content: "Pusat Laporan | Okta Car Rent" },
      {
        property: "og:description",
        content: "Buka, saring, dan unduh laporan operasional maupun keuangan dalam format CSV dan Excel.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Halaman,
});

function Isi() {
  const { user } = AuthRoute.useRouteContext();
  const { role } = useUserRole(user?.id);
  const daftar = LAPORAN.filter((l) => (l.hanyaPemilik ? role === "owner" : true));

  return (
    <div className="space-y-6">
      <NavAnalitik />
      <p className="text-base text-muted-foreground">
        Pilih laporan, atur periode dan filter, lalu unduh dalam format CSV atau Excel.
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {daftar.map((l) => (
          <Link
            key={l.key}
            to="/dashboard/laporan/$key"
            params={{ key: l.key }}
            className="rounded-lg border border-border bg-card p-4 hover:border-primary"
          >
            <h2 className="font-heading text-xl font-bold text-foreground">{l.judul}</h2>
            <p className="mt-2 text-base text-muted-foreground">{l.deskripsi}</p>
            <p className="mt-3 text-base font-medium text-primary">Buka laporan</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

function Halaman() {
  return (
    <RoleGate allow={["owner", "admin"]}>
      <DashboardShell peran="Laporan" judul="Pusat Laporan">
        <Isi />
      </DashboardShell>
    </RoleGate>
  );
}
