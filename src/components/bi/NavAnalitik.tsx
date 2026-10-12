import { Link } from "@tanstack/react-router";

const TAUTAN = [
  { to: "/dashboard/owner", label: "Ringkasan" },
  { to: "/dashboard/analitik/pendapatan", label: "Pendapatan" },
  { to: "/dashboard/analitik/armada", label: "Armada" },
  { to: "/dashboard/analitik/keuangan", label: "Keuangan" },
  { to: "/dashboard/analitik/pelanggan", label: "Pelanggan" },
  { to: "/dashboard/analitik/perawatan", label: "Perawatan" },
  { to: "/dashboard/laporan", label: "Pusat Laporan" },
] as const;

export function NavAnalitik() {
  return (
    <nav aria-label="Menu analitik" className="flex flex-wrap gap-2">
      {TAUTAN.map((t) => (
        <Link
          key={t.to}
          to={t.to}
          className="rounded-md border border-border bg-card px-4 py-2 text-base text-foreground hover:border-primary hover:text-primary"
          activeProps={{ className: "border-primary bg-primary text-primary-foreground" }}
          activeOptions={{ exact: true }}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}