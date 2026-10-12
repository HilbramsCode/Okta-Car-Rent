import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { RoleGate } from "@/components/dashboard/RoleGate";
import { FormKontrak } from "@/components/contracts/FormKontrak";
import { Skeleton } from "@/components/ui/skeleton";
import { Route as AuthRoute } from "@/routes/_authenticated/route";
import { useUserRole } from "@/lib/auth";
import {
  ambilDetailKontrak,
  perbaruiKontrakDraft,
  type MasukanBuatKontrak,
} from "@/lib/contracts";

export const Route = createFileRoute("/_authenticated/dashboard/admin/contracts/$id/edit")({
  head: () => ({
    meta: [
      { title: "Ubah Kontrak Draft | Okta Car Rent" },
      {
        name: "description",
        content:
          "Ubah data kontrak sewa yang masih berstatus draft sebelum unit diserahterimakan ke penyewa.",
      },
      { property: "og:title", content: "Ubah Kontrak Draft | Okta Car Rent" },
      {
        property: "og:description",
        content: "Perbarui periode sewa, unit, dan rincian biaya kontrak draft.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RoleGate allow={["owner", "admin"]}>
      <DashboardShell peran="Manajemen Kontrak" judul="Ubah Kontrak Draft">
        <HalamanUbahKontrak />
      </DashboardShell>
    </RoleGate>
  ),
});

function HalamanUbahKontrak() {
  const { id } = useParams({ from: "/_authenticated/dashboard/admin/contracts/$id/edit" });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = AuthRoute.useRouteContext();
  const { role } = useUserRole(user?.id);

  const detail = useQuery({
    queryKey: ["kontrak-detail", id],
    queryFn: () => ambilDetailKontrak(id),
  });

  const simpan = useMutation({
    mutationFn: (nilai: MasukanBuatKontrak) => perbaruiKontrakDraft(id, nilai),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kontrak-detail", id] });
      queryClient.invalidateQueries({ queryKey: ["kontrak-daftar"] });
      toast.success("Kontrak draft diperbarui.");
      navigate({ to: "/dashboard/admin/contracts/$id", params: { id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (detail.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (detail.isError) {
    return (
      <p role="alert" className="text-base text-destructive">
        {(detail.error as Error).message}
      </p>
    );
  }

  if (detail.data!.kontrak.status !== "draft") {
    return (
      <p role="alert" className="text-base text-destructive">
        Kontrak yang sudah aktif atau selesai tidak dapat diubah. Gunakan perpanjangan atau
        pengembalian pada halaman detail.
      </p>
    );
  }

  return (
    <FormKontrak
      awal={detail.data!.kontrak}
      labelSimpan="Simpan Perubahan"
      mengirim={simpan.isPending}
      bolehMenimpa={role === "owner"}
      onSimpan={(nilai) => simpan.mutate(nilai)}
      onBatal={() => navigate({ to: "/dashboard/admin/contracts/$id", params: { id } })}
    />
  );
}