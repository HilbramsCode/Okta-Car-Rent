import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { RoleGate } from "@/components/dashboard/RoleGate";
import { FormPenyewa } from "@/components/renters/FormPenyewa";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ambilDetailPenyewa, perbaruiPenyewa, type MasukanPenyewa } from "@/lib/renters";

export const Route = createFileRoute("/_authenticated/dashboard/admin/renters/$id/edit")({
  head: () => ({
    meta: [
      { title: "Ubah Data Penyewa | Okta Car Rent" },
      {
        name: "description",
        content: "Perbarui data penyewa Okta Car Rent. Setiap perubahan tercatat di log audit.",
      },
      { property: "og:title", content: "Ubah Data Penyewa | Okta Car Rent" },
      {
        property: "og:description",
        content: "Formulir pembaruan data penyewa beserta pencatatan riwayat perubahan.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RoleGate allow={["owner", "admin"]}>
      <DashboardShell peran="Manajemen Penyewa" judul="Ubah Data Penyewa">
        <HalamanUbahPenyewa />
      </DashboardShell>
    </RoleGate>
  ),
});

function HalamanUbahPenyewa() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const detail = useQuery({
    queryKey: ["penyewa", id],
    queryFn: () => ambilDetailPenyewa(id),
  });

  const simpan = useMutation({
    mutationFn: (nilai: MasukanPenyewa) => perbaruiPenyewa(id, nilai),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["penyewa", id] });
      queryClient.invalidateQueries({ queryKey: ["penyewa-daftar"] });
      toast.success("Data penyewa diperbarui dan tercatat di log audit.");
      navigate({ to: "/dashboard/admin/renters/$id", params: { id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (detail.isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  if (detail.isError || !detail.data) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-6">
        <p className="text-base font-semibold text-destructive">Data penyewa tidak dapat dimuat.</p>
        <p className="mt-1 text-base text-muted-foreground">
          {detail.error instanceof Error ? detail.error.message : "Terjadi kesalahan."}
        </p>
        <Button size="lg" className="mt-4 text-base" onClick={() => detail.refetch()}>
          Coba lagi
        </Button>
      </div>
    );
  }

  return (
    <FormPenyewa
      awal={detail.data.penyewa}
      labelSimpan="Simpan Perubahan"
      mengirim={simpan.isPending}
      onSimpan={(nilai) => simpan.mutate(nilai)}
      onBatal={() => navigate({ to: "/dashboard/admin/renters/$id", params: { id } })}
    />
  );
}