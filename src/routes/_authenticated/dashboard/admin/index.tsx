import { createFileRoute, Link } from "@tanstack/react-router";
import { CarFront, FileText, Users } from "lucide-react";

import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { PemicuPemeriksaanHarian } from "@/components/dashboard/PemicuPemeriksaanHarian";
import { RoleGate } from "@/components/dashboard/RoleGate";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/dashboard/admin/")({
  head: () => ({
    meta: [
      { title: "Dashboard Admin | Okta Car Rent" },
      {
        name: "description",
        content: "Pusat kerja admin Okta Car Rent untuk mengelola armada dan operasional harian.",
      },
      { property: "og:title", content: "Dashboard Admin | Okta Car Rent" },
      {
        property: "og:description",
        content: "Kelola data kendaraan, status armada, dan dokumen kendaraan.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RoleGate allow="admin">
      <DashboardShell peran="Admin" judul="Dashboard Admin">
        <PemicuPemeriksaanHarian />
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="font-heading text-xl font-bold text-foreground">Manajemen Kendaraan</h2>
          <p className="mt-1 text-base text-muted-foreground">
            Kelola data armada: tambah kendaraan, ubah status, foto, dan dokumen.
          </p>
          <Button asChild size="lg" className="mt-4 text-base">
            <Link to="/dashboard/admin/vehicles">
              <CarFront className="mr-2 size-4" /> Buka Daftar Kendaraan
            </Link>
          </Button>
        </div>
        <div className="mt-4 rounded-lg border border-border bg-card p-6">
          <h2 className="font-heading text-xl font-bold text-foreground">Manajemen Penyewa</h2>
          <p className="mt-1 text-base text-muted-foreground">
            Kelola data penyewa: pendaftaran, verifikasi dokumen, riwayat sewa, dan catatan.
          </p>
          <Button asChild size="lg" className="mt-4 text-base">
            <Link to="/dashboard/admin/renters">
              <Users className="mr-2 size-4" /> Buka Daftar Penyewa
            </Link>
          </Button>
        </div>
        <div className="mt-4 rounded-lg border border-border bg-card p-6">
          <h2 className="font-heading text-xl font-bold text-foreground">Manajemen Kontrak</h2>
          <p className="mt-1 text-base text-muted-foreground">
            Buat kontrak sewa, serah terima unit, catat pembayaran, perpanjangan, dan pengembalian.
          </p>
          <Button asChild size="lg" className="mt-4 text-base">
            <Link to="/dashboard/admin/contracts">
              <FileText className="mr-2 size-4" /> Buka Daftar Kontrak
            </Link>
          </Button>
        </div>
        <div className="mt-4 rounded-lg border border-border bg-card p-6">
          <h2 className="font-heading text-xl font-bold text-foreground">Manajemen Pembayaran</h2>
          <p className="mt-1 text-base text-muted-foreground">
            Catat pembayaran, verifikasi bukti transfer penyewa, dan tagih tunggakan.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button asChild size="lg" className="text-base">
              <Link to="/dashboard/admin/payments">Daftar Pembayaran</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="text-base">
              <Link to="/dashboard/admin/payments/verifikasi">Antrean Verifikasi</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="text-base">
              <Link to="/dashboard/admin/outstanding">Tunggakan</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="text-base">
              <Link to="/dashboard/admin/deposits">Deposit</Link>
            </Button>
          </div>
        </div>
        <div className="mt-4 rounded-lg border border-border bg-card p-6">
          <h2 className="font-heading text-xl font-bold text-foreground">Perawatan Armada</h2>
          <p className="mt-1 text-base text-muted-foreground">
            Jadwalkan servis berkala, catat perbaikan kerusakan, dan pantau kesiapan kendaraan.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button asChild size="lg" className="text-base">
              <Link to="/dashboard/admin/maintenance">Buka Perawatan</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="text-base">
              <Link to="/dashboard/admin/maintenance/new">Jadwalkan Perawatan</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="text-base">
              <Link to="/dashboard/admin/maintenance/workshops">Data Bengkel</Link>
            </Button>
          </div>
        </div>
      </DashboardShell>
    </RoleGate>
  ),
});