import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

function GalatGlobal({ reset }: { reset: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Terjadi kesalahan saat memuat halaman.
        </h1>
        <p className="mt-2 text-base text-muted-foreground">
          Silakan coba lagi. Jika masih gagal, kembali ke halaman utama.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-base font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Coba Lagi
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-base font-medium text-foreground transition-colors hover:bg-accent"
          >
            Ke Halaman Utama
          </a>
        </div>
      </div>
    </div>
  );
}

function TidakDitemukanGlobal() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Halaman tidak ditemukan.</h2>
        <p className="mt-2 text-base text-muted-foreground">
          Alamat yang Anda buka tidak tersedia atau sudah dipindahkan.
        </p>
        <div className="mt-6">
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-base font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Ke Halaman Utama
          </a>
        </div>
      </div>
    </div>
  );
}

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    defaultErrorComponent: GalatGlobal,
    defaultNotFoundComponent: TidakDitemukanGlobal,
  });

  return router;
};
