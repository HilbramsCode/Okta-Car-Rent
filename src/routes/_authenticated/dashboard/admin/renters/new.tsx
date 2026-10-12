import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { RoleGate } from "@/components/dashboard/RoleGate";
import { FormPenyewa } from "@/components/renters/FormPenyewa";
import { buatPenyewa, type MasukanPenyewa } from "@/lib/renters";

export const Route = createFileRoute("/_authenticated/dashboard/admin/renters/new")({
  head: () => ({
    meta: [
      { title: "Tambah Penyewa | Okta Car Rent" },
      {
        name: "description",
        content: "Daftarkan penyewa baru Okta Car Rent lengkap dengan data identitas dan kontak darurat.",
      },
      { property: "og:title", content: "Tambah Penyewa | Okta Car Rent" },
      {
        property: "og:description",
        content: "Formulir pendaftaran penyewa baru untuk rental mobil.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RoleGate allow={["owner", "admin"]}>
      <DashboardShell peran="Manajemen Penyewa" judul="Tambah Penyewa">
        <HalamanTambahPenyewa />
      </DashboardShell>
    </RoleGate>
  ),
});

function HalamanTambahPenyewa() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const simpan = useMutation({
    mutationFn: (nilai: MasukanPenyewa) => buatPenyewa(nilai),
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ["penyewa-daftar"] });
      toast.success("Penyewa berhasil ditambahkan.");
      navigate({ to: "/dashboard/admin/renters/$id", params: { id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <p className="text-base text-muted-foreground">
        Isi data penyewa. Foto KTP, SIM, dan foto profil dapat diunggah setelah data tersimpan.
      </p>
      <FormPenyewa
        labelSimpan="Simpan Penyewa"
        mengirim={simpan.isPending}
        onSimpan={(nilai) => simpan.mutate(nilai)}
        onBatal={() => navigate({ to: "/dashboard/admin/renters" })}
      />
    </div>
  );
}