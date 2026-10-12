import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { RoleGate } from "@/components/dashboard/RoleGate";
import { FormKontrak } from "@/components/contracts/FormKontrak";
import { Route as AuthRoute } from "@/routes/_authenticated/route";
import { useUserRole } from "@/lib/auth";
import { buatKontrak, type MasukanBuatKontrak } from "@/lib/contracts";

export const Route = createFileRoute("/_authenticated/dashboard/admin/contracts/new")({
  head: () => ({
    meta: [
      { title: "Buat Kontrak Sewa | Okta Car Rent" },
      {
        name: "description",
        content:
          "Buat kontrak sewa baru: pilih penyewa, unit tersedia, periode sewa, dan rincian biaya secara otomatis.",
      },
      { property: "og:title", content: "Buat Kontrak Sewa | Okta Car Rent" },
      {
        property: "og:description",
        content: "Formulir pembuatan kontrak rental mobil dengan pengecekan ketersediaan unit.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RoleGate allow={["owner", "admin"]}>
      <DashboardShell peran="Manajemen Kontrak" judul="Buat Kontrak Sewa">
        <HalamanBuatKontrak />
      </DashboardShell>
    </RoleGate>
  ),
});

function HalamanBuatKontrak() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = AuthRoute.useRouteContext();
  const { role } = useUserRole(user?.id);

  const simpan = useMutation({
    mutationFn: (nilai: MasukanBuatKontrak) => buatKontrak(nilai),
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ["kontrak-daftar"] });
      toast.success("Kontrak draft berhasil dibuat.");
      navigate({ to: "/dashboard/admin/contracts/$id", params: { id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <p className="text-base text-muted-foreground">
        Kontrak dibuat sebagai draft. Aktifkan kontrak setelah serah terima unit dan penerimaan
        deposit.
      </p>
      <FormKontrak
        labelSimpan="Simpan Draft Kontrak"
        mengirim={simpan.isPending}
        bolehMenimpa={role === "owner"}
        onSimpan={(nilai) => simpan.mutate(nilai)}
        onBatal={() => navigate({ to: "/dashboard/admin/contracts" })}
      />
    </div>
  );
}