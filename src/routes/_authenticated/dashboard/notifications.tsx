import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { RoleGate } from "@/components/dashboard/RoleGate";
import { ItemNotifikasi } from "@/components/notifikasi/ItemNotifikasi";
import { KUNCI_NOTIFIKASI } from "@/components/notifikasi/kunci-notifikasi";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ambilNotifikasiSaya,
  hitungNotifikasiBelumDibaca,
  tandaiNotifikasiDibaca,
  tandaiSemuaNotifikasiDibaca,
  type Notifikasi,
} from "@/lib/notifications";

export const Route = createFileRoute("/_authenticated/dashboard/notifications")({
  head: () => ({
    meta: [
      { title: "Notifikasi | Okta Car Rent" },
      {
        name: "description",
        content:
          "Pusat notifikasi Okta Car Rent: pemberitahuan pembayaran, deposit, dan aktivitas penting untuk akun Anda.",
      },
      { property: "og:title", content: "Notifikasi | Okta Car Rent" },
      {
        property: "og:description",
        content: "Lihat semua pemberitahuan penting untuk akun Okta Car Rent Anda.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RoleGate allow={["owner", "admin", "renter"]}>
      <DashboardShell peran="Akun Anda" judul="Notifikasi">
        <HalamanNotifikasi />
      </DashboardShell>
    </RoleGate>
  ),
});

const BATAS = 20;

function HalamanNotifikasi() {
  const [filter, setFilter] = useState<"semua" | "belum-dibaca">("semua");
  const [batas, setBatas] = useState(BATAS);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const belumDibaca = useQuery({
    queryKey: KUNCI_NOTIFIKASI.belumDibaca,
    queryFn: hitungNotifikasiBelumDibaca,
  });

  const daftar = useQuery({
    queryKey: [...KUNCI_NOTIFIKASI.daftar(filter), batas],
    queryFn: () =>
      ambilNotifikasiSaya({
        hanyaBelumDibaca: filter === "belum-dibaca",
        batas: batas + 1,
      }),
  });

  const tandai = useMutation({
    mutationFn: (id: string) => tandaiNotifikasiDibaca(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KUNCI_NOTIFIKASI.semua }),
    onError: () => toast.error("Gagal menandai notifikasi. Silakan coba lagi."),
  });

  const tandaiSemua = useMutation({
    mutationFn: tandaiSemuaNotifikasiDibaca,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KUNCI_NOTIFIKASI.semua }),
    onError: () => toast.error("Gagal menandai semua notifikasi. Silakan coba lagi."),
  });

  async function klikNotifikasi(n: Notifikasi) {
    if (!n.is_read) {
      try {
        await tandai.mutateAsync(n.id);
      } catch {
        // Diamkan: kegagalan menandai tidak boleh menghentikan navigasi.
      }
    }
    if (n.link_url) navigate({ to: n.link_url } as never);
  }

  const semuaData = daftar.data ?? [];
  const adaLagi = semuaData.length > batas;
  const data = adaLagi ? semuaData.slice(0, batas) : semuaData;
  const jumlahBelumDibaca = belumDibaca.data ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {(
            [
              { value: "semua", label: "Semua" },
              { value: "belum-dibaca", label: "Belum Dibaca" },
            ] as const
          ).map((o) => (
            <Button
              key={o.value}
              variant={filter === o.value ? "default" : "outline"}
              size="lg"
              className="text-base"
              onClick={() => {
                setFilter(o.value);
                setBatas(BATAS);
              }}
            >
              {o.label}
            </Button>
          ))}
        </div>

        <Button
          variant="outline"
          size="lg"
          className="text-base"
          disabled={jumlahBelumDibaca === 0 || tandaiSemua.isPending}
          onClick={() => tandaiSemua.mutate()}
        >
          Tandai semua sudah dibaca
        </Button>
      </div>

      {belumDibaca.isError && (
        <p role="alert" className="text-base text-muted-foreground">
          Jumlah notifikasi belum dibaca belum dapat dimuat.
        </p>
      )}

      {daftar.isPending ? (
        <div className="space-y-2">
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-16 w-full rounded-lg" />
        </div>
      ) : daftar.isError ? (
        <div className="rounded-lg border border-border bg-card p-6">
          <p role="alert" className="text-base text-foreground">
            Notifikasi belum dapat dimuat.
          </p>
          <Button
            variant="outline"
            size="lg"
            className="mt-3 text-base"
            onClick={() => void daftar.refetch()}
          >
            Coba lagi
          </Button>
        </div>
      ) : data.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-6">
          {filter === "belum-dibaca" ? (
            <p className="text-base text-muted-foreground">
              Tidak ada notifikasi yang belum dibaca.
            </p>
          ) : (
            <>
              <p className="text-base font-semibold text-foreground">Belum ada notifikasi</p>
              <p className="mt-1 text-base text-muted-foreground">
                Notifikasi penting untuk akun Anda akan muncul di sini.
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          {data.map((n) => (
            <ItemNotifikasi key={n.id} notifikasi={n} onKlik={klikNotifikasi} />
          ))}
        </div>
      )}

      {adaLagi ? (
        <Button
          variant="outline"
          size="lg"
          className="text-base"
          onClick={() => setBatas((b) => b + BATAS)}
        >
          Muat lebih banyak
        </Button>
      ) : null}
    </div>
  );
}
