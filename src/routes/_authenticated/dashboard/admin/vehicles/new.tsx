import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { RoleGate } from "@/components/dashboard/RoleGate";
import { FormKendaraan } from "@/components/vehicles/FormKendaraan";
import { buatKendaraan, type MasukanKendaraan } from "@/lib/vehicles";

export const Route = createFileRoute("/_authenticated/dashboard/admin/vehicles/new")({
  head: () => ({
    meta: [
      { title: "Tambah Kendaraan | Okta Car Rent" },
      {
        name: "description",
        content: "Tambahkan kendaraan baru ke armada Okta Car Rent lengkap dengan tarif dan dokumen.",
      },
      { property: "og:title", content: "Tambah Kendaraan | Okta Car Rent" },
      {
        property: "og:description",
        content: "Formulir pendaftaran kendaraan baru untuk armada rental.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RoleGate allow={["owner", "admin"]}>
      <DashboardShell peran="Manajemen Armada" judul="Tambah Kendaraan">
        <HalamanTambah />
      </DashboardShell>
    </RoleGate>
  ),
});

function HalamanTambah() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const simpan = useMutation({
    mutationFn: (nilai: MasukanKendaraan) => buatKendaraan(nilai),
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ["armada-daftar"] });
      queryClient.invalidateQueries({ queryKey: ["armada-ringkasan"] });
      toast.success("Kendaraan berhasil ditambahkan.");
      navigate({ to: "/dashboard/admin/vehicles/$id", params: { id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <p className="text-base text-muted-foreground">
        Isi data kendaraan. Foto dan dokumen dapat diunggah setelah kendaraan tersimpan.
      </p>
      <FormKendaraan
        labelSimpan="Simpan Kendaraan"
        mengirim={simpan.isPending}
        onSimpan={(nilai) => simpan.mutate(nilai)}
        onBatal={() => navigate({ to: "/dashboard/admin/vehicles" })}
      />
    </div>
  );
}