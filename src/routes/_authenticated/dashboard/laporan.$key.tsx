import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";

import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { RoleGate } from "@/components/dashboard/RoleGate";
import { PemilihPeriode } from "@/components/bi/PemilihPeriode";
import { TabelLaporan } from "@/components/bi/TabelLaporan";
import { GalatMuat } from "@/components/bi/StatusMuat";
import { gunakanPeriode } from "@/components/bi/gunakanPeriode";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Route as AuthRoute } from "@/routes/_authenticated/route";
import { useUserRole } from "@/lib/auth";
import { OPSI_CACHE, catatBukaLaporan } from "@/lib/analytics";
import { cariLaporan } from "@/lib/reports";

export const Route = createFileRoute("/_authenticated/dashboard/laporan/$key")({
  head: () => ({
    meta: [
      { title: "Laporan | Okta Car Rent" },
      {
        name: "description",
        content:
          "Tabel laporan rental mobil dengan filter periode, pencarian, status, serta unduhan CSV dan Excel.",
      },
      { property: "og:title", content: "Laporan | Okta Car Rent" },
      {
        property: "og:description",
        content: "Saring data laporan dan unduh hasilnya untuk kebutuhan administrasi.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Halaman,
});

function Isi() {
  const { key } = Route.useParams();
  const definisi = cariLaporan(key);
  const { user } = AuthRoute.useRouteContext();
  const { role, loading } = useUserRole(user?.id);
  const p = gunakanPeriode();
  const [cari, setCari] = useState("");
  const [status, setStatus] = useState("semua");

  const filter = { dari: p.periode.dari, sampai: p.periode.sampai, cari, status };

  const q = useQuery({
    queryKey: ["laporan", key, filter.dari, filter.sampai],
    queryFn: () => definisi!.ambil({ ...filter, cari: "", status: "semua" }),
    enabled: Boolean(definisi),
    ...OPSI_CACHE,
  });

  useEffect(() => {
    if (definisi) void catatBukaLaporan(definisi.key, p.periode.label);
  }, [definisi, p.periode.label]);

  if (!definisi) {
    return (
      <div className="space-y-4">
        <GalatMuat pesan="Laporan tidak ditemukan." />
        <Button asChild size="lg" variant="outline" className="text-base">
          <Link to="/dashboard/laporan">Kembali ke Pusat Laporan</Link>
        </Button>
      </div>
    );
  }

  if (!loading && definisi.hanyaPemilik && role !== "owner") {
    return (
      <div className="space-y-4">
        <GalatMuat pesan="Laporan ini hanya dapat dibuka oleh pemilik." />
        <Button asChild size="lg" variant="outline" className="text-base">
          <Link to="/dashboard/laporan">Kembali ke Pusat Laporan</Link>
        </Button>
      </div>
    );
  }

  const baris = (q.data ?? []).filter((b) => {
    const cocokCari =
      !cari ||
      definisi.kolom.some((k) =>
        String(b[k.key] ?? "").toLowerCase().includes(cari.toLowerCase()),
      );
    const cocokStatus =
      status === "semua" ||
      definisi.kolom.some((k) => String(b[k.key] ?? "") === status) ||
      String(b["status"] ?? "") === status;
    return cocokCari && cocokStatus;
  });

  return (
    <div className="space-y-6">
      <Button asChild size="lg" variant="outline" className="text-base">
        <Link to="/dashboard/laporan">
          <ArrowLeft className="mr-2 size-4" aria-hidden /> Pusat Laporan
        </Link>
      </Button>

      <p className="text-base text-muted-foreground">{definisi.deskripsi}</p>

      {definisi.pakaiPeriode ? (
        <PemilihPeriode
          kunci={p.kunci}
          dari={p.dari}
          sampai={p.sampai}
          onKunci={p.setKunci}
          onDari={p.setDari}
          onSampai={p.setSampai}
          onMuatUlang={() => void q.refetch()}
          diperbaruiPada={q.dataUpdatedAt ? new Date(q.dataUpdatedAt) : null}
        />
      ) : null}

      {q.isPending ? (
        <Skeleton className="h-72 w-full rounded-lg" />
      ) : q.error ? (
        <GalatMuat pesan={q.error instanceof Error ? q.error.message : undefined} />
      ) : (
        <TabelLaporan
          definisi={definisi}
          baris={baris}
          filter={filter}
          periodeLabel={definisi.pakaiPeriode ? p.periode.label : "Semua data"}
          onCari={setCari}
          onStatus={setStatus}
        />
      )}
    </div>
  );
}

function Halaman() {
  const { key } = Route.useParams();
  const definisi = cariLaporan(key);
  return (
    <RoleGate allow={["owner", "admin"]}>
      <DashboardShell peran="Laporan" judul={definisi?.judul ?? "Laporan"}>
        <Isi />
      </DashboardShell>
    </RoleGate>
  );
}
