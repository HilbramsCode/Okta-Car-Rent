import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { RoleGate } from "@/components/dashboard/RoleGate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { GalatMuat } from "@/components/bi/StatusMuat";
import { ambilPengaturanPerawatan, perbaruiPengaturanPerawatan } from "@/lib/maintenance";

export const Route = createFileRoute("/_authenticated/dashboard/admin/maintenance/settings")({
  head: () => ({
    meta: [
      { title: "Pengaturan Interval Servis | Okta Car Rent" },
      {
        name: "description",
        content:
          "Atur interval kilometer ganti oli dan ganti ban beserta ambang peringatan servis untuk seluruh armada.",
      },
      { property: "og:title", content: "Pengaturan Interval Servis | Okta Car Rent" },
      {
        property: "og:description",
        content: "Pengaturan interval perawatan berkala armada Okta Car Rent.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RoleGate allow={["owner"]}>
      <DashboardShell peran="Perawatan Armada" judul="Pengaturan Interval Servis">
        <FormPengaturan />
      </DashboardShell>
    </RoleGate>
  ),
});

function FormPengaturan() {
  const qc = useQueryClient();
  const data = useQuery({ queryKey: ["perawatan-pengaturan"], queryFn: ambilPengaturanPerawatan });

  const [oli, setOli] = useState("5000");
  const [ban, setBan] = useState("40000");
  const [ingatOli, setIngatOli] = useState("500");
  const [ingatBan, setIngatBan] = useState("1000");

  useEffect(() => {
    if (!data.data) return;
    setOli(String(data.data.oil_interval_km));
    setBan(String(data.data.tire_interval_km));
    setIngatOli(String(data.data.oil_warning_km));
    setIngatBan(String(data.data.tire_warning_km));
  }, [data.data]);

  const simpan = useMutation({
    mutationFn: () =>
      perbaruiPengaturanPerawatan({
        oil_interval_km: Number(oli),
        tire_interval_km: Number(ban),
        oil_warning_km: Number(ingatOli),
        tire_warning_km: Number(ingatBan),
      }),
    onSuccess: () => {
      toast.success("Pengaturan interval diperbarui.");
      void qc.invalidateQueries({ queryKey: ["perawatan-pengaturan"] });
      void qc.invalidateQueries({ queryKey: ["perawatan-jatuh-tempo"] });
      void qc.invalidateQueries({ queryKey: ["perawatan-ringkasan"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Gagal menyimpan pengaturan."),
  });

  if (data.isPending) return <Skeleton className="h-64 w-full rounded-lg" />;
  if (data.isError) return <GalatMuat pesan="Pengaturan perawatan belum dapat dimuat." />;

  return (
    <div className="space-y-6">
      <Button asChild size="lg" variant="outline" className="text-base">
        <Link to="/dashboard/admin/maintenance">Kembali ke Perawatan</Link>
      </Button>

      <form
        className="max-w-2xl space-y-4 rounded-lg border border-border bg-card p-5"
        onSubmit={(e) => {
          e.preventDefault();
          simpan.mutate();
        }}
      >
        <p className="text-base text-muted-foreground">
          Interval ini berlaku untuk semua kendaraan. Peringatan muncul saat sisa kilometer sudah
          di bawah ambang yang ditentukan.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="interval-oli" className="text-base">
              Interval Ganti Oli (KM)
            </Label>
            <Input
              id="interval-oli"
              type="number"
              min={1}
              className="h-11 text-base"
              value={oli}
              onChange={(e) => setOli(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="interval-ban" className="text-base">
              Interval Ganti Ban (KM)
            </Label>
            <Input
              id="interval-ban"
              type="number"
              min={1}
              className="h-11 text-base"
              value={ban}
              onChange={(e) => setBan(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ambang-oli" className="text-base">
              Ambang Peringatan Oli (KM)
            </Label>
            <Input
              id="ambang-oli"
              type="number"
              min={0}
              className="h-11 text-base"
              value={ingatOli}
              onChange={(e) => setIngatOli(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ambang-ban" className="text-base">
              Ambang Peringatan Ban (KM)
            </Label>
            <Input
              id="ambang-ban"
              type="number"
              min={0}
              className="h-11 text-base"
              value={ingatBan}
              onChange={(e) => setIngatBan(e.target.value)}
              required
            />
          </div>
        </div>
        <Button type="submit" size="lg" className="text-base" disabled={simpan.isPending}>
          {simpan.isPending ? "Menyimpan…" : "Simpan Pengaturan"}
        </Button>
      </form>
    </div>
  );
}