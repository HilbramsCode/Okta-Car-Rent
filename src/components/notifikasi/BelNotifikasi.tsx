import { useState } from "react";
import { Bell } from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ambilNotifikasiTerbaru,
  hitungNotifikasiBelumDibaca,
  tandaiNotifikasiDibaca,
  type Notifikasi,
} from "@/lib/notifications";
import { ItemNotifikasi } from "./ItemNotifikasi";
import { KUNCI_NOTIFIKASI } from "./kunci-notifikasi";

export function BelNotifikasi() {
  const [buka, setBuka] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const belumDibaca = useQuery({
    queryKey: KUNCI_NOTIFIKASI.belumDibaca,
    queryFn: hitungNotifikasiBelumDibaca,
  });

  const terbaru = useQuery({
    queryKey: KUNCI_NOTIFIKASI.ringkas,
    queryFn: () => ambilNotifikasiTerbaru(5),
    enabled: buka,
  });

  const tandai = useMutation({
    mutationFn: (id: string) => tandaiNotifikasiDibaca(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: KUNCI_NOTIFIKASI.semua });
    },
  });

  async function klikNotifikasi(n: Notifikasi) {
    setBuka(false);
    if (!n.is_read) {
      try {
        await tandai.mutateAsync(n.id);
      } catch {
        // Gagal menandai tidak boleh menghalangi navigasi.
      }
    }
    if (n.link_url) navigate({ to: n.link_url } as never);
  }

  const jumlah = belumDibaca.data ?? 0;

  return (
    <Popover open={buka} onOpenChange={setBuka}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="lg"
          className="relative text-base"
          aria-label={jumlah > 0 ? `Notifikasi, ${jumlah} belum dibaca` : "Notifikasi"}
        >
          <Bell className="size-5" />
          {jumlah > 0 ? (
            <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-primary px-1 text-center text-sm font-bold leading-5 text-primary-foreground">
              {jumlah > 99 ? "99+" : jumlah}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        className="w-[min(22rem,calc(100vw-2rem))] p-0"
      >
        <div className="border-b border-border px-4 py-3">
          <p className="font-heading text-lg font-bold text-foreground">Notifikasi</p>
        </div>

        <div className="max-h-80 overflow-y-auto">
          {terbaru.isPending ? (
            <div className="space-y-2 p-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : terbaru.isError ? (
            <div className="p-4">
              <p role="alert" className="text-base text-foreground">
                Notifikasi belum dapat dimuat.
              </p>
              <Button
                variant="outline"
                size="lg"
                className="mt-2 text-base"
                onClick={() => void terbaru.refetch()}
              >
                Coba lagi
              </Button>
            </div>
          ) : (terbaru.data ?? []).length === 0 ? (
            <div className="p-4">
              <p className="text-base font-semibold text-foreground">Belum ada notifikasi</p>
              <p className="mt-1 text-base text-muted-foreground">
                Notifikasi penting untuk akun Anda akan muncul di sini.
              </p>
            </div>
          ) : (
            (terbaru.data ?? []).map((n) => (
              <ItemNotifikasi key={n.id} notifikasi={n} onKlik={klikNotifikasi} />
            ))
          )}
        </div>

        <div className="border-t border-border p-2">
          <Button
            asChild
            variant="ghost"
            size="lg"
            className="w-full text-base"
            onClick={() => setBuka(false)}
          >
            <Link to="/dashboard/notifications">Lihat semua</Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
